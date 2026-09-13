// One hash, used by the build script and by the Worker. A slug must always
// land in the same shard on both sides, so this file must never change
// without rebuilding every shard.
export function bucket(key, count) {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h % count
}

// How many records go in one shard file. Bigger shards mean fewer files but
// more work per request. Measured: 100 title records parse in 2.5 ms, well
// inside the 10 ms the free plan allows.
export const TITLES_PER_SHARD = 200
export const CHARACTERS_PER_SHARD = 400

export const titleKey = (kind, slug) => `${kind}/${slug}`
