# Tree Carbon Xray

Tree Carbon Xray lets you inventory trees, apply US Forest Service growth coefficients, and explore lifetime carbon storage through clear visuals.

## What it does
- Build an inventory with quantities, DBH, and species (autocomplete or browse picker with photos).
- Run carbon and growth projections over a selectable planning horizon.
- See model confidence per entry (`exact`, `genus`, `proxy`) to understand estimate quality.
- View carbon totals, growth deltas, species composition, and equivalencies (vehicles, gasoline).
- Explore analytics with cumulative sequestration and species breakdown charts.

## Quick start
1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open the printed localhost URL to use the app.

## Validation
- Run parser + forecast smoke checks: `npm run test:smoke`

## Key concepts
- **Species data** comes from the USFS i-Tree biomass density (TS9) and growth coefficients (TS6). If a species lacks coefficients, the model falls back to `Acer rubrum` as a proxy.
- **Data resilience:** TS1/TS6/TS9 load network-first from GitHub raw URLs with in-app local CSV fallback if remote fetch fails.
- **Confidence labels:** each inventory row records how coefficients were sourced: exact species match, genus-level match, or proxy fallback.
- **Inputs:** quantity, species, and current DBH (cm). Height is estimated from DBH.
- **Outputs:** projected DBH/height, carbon storage (kg CO₂), and annual sequestration per species group and project totals.

## Project structure
- `App.tsx` – routing between builder, impact report, and analytics.
- `components/Calculator.tsx` – inventory form, species picker, and forecast table.
- `components/Dashboard.tsx` – impact summary and equivalencies.
- `components/Analytics.tsx` – cumulative/time-series and species-level charts.
- `services/carbonCalculator.ts` – growth and carbon math engine.
- `services/speciesCatalog.ts` – builds the species catalog with image URLs.
- `Data/` – original USFS CSVs (referenced via raw GitHub URLs at runtime).

## Notes
- The species picker shows common + scientific names and uses Wikimedia/Unsplash image links per species, falling back to a generic tree photo if a specific image is unavailable.
- Network access is needed on first load to download the USFS CSVs (TS6/TS9) and species images.
- To enrich missing species photos in `public/species-images.yaml`, run `npm run images:enrich` (see `docs/SPECIES_IMAGES.md`).
- Current image catalog coverage: 194/194 species mapped (0 TODO placeholders).
- Main tabs are code-split with `React.lazy` to reduce initial JS cost; chart-heavy views load on demand.
