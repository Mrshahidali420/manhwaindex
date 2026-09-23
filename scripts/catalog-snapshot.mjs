#!/usr/bin/env node
/**
 * A second home for the catalog, in Cloudflare R2.
 *
 *   node scripts/catalog-snapshot.mjs push   copy data/ up to R2
 *   node scripts/catalog-snapshot.mjs pull   bring back anything R2 has that
 *                                           this runner is missing
 *
 * Why. The catalog lives only in the GitHub Actions cache, and a cache entry
 * is deleted after 7 days without use or evicted early when the repo passes
 * 10 GB. Twice a lost cache sent a build back to the small seed copy. R2
 * keeps a copy that does not expire, plus one per day for a week.
 *
 * Layout in the bucket (R2_BUCKET, default manhwaindex-catalog):
 *   latest/<file>.gz              the newest copy of each file
 *   latest/meta.json              written LAST: counts, run id, file list
 *   daily/YYYY-MM-DD/<file>.gz    one copy per day, kept 8 days
 *
 * Files: comics.json, anime.json, characters.json (the catalog), and the
 * state that is expensive to lose: characters-walk.json, novels-walk.json,
 * slug-registry.json and themes.json.
 *
 * Rules:
 *   - pull never makes anything smaller. A catalog file is replaced only when
 *     R2 holds MORE records than the local copy, or the local copy is missing
 *     or unreadable. State files are fetched only when missing or unreadable.
 *   - push refuses to overwrite latest/ with a catalog clearly smaller than
 *     the one already there (a seed fallback), unless ALLOW_SHRINK is set.
 *   - push skips the slug registry while data/slug-registry.recovered exists:
 *     a stand-in must never replace the real one.
 *   - R2 is not required. Any failure (no token, R2 not enabled, no bucket,
 *     a network error) is a ::warning:: and a line in the job summary, and
 *     the script exits 0, so the deploy carries on from the Actions cache.
 *     R2_REQUIRED=1 turns failures into a real error.
 *
 * Needs CLOUDFLARE_API_TOKEN (with R2 edit rights) and CLOUDFLARE_ACCOUNT_ID
 * in the environment. It drives the wrangler that npm installed, the same one
 * the deploy uses.
 */
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  rmSync,
  renameSync,
  appendFileSync,
  createReadStream,
  createWriteStream,
} from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGzip, createGunzip } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileAtomic } from '../src/lib/write-atomic.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'data')
const BUCKET = process.env.R2_BUCKET || 'manhwaindex-catalog'
const REQUIRED = process.env.R2_REQUIRED === '1'
const IN_CI = !!process.env.GITHUB_ACTIONS

const CATALOG = ['comics.json', 'anime.json', 'characters.json']
// themes.json is the song list (scripts/sync-animethemes.mjs). Its own guard
// lives in that script; here it is plain state, fetched when missing.
const STATE = ['characters-walk.json', 'novels-walk.json', 'slug-registry.json', 'themes.json']
const RECOVERED_MARKER = join(DATA, 'slug-registry.recovered')

// SNAPSHOT_ONLY=a.json,b.json limits a push or pull to those files, so a job
// that owns one small file (the weekly song sync) never moves the 140 MB
// catalog. Files left out keep their copy and their count in R2.
const ONLY = new Set((process.env.SNAPSHOT_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean))
const wanted = (name) => ONLY.size === 0 || ONLY.has(name)

// Daily copies older than this are deleted on push.
const KEEP_DAYS = 8
// Same 2% the build's shrink guard allows.
const SHRINK_LIMIT = 0.98
// A 140 MB upload on a slow runner link. Generous, but never forever.
const WRANGLER_TIMEOUT_MS = 15 * 60 * 1000
const DAY_MS = 86400000

class SnapshotError extends Error {}

const keyOfCatalog = (name) => name.replace(/\.json$/, '')
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10)

function summary(line) {
  if (!process.env.GITHUB_STEP_SUMMARY) return
  try {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + '\n')
  } catch {
    // The summary is a courtesy; failing to write it must not fail the step.
  }
}

function warn(message) {
  console.log(`${IN_CI ? '::warning::' : 'WARNING: '}R2 snapshot: ${message}`)
  summary(`- :warning: R2 snapshot: ${message}`)
}

// ---- wrangler ---------------------------------------------------------------

const WRANGLER_BIN = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js')

/**
 * Run the installed wrangler with node directly. `npx wrangler` resolves to
 * this same file; calling it through node avoids npx.cmd on Windows, which
 * Node refuses to spawn without a shell.
 */
function wrangler(args) {
  if (!existsSync(WRANGLER_BIN)) throw new SnapshotError('wrangler is not installed (run npm install)')
  try {
    return execFileSync(process.execPath, [WRANGLER_BIN, ...args], {
      cwd: ROOT,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: WRANGLER_TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
    }).toString()
  } catch (error) {
    const out = `${error.stderr || ''}\n${error.stdout || ''}`
    // Wrangler prints a banner and hints around the one line that matters;
    // show the error lines when there are any, else the tail.
    const lines = out
      .replace(/\x1b\[[0-9;]*m/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const errors = lines.filter((l) => /✘|\berror\b|\[code: \d+\]|does not exist/i.test(l))
    const detail = (errors.length ? errors.slice(-3) : lines.slice(-4)).join(' | ')
    const failure = new SnapshotError(`wrangler r2 object ${args[2]} ${args[3]} failed: ${detail || error.message}`)
    failure.missing = /specified key does not exist|NoSuchKey|\b10007\b/i.test(out)
    throw failure
  }
}

const put = (key, file, contentType) =>
  wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, '--remote', '--file', file, '--content-type', contentType])
const get = (key, file) => wrangler(['r2', 'object', 'get', `${BUCKET}/${key}`, '--remote', '--file', file])
const del = (key) => wrangler(['r2', 'object', 'delete', `${BUCKET}/${key}`, '--remote'])

/** latest/meta.json from R2, or null when there is no snapshot yet. */
function readRemoteMeta(tmp) {
  const file = join(tmp, 'meta.json')
  try {
    get('latest/meta.json', file)
  } catch (error) {
    if (error.missing) return null
    throw error
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new SnapshotError(`latest/meta.json in R2 is not valid JSON: ${error.message}`)
  }
}

// ---- local files --------------------------------------------------------------

/** { state: 'missing' | 'corrupt' | 'ok', count } for a local JSON file. */
function inspect(file) {
  if (!existsSync(file)) return { state: 'missing', count: 0 }
  let value
  try {
    value = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return { state: 'corrupt', count: 0 }
  }
  if (Array.isArray(value)) return { state: value.length ? 'ok' : 'missing', count: value.length }
  if (value && typeof value === 'object') {
    // The registry reports its entries; a walk file just has to parse.
    const count = value.entries && typeof value.entries === 'object' ? Object.keys(value.entries).length : 1
    return { state: 'ok', count }
  }
  return { state: 'corrupt', count: 0 }
}

// ---- push ---------------------------------------------------------------------

async function push(tmp) {
  const prev = readRemoteMeta(tmp)
  const today = dayOf(Date.now())
  const counts = {}
  const upload = []

  for (const name of CATALOG) {
    if (!wanted(name)) continue
    const local = inspect(join(DATA, name))
    if (local.state !== 'ok') {
      warn(`data/${name} is ${local.state}; not uploaded (R2 keeps its last copy)`)
      continue
    }
    const before = prev?.counts?.[keyOfCatalog(name)] || 0
    if (local.count < before * SHRINK_LIMIT && !process.env.ALLOW_SHRINK) {
      warn(
        `data/${name} has ${local.count} records, R2 has ${before}. Refusing to replace the ` +
          'snapshot with a smaller catalog; nothing was uploaded. Set ALLOW_SHRINK=1 if intended.'
      )
      return
    }
    counts[keyOfCatalog(name)] = local.count
    upload.push(name)
  }

  let registryEntries = prev?.registryEntries ?? null
  for (const name of STATE) {
    if (!wanted(name)) continue
    if (name === 'slug-registry.json' && existsSync(RECOVERED_MARKER)) {
      warn('data/slug-registry.recovered exists: the stand-in registry is not uploaded')
      continue
    }
    // The build writes new addresses into the registry before it deploys. If
    // the deploy did not happen, those addresses are not live, and a copy of
    // them in R2 would describe a site nobody can visit.
    if (name === 'slug-registry.json' && process.env.REGISTRY_NOT_LIVE === '1') {
      console.log('deploy did not succeed: the slug registry is not uploaded')
      continue
    }
    const local = inspect(join(DATA, name))
    if (local.state !== 'ok') continue
    if (name === 'slug-registry.json') registryEntries = local.count
    upload.push(name)
  }

  if (!upload.length) {
    warn('nothing to upload')
    return
  }

  for (const name of upload) {
    const gz = join(tmp, `${name}.gz`)
    await pipeline(createReadStream(join(DATA, name)), createGzip({ level: 9 }), createWriteStream(gz))
    put(`daily/${today}/${name}.gz`, gz, 'application/gzip')
    put(`latest/${name}.gz`, gz, 'application/gzip')
    console.log(`  uploaded ${name}`)
  }

  // A file this run did not have (a push-only deploy has no walk files) is
  // still in latest/ from an earlier run, so it stays listed.
  const files = [...new Set([...upload, ...(prev?.files || [])])]
  for (const name of CATALOG) {
    const key = keyOfCatalog(name)
    if (counts[key] == null && prev?.counts?.[key] != null) counts[key] = prev.counts[key]
  }
  const meta = {
    savedAt: new Date().toISOString(),
    runId: process.env.GITHUB_RUN_ID || 'local',
    workflow: process.env.GITHUB_WORKFLOW || 'local',
    counts,
    registryEntries,
    files,
  }
  const metaFile = join(tmp, 'meta-out.json')
  writeFileAtomic(metaFile, JSON.stringify(meta, null, 2))
  put(`daily/${today}/meta.json`, metaFile, 'application/json')
  // The commit marker. A pull trusts latest/ only through this file, so it
  // goes up after every file it describes.
  put('latest/meta.json', metaFile, 'application/json')

  // Old daily copies. Best effort: a failed delete costs a little storage.
  const old = dayOf(Date.now() - KEEP_DAYS * DAY_MS)
  for (const name of [...CATALOG, ...STATE].map((n) => `${n}.gz`).concat('meta.json')) {
    try {
      del(`daily/${old}/${name}`)
    } catch {
      // Usually "not found": that day had no copy of this file.
    }
  }

  const line = `pushed ${upload.join(', ')} (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')})`
  console.log(`R2 snapshot: ${line}`)
  summary(`- R2 snapshot: ${line}`)
}

// ---- pull ---------------------------------------------------------------------

/** Download latest/<name>.gz and unpack it next to its final place in data/. */
async function fetchTo(name, tmp) {
  const gz = join(tmp, `${name}.gz`)
  get(`latest/${name}.gz`, gz)
  // Unpacked in data/ itself, so the final rename stays on one disk and is
  // atomic: the real file is either the old one or the whole new one.
  const out = join(DATA, `${name}.${process.pid}.r2`)
  try {
    await pipeline(createReadStream(gz), createGunzip(), createWriteStream(out))
  } catch (error) {
    rmSync(out, { force: true })
    throw new SnapshotError(`latest/${name}.gz could not be unpacked: ${error.message}`)
  }
  return out
}

async function pull(tmp) {
  const meta = readRemoteMeta(tmp)
  if (!meta) {
    warn(`no snapshot in bucket ${BUCKET} yet (latest/meta.json not found)`)
    return
  }
  const listed = new Set(meta.files || [])
  const done = []

  for (const name of CATALOG) {
    if (!listed.has(name) || !wanted(name)) continue
    const target = join(DATA, name)
    const local = inspect(target)
    const remote = meta.counts?.[keyOfCatalog(name)] || 0
    if (local.state === 'ok' && remote <= local.count) {
      console.log(`  ${name}: local ${local.count} >= R2 ${remote}, kept`)
      continue
    }
    const out = await fetchTo(name, tmp)
    const got = inspect(out)
    // Judge the file that arrived, not the meta: never replace with less.
    if (got.state !== 'ok' || (local.state === 'ok' && got.count <= local.count)) {
      rmSync(out, { force: true })
      warn(`latest/${name}.gz is ${got.state} with ${got.count} records; local copy kept`)
      continue
    }
    renameSync(out, target)
    done.push(`${name} ${local.state === 'ok' ? local.count : local.state} -> ${got.count}`)
  }

  for (const name of STATE) {
    if (!listed.has(name) || !wanted(name)) continue
    const target = join(DATA, name)
    if (inspect(target).state === 'ok') continue
    const out = await fetchTo(name, tmp)
    if (inspect(out).state !== 'ok') {
      rmSync(out, { force: true })
      warn(`latest/${name}.gz does not unpack to valid JSON; skipped`)
      continue
    }
    renameSync(out, target)
    done.push(`${name} restored`)
  }

  const line = done.length
    ? `pulled from the snapshot of ${meta.savedAt} (run ${meta.runId}): ${done.join('; ')}`
    : `nothing to pull; local files are as large as the snapshot of ${meta.savedAt}`
  console.log(`R2 snapshot: ${line}`)
  summary(`- R2 snapshot: ${line}`)
}

// ---- main -----------------------------------------------------------------------

async function main() {
  const mode = process.argv[2]
  if (mode !== 'push' && mode !== 'pull') {
    console.error('usage: node scripts/catalog-snapshot.mjs push|pull')
    process.exit(2)
  }
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new SnapshotError(`CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID is not set; ${mode} skipped`)
  }
  const tmp = mkdtempSync(join(tmpdir(), 'catalog-snapshot-'))
  try {
    if (mode === 'push') await push(tmp)
    else await pull(tmp)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

main().catch((error) => {
  warn(error instanceof SnapshotError ? error.message : `unexpected error: ${error.stack || error.message}`)
  process.exit(REQUIRED ? 1 : 0)
})
