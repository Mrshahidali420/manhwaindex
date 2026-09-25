/**
 * Read one file from the sister sites' R2 bucket (sister-data), for the pull
 * scripts that fold sister data into this build: pull-airing.mjs (episode air
 * dates) and pull-where-links.mjs (which WhereAnime pages exist).
 *
 * READ ONLY. sister-data belongs to the sister sites; nothing here writes it.
 *
 * Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in CI; locally a
 * `wrangler login` is enough.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, mkdtempSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const BUCKET = process.env.SISTER_R2_BUCKET || 'sister-data'
const WRANGLER_BIN = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const TIMEOUT_MS = 3 * 60 * 1000
const IN_CI = !!process.env.GITHUB_ACTIONS

/** A warning in the log (and the CI step summary) under one label: "episode dates: ...". */
export function warnAs(label) {
  return (message) => {
    console.log(`${IN_CI ? '::warning::' : 'WARNING: '}${label}: ${message}`)
    if (process.env.GITHUB_STEP_SUMMARY) {
      try {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- :warning: ${label}: ${message}\n`)
      } catch {
        // A summary line is a courtesy; losing it changes nothing.
      }
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

/** The text of BUCKET/key. Throws, saying why, when it cannot be read. */
export function pullSister(key) {
  if (!existsSync(WRANGLER_BIN)) throw new Error('wrangler is not installed (run npm install)')
  const dir = mkdtempSync(join(tmpdir(), 'sister-'))
  const file = join(dir, 'object.json')
  try {
    execFileSync(process.execPath, [WRANGLER_BIN, 'r2', 'object', 'get', `${BUCKET}/${key}`, '--remote', '--file', file], {
      cwd: ROOT,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: TIMEOUT_MS,
    })
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw new Error(`could not read ${BUCKET}/${key}: ${reasonOf(error)}`)
  }
  try {
    return readFileSync(file, 'utf8')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
