# Architecture

## Data Flow

```
GitHub Raw URLs (constants.ts)
  ↓ fetch() on mount — network-first with local CSV fallback (TS9 + TS6 + TS1) + species-images.yaml
App.tsx (data loading state: loading → loaded/error)
  ↓ parsed via services/dataService.ts
densities: BiomassDensity[]       — from TS9 (species biomass density kg/m³)
growthCoeffs: GrowthCoefficient[] — from TS6 (region × species × equation)
regions: RegionOption[]           — from TS1 (16 USFS city regions)
  ↓ buildSpeciesCatalog() in services/speciesCatalog.ts
speciesList: SpeciesInfo[]        — deduped, sorted, curated-image first
  ↓ hydrateSpeciesCatalogImages() in services/speciesCatalog.ts
speciesList: SpeciesInfo[]        — background enrichment from Wikipedia + cached in localStorage
  ↓ user input (Calculator.tsx)
projectTrees: ProjectTree[]       — inventory with full forecastData per tree group
  ↓ render
Calculator → Dashboard → Analytics (tab views)
```

### Fallback Data Strategy
- Primary source: GitHub Raw URLs in `constants.ts`.
- Fallback source: in-bundle CSV assets from `Data/` resolved via `new URL(..., import.meta.url)` in `App.tsx`.
- Loader: `loadCsvWithFallback(primaryUrl, fallbackUrl, label)`.

## Component Hierarchy

```
App.tsx
├── Sidebar.tsx (navigation, facts rotator)
└── main
    ├── Calculator.tsx (builder tab)
    │   └── SpeciesSelectorModal.tsx
├── Dashboard.tsx (impact report tab + model confidence summary)
    └── Analytics.tsx (charts tab)
```

`Calculator`, `Dashboard`, and `Analytics` are loaded with `React.lazy` + `Suspense` to keep initial bundle smaller.

## Carbon Calculation Methodology

All math is in `services/carbonCalculator.ts`. Entry: `forecastTreeGrowth(speciesName, initialDbh, horizonYears, densities, growthCoeffs, regionCode?)`.

### Step 1: Species & Coefficient Lookup
Priority order (exact → genus → proxy):
1. Exact scientific name in selected region's TS6 rows
2. Exact scientific name across all regions
3. Genus prefix (first word) in region
4. Genus prefix globally
5. Acer rubrum proxy

`forecastTreeGrowth()` returns `modelConfidence` and `modelSourceScientific` so UI can display estimate quality.

### Step 2: Density Lookup (TS9)
Exact scientific name → genus prefix → default 550 kg/m³.

### Step 3: Age Estimation
Find TS6 equation where `dependentVar='age'`, `independentVar='dbh'`.
Fallback: `age = DBH × 1.2`.

### Step 4: Year-by-Year Projection (year 0..horizonYears)
For each year `y`:
- DBH: TS6 equation (`dependentVar='dbh'`, `independentVar='age'`) or fallback linear
- Height: TS6 equation (`dependentVar='tree ht'|'height'`, `independentVar='dbh'`) or `2 + 0.5 × DBH^0.7`
- Carbon point: `V = π(d/2)² × h × 0.45` → `biomass = V × ρ × 1.2` → `C = biomass × 0.5` → `CO₂e = C × 3.6667`
- Annual sequestration: `max(0, CO₂e[y] - CO₂e[y-1])`

### Equation Forms (TS6 equationName field)
| Name | Formula |
|---|---|
| lin | a + b×x |
| quad | a + b×x + c×x² |
| cub | a + b×x + c×x² + d×x³ |
| loglogw1 | exp(a + b×ln(ln(x+1)) + mse/2) |
| loglogw2 | exp(a + b×ln(ln(x+1)) + √x×mse/2) |
| expow1 | exp(a + b×x + mse/2) |
| loglogw3 | exp(a + b×ln(ln(x+1)) + x×mse/2) |

## Region System

TS6 data is organized by USFS region code (e.g., "InlEmp"=Inland Empire CA, "PacNW"=Pacific Northwest, "NE"=Northeast). Each row has a `region` field.

User selects region from TS1 dropdown in Calculator. `selectedRegion` (string code or empty) is passed to `forecastTreeGrowth`. Empty = use all-region pool.

When region changes, a `useEffect` in Calculator.tsx re-forecasts all existing trees.

## State Management

```
App.tsx state:
  loading: boolean
  error: string | null
  densities: BiomassDensity[]
  growthCoeffs: GrowthCoefficient[]
  regions: RegionOption[]
  speciesList: SpeciesInfo[]
  projectTrees: ProjectTree[]      ← mutated by Calculator
  horizon: number                  ← shared by Calculator and Dashboard
  selectedRegion: string           ← shared by Calculator
  activeTab: TabView

Calculator.tsx local state:
  speciesSearch: string
  count: number
  dbh: string
  showDropdown: boolean
  showSpeciesModal: boolean

Refs (Calculator.tsx, to break dep loops):
  projectTreesRef    ← mirrors projectTrees without dep array inclusion
  selectedRegionRef  ← mirrors selectedRegion
  prevHorizonRef     ← tracks previous horizon to detect actual changes
  prevRegionRef      ← tracks previous region
```

## LocalStorage Schema

Key: `treecarbonxray_v1`

```ts
interface StoredState {
  projectTrees: ProjectTree[];
  horizon: number;
  selectedRegion: string;
}
```

Behavior:
- On mount: read and restore (one-time `useEffect(fn, [])`)
- On change: debounced 500ms save (catches projectTrees, horizon, selectedRegion)
- On quota error: silently skip
- On parse error: remove corrupt key and start fresh

Additional key: `treecarbonxray_species_images_v1`

- Stores runtime-resolved species image URLs (scientific/common lookup keys).
- Populated by `hydrateSpeciesCatalogImages()` after first successful resolution.
- Keeps species picker images stable and reduces repeated network lookups.

## Data Types Reference

```ts
ProjectTree {
  id: string                     // random 9-char alphanumeric
  count: number                  // quantity of identical trees
  speciesCommon: string
  speciesScientific: string
  modelConfidence: 'exact' | 'genus' | 'proxy'
  modelSourceScientific: string  // species used for active coefficient set
  initialDbh: number             // cm at time of entry
  initialHeight: number          // m, estimated from DBH
  currentCarbon: number          // kg CO₂e — GROUP TOTAL (× count)
  forecastData: AnnualGrowth[]   // year 0..horizonYears
}

AnnualGrowth {
  yearOffset: number             // 0 = current
  age: number                    // estimated tree age
  dbh: number                    // cm
  height: number                 // m
  carbonStorage: number          // kg CO₂e — PER TREE (not × count)
  annualSequestration: number    // kg CO₂e added this year — PER TREE
}
```

⚠️ Note: `currentCarbon` is total for the group; `carbonStorage` is per tree. Dashboard accounts for this: `projectedTotal = forecastData[n].carbonStorage × count`.
