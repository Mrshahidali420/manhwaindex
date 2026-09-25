#!/usr/bin/env node
/**
 * Copy the episode air dates the sister ingest keeps in R2 to data/airing.json,
 * for scripts/make-shards.mjs to fold into the anime records.
 *
 *   node scripts/pull-airing.mjs
 *
 * The file is written each night by where-build's scripts/ingest-airing.mjs to
 * the bucket sister-data, key latest/airing.json. This script only ever READS
 * it: sister-data belongs to the sister sites, and nothing here writes there.
 *
 * Never fails a build. When the file cannot be read (no token, no rights on
 * the bucket, no file yet, bad JSON), it says why, removes any old local copy
 * so a stale schedule is never shown, and exits 0. The build then runs as
 * before and the episode lists simply do not appear.
 *
 * Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in CI; locally a
 * `wrangler login` is enough.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, mkdtempSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileAtomic } from '../src/lib/write-atomic.mjs'
import { indexAiring } from '../src/lib/episodes.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'data', 'airing.json')
const BUCKET = process.env.SISTER_R2_BUCKET || 'sister-data'
const KEY = 'latest/airing.json'
const WRANGLER_BIN = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const TIMEOUT_MS = 3 * 60 * 1000
const IN_CI = !!process.env.GITHUB_ACTIONS

function warn(message) {
  console.log(`${IN_CI ? '::warning::' : 'WARNING: '}episode dates: ${message}`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- :warning: episode dates: ${message}\n`)
    } catch {
      // A summary line is a courtesy; losing it changes nothing.
    }
  }
}

/** The one line of wrangler's output that says what went wrong. */
function reasonOf(error) {
  const lines = `${error.stderr || ''}\n${error.stdout || ''}`
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const errors = lines.filter((l) => /✘|\berror\b|\[code: \d+\]|does not exist|unauthori|forbidden/i.test(l))
  const text = (errors.length ? errors.slice(-2) : lines.slice(-2)).join(' | ') || error.message
  if (/\b10000\b|unauthori|forbidden|\b403\b|authentication/i.test(text)) {
    return `${text} -- the Cloudflare token needs "Workers R2 Storage: Read" on bucket ${BUCKET} (account-wide R2 read also works)`
  }
  return text
}

function pull() {
  if (!existsSync(WRANGLER_BIN)) throw new Error('wrangler is not installed (run npm install)')
  const dir = mkdtempSync(join(tmpdir(), 'airing-'))
  const file = join(dir, 'airing.json')
  try {
    execFileSync(process.execPath, [WRANGLER_BIN, 'r2', 'object', 'get', `${BUCKET}/${KEY}`, '--remote', '--file', file], {
      cwd: ROOT,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: TIMEOUT_MS,
    })
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw new Error(`could not read ${BUCKET}/${KEY}: ${reasonOf(error)}`)
  }
  try {
    return readFileSync(file, 'utf8')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function main() {
  let text
  try {
    text = pull()
  } catch (error) {
    rmSync(OUT, { force: true })
    warn(`${error.message}. Building without episode lists.`)
    return
  }
  let airing
  try {
    airing = indexAiring(JSON.parse(text))
  } catch (error) {
    airing = null
  }
  if (!airing) {
    rmSync(OUT, { force: true })
    warn(`${BUCKET}/${KEY} is not an airing file. Building without episode lists.`)
    return
  }
  writeFileAtomic(OUT, text)
  console.log(
    `episode dates: ${airing.history.size} shows with a full history, ${airing.window.size} in the +/-60 day schedule, ` +
      `${(Buffer.byteLength(text) / 1024).toFixed(0)} KB -> data/airing.json`
  )
}

main()
