# The seed catalog

A small gzipped copy of `data/comics.json`, `data/anime.json` and
`data/characters.json`.

## Why it exists

The live catalog is not in git. At full size `comics.json` is about 141 MB, and
GitHub refuses any file over 100 MB. The live files live in the GitHub Actions
cache instead, written by `.github/workflows/backfill.yml` and topped up by the
daily run in `.github/workflows/deploy.yml`.

A GitHub cache is deleted after 7 days without use. The daily run keeps it warm,
but if it ever goes, the build must not die. `scripts/unseed.sh` unpacks this
seed whenever a live file is missing.

## Rules

- This is a floor, not the live data. Nothing in CI writes back to it.
- Refresh it by hand, rarely, and only when the shape of a record changes:

      for f in comics anime characters; do
        gzip -9 -c "data/$f.json" > "data/seed/$f.json.gz"
      done

- Do not refresh it from a full backfill. 107,000 titles would gzip to roughly
  70 MB and put the repo growth problem straight back.
