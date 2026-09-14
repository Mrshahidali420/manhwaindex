#!/usr/bin/env bash
# Make sure the three catalog files exist before a build.
#
# They are not in git: at full size comics.json is 141 MB and GitHub refuses
# any file over 100 MB. They live in the GitHub Actions cache instead. A cache
# is deleted after 7 days without use, so this script unpacks the small seed
# copy in data/seed whenever a file is missing.
#
# The seed is a floor, never the live data. Nothing writes back to it.
set -euo pipefail

for name in comics anime characters; do
  live="data/$name.json"
  seed="data/seed/$name.json.gz"

  if [ -s "$live" ]; then
    echo "$live: from the cache"
    continue
  fi

  if [ ! -s "$seed" ]; then
    echo "$live is missing and $seed does not exist either." >&2
    exit 1
  fi

  echo "$live: missing, unpacking the seed"
  gzip -dc "$seed" > "$live"
done

ls -la data/*.json
