# Species Image Curation

## Goal
Maintain high-quality species images in `public/species-images.yaml` so the "Browse list" cards show representative photos instead of generic stock fallbacks.

## Commands
- Dry run (no file changes): `npm run images:enrich:dry`
- Apply updates to YAML: `npm run images:enrich`

## How It Works
1. The script scans `public/species-images.yaml` for missing/TODO `image` values.
2. For each missing entry, it tries candidate page titles (scientific name, genus, common name).
3. It queries Wikipedia REST summary API and pulls `thumbnail` or `originalimage`.
4. When `--write` is used, the script replaces only matching `image:` lines.

Script path: `scripts/enrich-species-images.mjs`

## Notes
- Existing curated image URLs are preserved.
- Runtime still has a fallback path (`hydrateSpeciesCatalogImages`) for unresolved species.
- Re-run enrichment periodically as the species list evolves.

## Current Coverage (2026-03-01)
- Total species entries: 194
- Resolved image URLs: 194
- Remaining TODO entries: 0

The resolver now uses two passes per candidate:
1. Direct Wikipedia summary title lookup
2. Wikipedia search API fallback, then summary lookup on the top hit
