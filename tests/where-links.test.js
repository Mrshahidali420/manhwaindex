// Links to WhereAnime: only to pages its published list says are live
// (src/lib/where-links.mjs), folded into anime and character records.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  indexWhereLinks,
  attachWhereLinks,
  nameKey,
  whereAnimeUrl,
  whereVoiceActorUrl,
} from '../src/lib/where-links.mjs'

const file = (extra = {}) => ({
  v: 1,
  builtAt: 1790351706081,
  anime: { 154587: 'frieren-beyond-journeys-end' },
  voiceActors: { 'Atsumi Tanezaki': 'atsumi-tanezaki', 'Mallorie Rodak': 'mallorie-rodak' },
  ...extra,
})

test('a where-links file is indexed by AniList id and by voice actor name', () => {
  const links = indexWhereLinks(file())
  assert.equal(links.anime.get(154587), 'frieren-beyond-journeys-end')
  assert.equal(links.voiceActors.get('atsumi tanezaki'), 'atsumi-tanezaki')
  assert.equal(links.voiceActors.size, 2)
})

test('anything that is not a where-links file gives null, so no links at all', () => {
  assert.equal(indexWhereLinks(null), null)
  assert.equal(indexWhereLinks('text'), null)
  assert.equal(indexWhereLinks({ anime: {} }), null) // no version
  assert.equal(indexWhereLinks({ v: 2, anime: {} }), null) // a version we do not know
  assert.equal(indexWhereLinks({ v: 1 }), null)
  assert.equal(indexWhereLinks({ v: 1, anime: [] , voiceActors: [] }), null)
})

test('bad rows are dropped one by one', () => {
  const links = indexWhereLinks(
    file({
      anime: { 1: 'cowboy-bebop', abc: 'x', 0: 'zero', 5: 'Bad Slug', 6: '../escape', 7: 42, 8: '' },
      voiceActors: { '': 'nobody', 'Kana Hanazawa': 'kana-hanazawa', 'Bad One': 'has space' },
    })
  )
  assert.deepEqual([...links.anime], [[1, 'cowboy-bebop']])
  assert.deepEqual([...links.voiceActors], [['kana hanazawa', 'kana-hanazawa']])
})

test('two names that tidy to the same key but point at different pages are both dropped', () => {
  const links = indexWhereLinks(
    file({ voiceActors: { 'Yui Ishikawa': 'yui-ishikawa', 'yui  ishikawa': 'yui-ishikawa-2', 'Aoi Yuuki': 'aoi-yuuki' } })
  )
  assert.equal(links.voiceActors.has('yui ishikawa'), false)
  assert.equal(links.voiceActors.get('aoi yuuki'), 'aoi-yuuki')
})

test('names match across spacing and case', () => {
  assert.equal(nameKey('  Atsumi   Tanezaki '), 'atsumi tanezaki')
  assert.equal(nameKey(null), '')
})

test('anime records gain whereSlug only where WhereAnime has the page', () => {
  const anime = [
    { kind: 'anime', id: 154587, slug: 'frieren' },
    { kind: 'anime', id: 999, slug: 'not-there' },
  ]
  const out = attachWhereLinks(anime, [], indexWhereLinks(file()))
  assert.equal(out.anime[0].whereSlug, 'frieren-beyond-journeys-end')
  assert.equal(out.anime[1], anime[1]) // untouched record, same object
  assert.equal(anime[0].whereSlug, undefined) // the input is not changed
  assert.equal(out.titles, 1)
})

test('character anime rows gain the voice actor slugs, Japanese and English', () => {
  const characters = [
    {
      slug: 'frieren-176754',
      appearsIn: [
        { kind: 'manga', slug: 'frieren-manga', voice: 'Atsumi Tanezaki' }, // a comic row is never touched
        { kind: 'anime', slug: 'frieren', voice: 'Atsumi Tanezaki', voiceEn: 'Mallorie Rodak' },
      ],
    },
    { slug: 'nobody-1', appearsIn: [{ kind: 'anime', slug: 'x', voice: 'Unknown Person' }] },
  ]
  const out = attachWhereLinks([], characters, indexWhereLinks(file()))
  const rows = out.characters[0].appearsIn
  assert.equal(rows[0].voiceWhere, undefined)
  assert.equal(rows[1].voiceWhere, 'atsumi-tanezaki')
  assert.equal(rows[1].voiceEnWhere, 'mallorie-rodak')
  assert.equal(out.characters[1], characters[1])
  assert.equal(characters[0].appearsIn[1].voiceWhere, undefined)
  assert.equal(out.voices, 1)
})

test('no links file leaves every record as it was', () => {
  const anime = [{ kind: 'anime', id: 154587 }]
  const characters = [{ slug: 'a', appearsIn: [] }]
  const out = attachWhereLinks(anime, characters, null)
  assert.equal(out.anime, anime)
  assert.equal(out.characters, characters)
  assert.equal(out.titles + out.voices, 0)
})

test('the page addresses follow WhereAnime URL shapes', () => {
  assert.equal(whereAnimeUrl('naruto'), 'https://whereanime.com/anime/naruto')
  assert.equal(whereVoiceActorUrl('kana-hanazawa'), 'https://whereanime.com/voice-actor/kana-hanazawa')
})
