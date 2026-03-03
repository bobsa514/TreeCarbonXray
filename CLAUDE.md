# Tree Carbon Xray — CLAUDE.md

## Project Overview
A React/TypeScript SPA for landscape architects and urban planners to inventory trees, model carbon storage using USFS i-Tree data, and generate impact reports. Open source, portfolio-grade.

**Target users:** Landscape architects, urban planners, environmental researchers needing carbon accounting for tree projects.

## Running the App
```bash
npm install
npm run dev
# Open http://localhost:3000/TreeCarbonXray/
```

Note: Vite serves on port 3000. The base path is `/TreeCarbonXray/` (set in vite.config.ts for GitHub Pages deploy).

## ⚠️ Critical Architecture Notes

### Tailwind CSS — CDN ONLY
Tailwind is loaded via CDN `<script>` tag in `index.html`. There is NO `tailwind.config.js` file. The theme config (including custom `forest-*`, `sage-*`, `bark-*`, `cream-*` colors) is the inline `tailwind.config` object in `index.html`. To add new Tailwind colors or extend the theme, **edit `index.html`**.

### Import Map (CDN Dependencies)
React, Recharts, and Lucide-React are loaded from `aistudiocdn.com` via importmap in `index.html`. This is a Google AI Studio pattern for running without a build step. Vite dev mode uses local `node_modules` instead. Never add new external libraries without updating both the importmap AND `package.json`.

### Data Loading
USFS CSV data (TS1/TS6/TS9) is fetched from GitHub raw URLs at runtime, defined in `constants.ts`:
- TS1 = Regional info (16 USFS regions)
- TS6 = Growth coefficients (region+species indexed)
- TS9 = Biomass density factors
If the `main` branch URL changes or GitHub is unavailable, data loading fails. Data is fetched in parallel on mount in `App.tsx`.

### State Architecture
- All global state lives in `App.tsx`: loading, error, data arrays, projectTrees, horizon, selectedRegion
- `projectTrees: ProjectTree[]` — each stores full `forecastData: AnnualGrowth[]` (year 0..horizonYears)
- When horizon OR region changes, ALL project trees must be re-forecast (handled by useEffect in Calculator.tsx using refs to avoid dep loops)

### Carbon Calculation
Entry point: `forecastTreeGrowth()` in `services/carbonCalculator.ts`.
Simplified volumetric biomass: `V = π(DBH/2)² × H × 0.45` (form factor) → `biomass = V × density × 1.2` (root/branch) → `carbon = biomass × 0.5` → `CO₂e = carbon × 3.6667` (44/12 ratio).

### Known Data Asymmetry (intentional)
`ProjectTree.currentCarbon` = group total (per-tree × count).
`ProjectTree.forecastData[i].carbonStorage` = per-tree value.
Dashboard handles this: uses `t.currentCarbon` directly for current, and `forecastData.carbonStorage × t.count` for projected.

### DBH Unit System
`DbhUnit = 'cm' | 'in'` stored in localStorage. All internal values (ProjectTree.initialDbh, forecastData DBH) are ALWAYS in centimeters. Conversion happens only at UI layer via `toCm()` / `fromCm()` helpers in Calculator.tsx. CSV export accepts dbhUnit and converts labels+values accordingly.

### Project Metadata
`ProjectMetadata { name, location, date }` stored in `StoredState`. Passed from App.tsx → Dashboard.tsx → editable inline header. Also passed to csvExport for the file header line. Clear Project resets it to empty values.

### typicalDbh Pipeline
`computeTypicalDbh(scientificName, growthCoeffs, referenceAge=TYPICAL_URBAN_TREE_AGE)` in speciesCatalog.ts uses exported `solveEquation()` from carbonCalculator.ts. Finds age→dbh coefficients, evaluates at age 15, sanity-checks result (1–200 cm). Stored in SpeciesInfo.typicalDbh. Used in Calculator for auto-fill + range hint. Region-agnostic (takes global first match — documented limitation).

### LocalStorage Persistence
Key: `treecarbonxray_v1`. Schema: `{ projectTrees, horizon, selectedRegion, projectMetadata, dbhUnit }`. Saved debounced 500ms on any change. Restored on mount. Clear Project button removes it.

## File Map
| File | Purpose |
|---|---|
| `App.tsx` | Routing, data loading, top-level state |
| `types.ts` | All TypeScript interfaces |
| `constants.ts` | GitHub raw data URLs, EXAMPLE_PROJECT_SPECIES for onboarding |
| `index.html` | **Tailwind CDN config**, importmap, font imports, print CSS |
| `components/Calculator.tsx` | Inventory form, species search, horizon slider, region selector, forecast table |
| `components/Dashboard.tsx` | Impact summary cards, equivalencies, pie chart, print export |
| `components/Analytics.tsx` | Cumulative chart, annual rate chart, species bar/scatter charts |
| `components/SpeciesSelectorModal.tsx` | Species image picker modal |
| `components/Sidebar.tsx` | Navigation, rotating tree facts |
| `services/carbonCalculator.ts` | Growth math engine — `forecastTreeGrowth()`, exports `solveEquation()` |
| `services/dataService.ts` | CSV parsers for TS1/TS2/TS3/TS6/TS9 |
| `services/speciesCatalog.ts` | Builds species catalog from TS9+TS6, loads YAML image map, `computeTypicalDbh()` |
| `services/csvExport.ts` | Client-side CSV export for tree inventory |
| `public/species-images.yaml` | Curated Wikimedia image URLs per species |
| `Data/` | USFS source CSVs (NOT bundled; referenced via raw GitHub URLs) |
| `docs/` | Architecture and implementation plans for AI context |
| `components/DataView.tsx` | Dead code — built but never wired to nav. Keep for potential future data explorer tab. |

## Species Matching Priority
1. Exact scientific name match within selected USFS region
2. Exact scientific name match across all regions
3. Genus-level prefix match within region
4. Genus-level prefix match across all regions
5. Fallback to Acer rubrum proxy (logged to console)

## Design System
Nature-forward palette defined in `index.html` tailwind.config:
- `forest-*`: Primary greens (sidebar, buttons, accents)
- `sage-*`: Muted greens (card borders, backgrounds)
- `bark-*`: Warm earth browns (secondary accents)
- `cream-*`: Warm off-whites (page/card backgrounds)
- Font: Inter via Google Fonts
