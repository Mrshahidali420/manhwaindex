import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PAGES_CHANGED, titleLastmod } from '../src/lib/lastmod.mjs'

test('a record AniList edited after the template date carries its own day', () => {
  const later = Date.UTC(2026, 9, 3) / 1000 // 3 Oct 2026
  assert.equal(titleLastmod({ updatedAt: later }), '2026-10-03')
})

test('an older edit, or none at all, falls back to the template date', () => {
  assert.equal(titleLastmod({ updatedAt: Date.UTC(2024, 0, 1) / 1000 }), PAGES_CHANGED)
  assert.equal(titleLastmod({ updatedAt: null }), PAGES_CHANGED)
  assert.equal(titleLastmod({}), PAGES_CHANGED)
})

test('the lastmod never moves just because the site was rebuilt', () => {
  const item = { updatedAt: Date.UTC(2025, 5, 1) / 1000 }
  assert.equal(titleLastmod(item), titleLastmod(item))
  assert.match(titleLastmod(item), /^\d{4}-\d{2}-\d{2}$/)
})
