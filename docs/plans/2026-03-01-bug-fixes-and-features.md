# Bug Fixes + Feature Iteration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 10 known bugs and add 4 features (region selection, localStorage persistence, annual sequestration chart, print/PDF export) plus a green-forward design refresh and AI-ready documentation.

**Architecture:** Single-page React app with three views (Calculator/Builder, Dashboard, Analytics). State lives at App.tsx and is passed down. Carbon math is pure functions in services/carbonCalculator.ts. Data loaded from GitHub raw URLs on mount. Tailwind CSS (CDN) with custom `forest-*` palette. React/Recharts/Lucide loaded via importmap from AI Studio CDN — no bundler processes external imports.

**Tech Stack:** React 19, TypeScript, Tailwind CSS (CDN, config in index.html), Recharts, Lucide-React, Vite (dev only). No test runner. Verify all changes in browser at `npm run dev` → localhost:3000.

**CRITICAL GOTCHA:** Tailwind is loaded via CDN script tag in `index.html`. The `tailwind.config` object is also inline in `index.html`. To add new colors or theme extensions, edit `index.html` — NOT a tailwind.config.js file (none exists). Similarly, React and library imports are resolved via the importmap in `index.html`, not node_modules, when loaded in browser. Vite dev mode uses local node_modules instead.

---

## Phase 1: Documentation Setup

### Task 1: Create CLAUDE.md and Architecture Doc

**Files:**
- Create: `CLAUDE.md`
- Create: `docs/ARCHITECTURE.md`

**Step 1: Write CLAUDE.md**

```markdown
# Tree Carbon Xray — CLAUDE.md

## Project Overview
A React/TypeScript SPA for landscape architects and urban planners to inventory trees, model carbon storage using USFS i-Tree data, and generate impact reports. Open source, portfolio-grade.

## Running the App
```bash
npm install
npm run dev
# Open http://localhost:3000/TreeCarbonXray/
```

Note: Vite serves on port 3000. The base path is `/TreeCarbonXray/` (set in vite.config.ts for GitHub Pages deploy).

## Critical Architecture Notes

### Tailwind CSS
Loaded via CDN script in `index.html` — NO `tailwind.config.js` file. The theme config (including custom `forest-*` colors) is the inline `tailwind.config` object in `index.html`. Add new colors there.

### Import Map (CDN Dependencies)
React, Recharts, and Lucide-React are loaded from `aistudiocdn.com` via importmap in `index.html`. This is a Google AI Studio pattern for running without a build step. Vite dev mode uses local `node_modules` instead. Never add new external libraries without updating both the importmap AND the package.json.

### Data Loading
USFS CSV data (TS6 growth coefficients, TS9 biomass density, TS1 regions) is fetched from GitHub raw URLs defined in `constants.ts`. If the `main` branch URL changes, data loading will break. Data is fetched on mount in `App.tsx`.

### State Architecture
- Global state lives in `App.tsx` (loading, error, data, projectTrees, horizon, selectedRegion)
- `projectTrees` is an array of `ProjectTree` — each stores a full `forecastData` array (one `AnnualGrowth` per year 0..horizonYears)
- When horizon or region changes, ALL project trees must be re-forecast

### Carbon Calculation
See `services/carbonCalculator.ts`. Entry point: `forecastTreeGrowth()`. Uses simplified volumetric biomass: V = π(DBH/2)² × H × 0.45, then biomass × 1.2 for roots, × 0.5 for carbon fraction, × 3.6667 (44/12) for CO₂e. Growth equations from TS6 (linear, quadratic, cubic, log-log variants).

### Known Inconsistency (by design)
`ProjectTree.currentCarbon` stores the **group total** (per-tree carbon × count). `ProjectTree.forecastData[i].carbonStorage` stores **per-tree** carbon. This asymmetry is intentional but documented. Dashboard multiplies `forecastData.carbonStorage × count` for projected totals.

## File Map
- `App.tsx` — routing, data loading, top-level state
- `types.ts` — all TypeScript interfaces
- `constants.ts` — GitHub raw data URLs
- `index.html` — Tailwind CDN config, importmap, font imports
- `components/Calculator.tsx` — inventory form, species search, forecast table
- `components/Dashboard.tsx` — impact summary cards, equivalencies, pie chart
- `components/Analytics.tsx` — time-series, bar, scatter charts
- `components/SpeciesSelectorModal.tsx` — species image picker
- `components/Sidebar.tsx` — navigation, rotating facts
- `services/carbonCalculator.ts` — growth math engine
- `services/dataService.ts` — CSV parsers
- `services/speciesCatalog.ts` — species catalog builder + YAML image map loader
- `public/species-images.yaml` — curated Wikimedia image URLs per species
- `Data/` — USFS source CSVs (not bundled; referenced via raw GitHub URLs)
- `docs/` — architecture and implementation plans for AI context
```

**Step 2: Write docs/ARCHITECTURE.md**

```markdown
# Architecture

## Data Flow

```
GitHub Raw URLs (constants.ts)
  ↓ fetch() on mount
App.tsx (data loading state)
  ↓ parse via services/dataService.ts
densities: BiomassDensity[]    — from TS9
growthCoeffs: GrowthCoefficient[]  — from TS6 (region-indexed)
regions: RegionOption[]        — from TS1
  ↓ buildSpeciesCatalog()
speciesList: SpeciesInfo[]     — for autocomplete + modal
  ↓ user input
projectTrees: ProjectTree[]    — inventory with full forecastData
  ↓ render
Calculator → Dashboard → Analytics
```

## Carbon Calculation Methodology

1. **Age from DBH**: Use TS6 equation where `dependentVar='age'`, `independentVar='dbh'`. Fallback: `age = dbh * 1.2`.
2. **DBH projection**: Use TS6 equation where `dependentVar='dbh'`, `independentVar='age'`. Fallback: diminishing linear growth.
3. **Height from DBH**: Use TS6 equation where `dependentVar='tree ht'|'height'`, `independentVar='dbh'`. Fallback: `2 + 0.5 * DBH^0.7`.
4. **Carbon point**: `V = π(d/2)² × h × 0.45` (form factor) → `biomass = V × density × 1.2` (root/branch factor) → `carbon = biomass × 0.5` → `CO₂e = carbon × 3.6667`.
5. **Annual sequestration**: `max(0, carbonStorage[y] - carbonStorage[y-1])`.

## Region System

TS6 growth coefficients are keyed by USFS region code (e.g., "InlEmp", "PacNW", "NE"). Users select a region from TS1 regional info. When a region is selected, `forecastTreeGrowth` filters TS6 rows to that region before species matching. Fallback: if no regional coefficients for the species, use national pool then Acer rubrum proxy.

## Species Matching Priority (after fix)

1. Exact scientific name match within selected region
2. Exact scientific name match across all regions
3. Genus-level prefix match (first word of scientific name) within region
4. Genus-level prefix match across all regions
5. Fallback to Acer rubrum proxy

## LocalStorage Schema

Key: `treecarbonxray_v1`
Value: `{ projectTrees: ProjectTree[], horizon: number, selectedRegion: string }`

On mount: restore if present. On any state change: save (debounced 500ms). Version key allows future migration.
```

**Step 3: Commit**
```bash
git add CLAUDE.md docs/ARCHITECTURE.md docs/plans/2026-03-01-bug-fixes-and-features.md
git commit -m "docs: add CLAUDE.md, architecture doc, and implementation plan"
```

---

## Phase 2: Bug Fixes

### Task 2: Fix Species Matching in carbonCalculator.ts

**File:** `services/carbonCalculator.ts`

**The bug:** Line 66-69 uses bidirectional substring matching which picks up coefficients for wrong species (e.g. "Oak" matches White oak, Red oak, Pin oak all at once).

**Step 1: Replace the species matching block**

Find this block (lines 64-81):
```ts
const speciesCoeffs = growthCoeffs.filter(g =>
    g.scientificName.toLowerCase().includes(speciesName.toLowerCase()) ||
    speciesName.toLowerCase().includes(g.scientificName.toLowerCase())
);
// ... density ...
const proxyName = speciesCoeffs.length > 0 ? speciesName : "Acer rubrum";
const activeCoeffs = speciesCoeffs.length > 0 ? speciesCoeffs : growthCoeffs.filter(g => g.scientificName === "Acer rubrum");
```

Replace with:
```ts
// Species matching: exact first, then genus-level, then proxy
const scientificLower = speciesName.toLowerCase().trim();
const genus = scientificLower.split(' ')[0];

const filterByRegion = (coeffs: GrowthCoefficient[], regionCode?: string) =>
    regionCode ? coeffs.filter(g => g.region === regionCode) : coeffs;

const matchExact = (pool: GrowthCoefficient[]) =>
    pool.filter(g => g.scientificName.toLowerCase().trim() === scientificLower);

const matchGenus = (pool: GrowthCoefficient[]) =>
    genus.length > 3
        ? pool.filter(g => g.scientificName.toLowerCase().startsWith(genus + ' '))
        : [];

// Priority: exact in region → exact global → genus in region → genus global → Acer rubrum
const regionalPool = filterByRegion(growthCoeffs, regionCode);
let speciesCoeffs =
    matchExact(regionalPool).length > 0 ? matchExact(regionalPool) :
    matchExact(growthCoeffs).length > 0 ? matchExact(growthCoeffs) :
    matchGenus(regionalPool).length > 0 ? matchGenus(regionalPool) :
    matchGenus(growthCoeffs).length > 0 ? matchGenus(growthCoeffs) : [];

const activeCoeffs = speciesCoeffs.length > 0
    ? speciesCoeffs
    : growthCoeffs.filter(g => g.scientificName === "Acer rubrum");
```

**Step 2: Update function signature to accept optional regionCode**

Current signature:
```ts
export const forecastTreeGrowth = (
    speciesName: string,
    initialDbh: number,
    horizonYears: number,
    densities: BiomassDensity[],
    growthCoeffs: GrowthCoefficient[]
): { annualData: AnnualGrowth[], currentCarbon: number } => {
```

Add `regionCode?: string` as the last parameter:
```ts
export const forecastTreeGrowth = (
    speciesName: string,
    initialDbh: number,
    horizonYears: number,
    densities: BiomassDensity[],
    growthCoeffs: GrowthCoefficient[],
    regionCode?: string
): { annualData: AnnualGrowth[], currentCarbon: number } => {
```

**Step 3: Update density matching to also use region-filtered pool**

After the speciesCoeffs block, find the density lookup:
```ts
const densObj = densities.find(d =>
    d.commonName.toLowerCase().includes(speciesName.toLowerCase()) ||
    d.scientificName.toLowerCase().includes(speciesName.toLowerCase())
);
```

Replace with:
```ts
const densObj = densities.find(d =>
    d.scientificName.toLowerCase().trim() === scientificLower
) || densities.find(d =>
    d.scientificName.toLowerCase().startsWith(genus + ' ')
);
```

**Step 4: Verify in browser**
- Run `npm run dev`, add a Red maple at DBH 20cm
- Check console — no errors, forecast data appears
- Try an obscure species — should fall back gracefully to Acer rubrum

**Step 5: Commit**
```bash
git add services/carbonCalculator.ts
git commit -m "fix: improve species matching with exact→genus→proxy priority order"
```

---

### Task 3: Fix findSpeciesFromInput in Calculator.tsx

**File:** `components/Calculator.tsx`, lines 68-75

**The bug:** `needle.includes(s.commonName)` checks if user input CONTAINS the full species name (only works for exact matches). Partial typing like "maple" won't match.

**Step 1: Replace findSpeciesFromInput**

```ts
const findSpeciesFromInput = (): SpeciesInfo | undefined => {
    const needle = speciesSearch.toLowerCase().trim();
    if (!needle) return undefined;
    // Exact match first, then partial
    return (
        speciesList.find(s => s.scientificName.toLowerCase() === needle || s.commonName.toLowerCase() === needle) ||
        speciesList.find(s => s.scientificName.toLowerCase().includes(needle) || s.commonName.toLowerCase().includes(needle))
    );
};
```

**Step 2: Verify**
- Type "maple" in the species field, then click "Add to Inventory" without selecting from dropdown
- Should match "Red maple" or similar, not fall back to Acer rubrum proxy

**Step 3: Commit**
```bash
git add components/Calculator.tsx
git commit -m "fix: invert species search matching — search term is needle, not haystack"
```

---

### Task 4: Fix useEffect Horizon Recalculation (Infinite Loop Risk)

**File:** `components/Calculator.tsx`, lines 49-66

**The bug:** `projectTrees` and `setProjectTrees` are in the dependency array. Every tree add/remove triggers the effect unnecessarily (runs all forecastTreeGrowth calls). The fragile length-check guard could also break.

**Step 1: Add a ref to track projectTrees without declaring it as a dep**

At the top of the Calculator component (after existing state declarations), add:
```ts
const projectTreesRef = React.useRef(projectTrees);
useEffect(() => { projectTreesRef.current = projectTrees; }, [projectTrees]);
```

**Step 2: Replace the horizon useEffect**

Remove the existing useEffect block (lines 49-66) entirely. Replace with:
```ts
// Recalculate ALL trees when horizon, densities, or growthCoeffs changes
// Uses ref to read current trees without declaring projectTrees as a dep
// (which would cause infinite recalculation on every tree add/remove)
const prevHorizonRef = React.useRef(horizon);
useEffect(() => {
    if (prevHorizonRef.current === horizon) return; // Only run on actual horizon change
    prevHorizonRef.current = horizon;
    if (projectTreesRef.current.length === 0) return;
    const updated = projectTreesRef.current.map(tree => {
        const { annualData } = forecastTreeGrowth(
            tree.speciesScientific,
            tree.initialDbh,
            horizon,
            densities,
            growthCoeffs
        );
        return { ...tree, forecastData: annualData };
    });
    setProjectTrees(updated);
}, [horizon, densities, growthCoeffs, setProjectTrees]);
```

**Step 3: Verify**
- Add 3 trees. Move the horizon slider. All 3 trees should update their "Projected Growth" values.
- Add another tree — no unnecessary recalculation should fire (check React DevTools if available).

**Step 4: Commit**
```bash
git add components/Calculator.tsx
git commit -m "fix: remove projectTrees from useEffect deps to prevent excess recalculation"
```

---

### Task 5: Validate DBH > 0 in Calculator.tsx

**File:** `components/Calculator.tsx`

**Step 1: Add validation in handleAddTree**

After `const dbhVal = parseFloat(dbh);`, add:
```ts
if (isNaN(dbhVal) || dbhVal <= 0) {
    alert('Please enter a valid DBH greater than 0 cm.');
    return;
}
```

**Step 2: Update the DBH input element**

Change the `<input>` for DBH:
```tsx
<input
    type="number"
    value={dbh}
    onChange={(e) => setDbh(e.target.value)}
    placeholder="e.g. 30"
    min="0.1"
    step="0.1"
    className="w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-500 outline-none"
    required
/>
```

**Step 3: Update the submit button disabled logic**

Change:
```tsx
disabled={!speciesSearch || !dbh}
```
To:
```tsx
disabled={!speciesSearch || !dbh || parseFloat(dbh) <= 0}
```

**Step 4: Verify** — Try entering `0` or `-5`, button should be disabled or show alert.

**Step 5: Commit**
```bash
git add components/Calculator.tsx
git commit -m "fix: validate DBH must be positive before adding tree to inventory"
```

---

### Task 6: Reset SpeciesSelectorModal Search on Open

**File:** `components/SpeciesSelectorModal.tsx`

**The bug:** `query` state persists when modal is closed and reopened.

**Step 1: Add useEffect to reset on open**

After `const [query, setQuery] = useState('');`, add:
```ts
useEffect(() => {
    if (open) setQuery('');
}, [open]);
```

**Step 2: Verify** — Search for "pine", close modal, reopen. Should show all species with empty search.

**Step 3: Commit**
```bash
git add components/SpeciesSelectorModal.tsx
git commit -m "fix: reset species modal search query when modal is reopened"
```

---

### Task 7: Fix O(n²) in Analytics Species Table

**File:** `components/Analytics.tsx`, lines 197-210

**The bug:** `totalProjectCo2` is computed via `.reduce()` inside `.map()`, rerunning for every row.

**Step 1: Move the total calculation before the map**

In the species breakdown table JSX, find:
```tsx
{speciesCarbonData.map((row, i) => {
    const totalProjectCo2 = Object.values(speciesCarbonData).reduce((a,b) => a + b.co2, 0);
```

Replace with:
```tsx
{(() => {
    const totalProjectCo2 = speciesCarbonData.reduce((a, b) => a + b.co2, 0);
    return speciesCarbonData.map((row, i) => {
```

And close the IIFE after the final `})}` of the map, adding an extra `})()}`.

Or, simpler — compute it as a `useMemo` near the top of the component:

After `const scatterData = useMemo(...)`, add:
```ts
const totalSpeciesCO2 = useMemo(() =>
    speciesCarbonData.reduce((a, b) => a + b.co2, 0),
[speciesCarbonData]);
```

Then in the table row, just use `totalSpeciesCO2` directly instead of recomputing.

**Step 2: Verify** — Add multiple species, navigate to Analytics, check no console errors.

**Step 3: Commit**
```bash
git add components/Analytics.tsx
git commit -m "fix: compute totalProjectCo2 once outside row render loop (was O(n²))"
```

---

## Phase 3: Region Selection

### Task 8: Add Region Types and Load TS1 Data in App.tsx

**Files:**
- Modify: `types.ts`
- Modify: `App.tsx`

**Step 1: Add RegionOption to types.ts**

After the `TabView` type at the bottom of `types.ts`, add:
```ts
export interface RegionOption {
    code: string;
    name: string;
    city: string;
    state: string;
}
```

**Step 2: Import RegionOption and add state in App.tsx**

In `App.tsx`, add to the imports from `./types`:
```ts
import { TabView, BiomassDensity, ProjectTree, GrowthCoefficient, SpeciesInfo, RegionOption } from './types';
```

Add state near the other Data State:
```ts
const [regions, setRegions] = useState<RegionOption[]>([]);
const [selectedRegion, setSelectedRegion] = useState<string>('');
```

**Step 3: Fetch TS1 in the parallel load inside fetchData()**

Change:
```ts
const [ts9Res, ts6Res, speciesImages] = await Promise.all([
    fetch(DATA_URLS.TS9_BIOMASS_DENSITY),
    fetch(DATA_URLS.TS6_GROWTH_COEFFICIENTS),
    loadSpeciesImageMap(),
]);
if (!ts9Res.ok) throw new Error(`Failed to load Density Data (TS9): ${ts9Res.statusText}`);
if (!ts6Res.ok) throw new Error(`Failed to load Growth Data (TS6): ${ts6Res.statusText}`);
const ts9Text = await ts9Res.text();
const ts6Text = await ts6Res.text();
```

To:
```ts
const [ts9Res, ts6Res, ts1Res, speciesImages] = await Promise.all([
    fetch(DATA_URLS.TS9_BIOMASS_DENSITY),
    fetch(DATA_URLS.TS6_GROWTH_COEFFICIENTS),
    fetch(DATA_URLS.TS1_REGIONAL_INFO),
    loadSpeciesImageMap(),
]);
if (!ts9Res.ok) throw new Error(`Failed to load Density Data (TS9): ${ts9Res.statusText}`);
if (!ts6Res.ok) throw new Error(`Failed to load Growth Data (TS6): ${ts6Res.statusText}`);
// TS1 failure is non-fatal — region selector just stays empty
const ts9Text = await ts9Res.text();
const ts6Text = await ts6Res.text();
```

**Step 4: Parse TS1 and populate regions state**

After `setSpeciesList(catalog);`, add:
```ts
if (ts1Res.ok) {
    const ts1Text = await ts1Res.text();
    const rawRegions = parseRegionalInfo(ts1Text);
    setRegions(rawRegions.map(r => ({
        code: r.regionCode,
        name: r.regionName,
        city: r.city,
        state: r.state,
    })));
}
```

Add `parseRegionalInfo` to the import from `./services/dataService`.

**Step 5: Pass regions and selectedRegion down to Calculator**

In the `renderContent()` switch for `'builder'`, add the new props:
```tsx
<Calculator
    densities={densities}
    growthCoeffs={growthCoeffs}
    projectTrees={projectTrees}
    setProjectTrees={setProjectTrees}
    switchToDashboard={() => setActiveTab('dashboard')}
    speciesList={speciesList}
    regions={regions}
    selectedRegion={selectedRegion}
    setSelectedRegion={setSelectedRegion}
/>
```

Do the same for the `default` case in the switch.

**Step 6: Verify** — Run `npm run dev`, check console for TS1 fetch success. No UI changes yet.

**Step 7: Commit**
```bash
git add types.ts App.tsx
git commit -m "feat: load USFS TS1 regional data and add region state to App"
```

---

### Task 9: Region Selector UI in Calculator.tsx

**File:** `components/Calculator.tsx`

**Step 1: Update CalculatorProps interface**

Add to the interface:
```ts
import { RegionOption } from '../types';

interface CalculatorProps {
    // ... existing ...
    regions: RegionOption[];
    selectedRegion: string;
    setSelectedRegion: (region: string) => void;
}
```

Destructure in the component:
```ts
const Calculator: React.FC<CalculatorProps> = ({
    densities,
    growthCoeffs,
    projectTrees,
    setProjectTrees,
    switchToDashboard,
    speciesList,
    regions,
    selectedRegion,
    setSelectedRegion,
}) => {
```

**Step 2: Add MapPin to lucide imports**

Change:
```ts
import { Plus, Trash2, Leaf, Search, AlertCircle, ArrowRight, Clock, Info, Wand2 } from 'lucide-react';
```
To:
```ts
import { Plus, Trash2, Leaf, Search, AlertCircle, ArrowRight, Clock, Info, Wand2, MapPin } from 'lucide-react';
```

**Step 3: Add region selector inside the "Global Parameters" card**

The current card has a single `Clock` horizon slider. Add the region selector AFTER the existing slider `</div>` but BEFORE the closing `</div>` of the outer flex:

```tsx
{regions.length > 0 && (
    <div className="border-l border-gray-200 pl-6 flex items-center gap-3 flex-shrink-0">
        <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <MapPin className="w-6 h-6" />
        </div>
        <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
                USFS Region
            </label>
            <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-forest-500 outline-none bg-white"
            >
                <option value="">All Regions (average)</option>
                {regions.map(r => (
                    <option key={r.code} value={r.code}>
                        {r.name} — {r.city}, {r.state}
                    </option>
                ))}
            </select>
        </div>
    </div>
)}
```

**Step 4: Pass regionCode to forecastTreeGrowth in handleAddTree**

Change:
```ts
const { annualData, currentCarbon } = forecastTreeGrowth(
    scientific,
    dbhVal,
    horizon,
    densities,
    growthCoeffs
);
```
To:
```ts
const { annualData, currentCarbon } = forecastTreeGrowth(
    scientific,
    dbhVal,
    horizon,
    densities,
    growthCoeffs,
    selectedRegion || undefined
);
```

**Step 5: Pass regionCode in the horizon recalculation useEffect (Task 4's code)**

In the useEffect from Task 4, update the forecastTreeGrowth call to include regionCode. You'll need `selectedRegion` accessible — either pass it as a prop or store it in a ref. Simplest: store in a ref alongside projectTreesRef.

Add `const selectedRegionRef = React.useRef(selectedRegion);` near the top of Calculator.
Add `useEffect(() => { selectedRegionRef.current = selectedRegion; }, [selectedRegion]);`

In the horizon useEffect:
```ts
const { annualData } = forecastTreeGrowth(
    tree.speciesScientific,
    tree.initialDbh,
    horizon,
    densities,
    growthCoeffs,
    selectedRegionRef.current || undefined
);
```

**Step 6: Add a region change effect** (similar to horizon effect — when region changes, recalculate all trees)

```ts
const prevRegionRef = React.useRef(selectedRegion);
useEffect(() => {
    if (prevRegionRef.current === selectedRegion) return;
    prevRegionRef.current = selectedRegion;
    if (projectTreesRef.current.length === 0) return;
    const updated = projectTreesRef.current.map(tree => {
        const { annualData } = forecastTreeGrowth(
            tree.speciesScientific,
            tree.initialDbh,
            horizon,
            densities,
            growthCoeffs,
            selectedRegion || undefined
        );
        return { ...tree, forecastData: annualData };
    });
    setProjectTrees(updated);
}, [selectedRegion, densities, growthCoeffs, horizon, setProjectTrees]);
```

**Step 7: Verify**
- Load app, see region dropdown in the parameters bar
- Add a tree, select a different region, verify tree projections update
- Select "All Regions" — should fall back to best available match

**Step 8: Commit**
```bash
git add components/Calculator.tsx types.ts
git commit -m "feat: add USFS region selector — filters growth coefficients by regional data"
```

---

## Phase 4: LocalStorage Persistence

### Task 10: Persist Project State to localStorage

**File:** `App.tsx`

**Step 1: Define storage key and schema constant**

After the imports in App.tsx, add:
```ts
const STORAGE_KEY = 'treecarbonxray_v1';

interface StoredState {
    projectTrees: ProjectTree[];
    horizon: number;
    selectedRegion: string;
}
```

**Step 2: Restore state on mount**

Before the `fetchData` useEffect, add a restore function called once:
```ts
// Restore persisted state before data loads
useEffect(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed: StoredState = JSON.parse(saved);
            if (parsed.projectTrees) setProjectTrees(parsed.projectTrees);
            if (typeof parsed.horizon === 'number') setHorizon(parsed.horizon);
            if (typeof parsed.selectedRegion === 'string') setSelectedRegion(parsed.selectedRegion);
        }
    } catch {
        // Corrupt storage — ignore and start fresh
        localStorage.removeItem(STORAGE_KEY);
    }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 3: Save state whenever it changes (debounced)**

Add a save useEffect:
```ts
useEffect(() => {
    const timeout = setTimeout(() => {
        try {
            const toSave: StoredState = { projectTrees, horizon, selectedRegion };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch {
            // Storage quota exceeded — silently skip
        }
    }, 500);
    return () => clearTimeout(timeout);
}, [projectTrees, horizon, selectedRegion]);
```

**Step 4: Add a "Clear Project" button to the header or Calculator**

In `App.tsx`'s header section (the `<header>` element), add a clear button on the right side:
```tsx
<div className="flex items-center gap-3">
    {projectTrees.length > 0 && (
        <button
            onClick={() => {
                if (confirm('Clear all trees from this project?')) {
                    setProjectTrees([]);
                }
            }}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
            Clear Project
        </button>
    )}
</div>
```

**Step 5: Verify**
- Add 2 trees, set horizon to 30 years
- Refresh the page — trees and horizon should persist
- Click "Clear Project" — storage should clear and list empties

**Step 6: Commit**
```bash
git add App.tsx
git commit -m "feat: persist project inventory and settings to localStorage across sessions"
```

---

## Phase 5: Annual Sequestration Chart

### Task 11: Add Annual Sequestration Rate Chart in Analytics.tsx

**File:** `components/Analytics.tsx`

**Step 1: Add annualSequestrationData computed value**

After the existing `timeSeriesData` useMemo, add:
```ts
// Annual sequestration rate (kg CO₂ added per year, not cumulative)
const annualSequestrationData = useMemo(() => {
    if (projectTrees.length === 0) return [];
    const years = projectTrees[0].forecastData.length;
    return Array.from({ length: years }, (_, i) => {
        let totalAnnual = 0;
        projectTrees.forEach(t => {
            totalAnnual += t.forecastData[i].annualSequestration * t.count;
        });
        return { year: i, annualCO2: parseFloat(totalAnnual.toFixed(2)) };
    });
}, [projectTrees]);
```

**Step 2: Add BarChart import**

`BarChart` is already imported. Also ensure `Bar` is in the import from recharts:
```ts
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, AreaChart, Area, ReferenceLine
} from 'recharts';
```

**Step 3: Add the chart AFTER the cumulative area chart and BEFORE the species bar chart**

```tsx
{/* Annual Sequestration Rate Chart */}
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <h3 className="text-lg font-bold text-gray-800 mb-1">Annual Carbon Sequestration Rate</h3>
    <p className="text-xs text-gray-500 mb-6">
        Carbon added each year (kg CO₂). Peak rate shows when trees are growing fastest —
        useful for identifying the highest-value growth window.
    </p>
    <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={annualSequestrationData}
                margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12 }}
                    interval={xTickInterval || 0}
                    tickMargin={10}
                    allowDecimals={false}
                    label={{ value: 'Year', position: 'insideBottomRight', offset: -5 }}
                />
                <YAxis
                    width={90}
                    tickMargin={10}
                    label={{ value: 'CO₂ Added (kg/yr)', angle: -90, position: 'insideLeft', offset: 10 }}
                />
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v: number) => [`${v.toLocaleString()} kg CO₂`, 'Annual Sequestration']}
                    labelFormatter={(l) => `Year ${l}`}
                />
                <Bar dataKey="annualCO2" fill="#39a872" name="Annual CO₂ (kg)" radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
    <p className="text-xs text-gray-400 mt-2">
        Year 0 = current state (no annual delta). Growth rate typically peaks in middle age then plateaus.
    </p>
</div>
```

**Step 4: Verify** — Add 2+ trees, go to Analytics. The new bar chart should appear between the area chart and species bar chart.

**Step 5: Commit**
```bash
git add components/Analytics.tsx
git commit -m "feat: add annual sequestration rate chart showing year-by-year CO₂ additions"
```

---

## Phase 6: Print / PDF Export

### Task 12: Add Print Export from Dashboard

**Files:**
- Modify: `components/Dashboard.tsx`
- Modify: `index.html` (add print styles)

**Step 1: Add print-specific CSS in index.html**

Inside the `<head>` tag, after the Tailwind script, add:
```html
<style>
    @media print {
        /* Hide everything except main content */
        aside, header, .no-print { display: none !important; }
        /* Make main content full width */
        body { background: white !important; }
        .flex-1.flex.flex-col { width: 100% !important; }
        main { padding: 0 !important; overflow: visible !important; }
        /* Ensure charts render */
        .recharts-responsive-container { page-break-inside: avoid; }
        /* Add print header */
        .print-header { display: block !important; }
        /* Page breaks */
        .print-break { page-break-before: always; }
        /* Remove shadows for cleaner print */
        * { box-shadow: none !important; }
    }
    .print-header { display: none; }
</style>
```

**Step 2: Add a print header div in Dashboard.tsx**

At the very top of the Dashboard `return` JSX, before `<div className="space-y-8 animate-fade-in">`:
```tsx
<div className="print-header mb-6 pb-4 border-b border-gray-300">
    <div className="flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Tree Carbon Xray — Impact Report</h1>
            <p className="text-gray-500 text-sm mt-1">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <p className="text-xs text-gray-400 text-right max-w-xs">
            Carbon projections use USFS i-Tree growth coefficients (TS6/TS9).
        </p>
    </div>
</div>
```

**Step 3: Add Export button to Dashboard header**

Import `Printer` from lucide-react:
```ts
import { Car, Cloud, Trees, CheckCircle2, TrendingUp, Leaf, Printer } from 'lucide-react';
```

In the Dashboard header flex row (where the "N Trees in Inventory" badge is), add the export button:
```tsx
<div className="mt-4 md:mt-0 flex items-center gap-3">
    <button
        onClick={() => window.print()}
        className="no-print flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
        <Printer className="w-4 h-4" />
        Export / Print
    </button>
    <div className="bg-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-medium flex items-center border border-green-100">
        <CheckCircle2 className="w-4 h-4 mr-2" />
        {stats.totalTrees} Trees in Inventory
    </div>
</div>
```

**Step 4: Add `no-print` class to the "Go to Project Builder" CTA at the bottom**

The growth analysis section has no CTA button, but if there are any interactive elements, add `no-print` class to hide them on print.

**Step 5: Verify**
- Navigate to Impact Report with trees in inventory
- Click "Export / Print" — browser print dialog opens
- Sidebar and header should be hidden, content should be full-width
- Check that charts render in print preview

**Step 6: Commit**
```bash
git add components/Dashboard.tsx index.html
git commit -m "feat: add print/PDF export button to Impact Report with print-optimized layout"
```

---

## Phase 7: Design Refresh

### Task 13: Update Tailwind Color Palette in index.html

**File:** `index.html`

**Goal:** Extend the color palette with richer sage greens, earth tones, and cream backgrounds. The current palette is solid but plain-gray. We want warmth and nature feel.

**Step 1: Replace the tailwind.config inline script**

Replace the entire `<script>` tailwind config with:
```html
<script>
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    forest: {
                        50:  '#f0faf3',
                        100: '#d8f3e1',
                        200: '#b4e6c5',
                        300: '#80d1a0',
                        400: '#4db87a',
                        500: '#2e9e5e',
                        600: '#22804b',
                        700: '#1d673d',
                        800: '#1a5232',
                        900: '#163f28',
                        950: '#0d2619',
                    },
                    sage: {
                        50:  '#f4f7f4',
                        100: '#e6ede6',
                        200: '#cedbce',
                        300: '#a8c0a8',
                        400: '#7fa07f',
                        500: '#5e825e',
                        600: '#49694a',
                        700: '#3b543c',
                        800: '#314432',
                        900: '#2a3a2b',
                    },
                    bark: {
                        50:  '#faf7f5',
                        100: '#f0ebe6',
                        200: '#dfd3ca',
                        300: '#c8b4a5',
                        400: '#ad9080',
                        500: '#98776a',
                        600: '#826057',
                        700: '#6b4f47',
                        800: '#59423e',
                        900: '#4c3936',
                    },
                    cream: {
                        50:  '#fdfbf7',
                        100: '#f9f5ec',
                        200: '#f2eadb',
                    }
                },
                fontFamily: {
                    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                },
            }
        }
    }
</script>
```

**Step 2: Add Inter font via Google Fonts in index.html `<head>`**

Before the tailwind script, add:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

**Step 3: Update body class in index.html**

Change:
```html
<body class="bg-gray-50 text-slate-800 antialiased">
```
To:
```html
<body class="bg-cream-100 text-slate-800 antialiased font-sans">
```

**Step 4: Commit**
```bash
git add index.html
git commit -m "design: extend color palette with forest/sage/bark/cream tokens, add Inter font"
```

---

### Task 14: Redesign Sidebar

**File:** `components/Sidebar.tsx`

**Goal:** Richer, deeper forest green. Add a subtle gradient. Better visual hierarchy.

**Step 1: Replace the `<aside>` className**

Change:
```tsx
<aside className={`
    fixed lg:static inset-y-0 left-0 z-30 w-64 bg-forest-900 text-white transform transition-transform duration-300 ease-in-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    flex flex-col
`}>
```
To:
```tsx
<aside className={`
    fixed lg:static inset-y-0 left-0 z-30 w-64 text-white transform transition-transform duration-300 ease-in-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    flex flex-col
`}
style={{ background: 'linear-gradient(180deg, #163f28 0%, #0d2619 100%)' }}>
```

**Step 2: Update the logo area**

Change:
```tsx
<div className="flex items-center justify-center h-20 border-b border-forest-800">
```
To:
```tsx
<div className="flex items-center justify-center h-20 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
```

Update the icon background:
```tsx
<div className="bg-forest-500/20 border border-forest-400/30 p-2 rounded-lg">
```

Update subtitle text:
```tsx
<span className="text-xs text-forest-300/70 uppercase tracking-widest font-medium">Carbon Forecast</span>
```

**Step 3: Update the nav item active state**

Change the active state className:
```tsx
isActive
    ? 'bg-white/10 text-white border border-white/15 shadow-inner'
    : 'text-forest-200/80 hover:bg-white/5 hover:text-white'
```

**Step 4: Update the "Did you know?" section**

Change:
```tsx
<div className="bg-forest-800/50 rounded-xl p-4 backdrop-blur-sm">
```
To:
```tsx
<div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
```

**Step 5: Commit**
```bash
git add components/Sidebar.tsx
git commit -m "design: richer sidebar with deeper forest gradient and refined nav states"
```

---

### Task 15: Redesign Calculator / Main Layout

**File:** `components/Calculator.tsx`

**Goal:** Replace flat gray cards with warm cream/sage tones. Better visual hierarchy.

**Step 1: Update the Global Parameters card**

Change:
```tsx
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-6">
```
To:
```tsx
<div className="bg-cream-50 p-6 rounded-xl border border-sage-200/60 flex items-center space-x-6">
```

**Step 2: Update the Clock icon background**

```tsx
<div className="p-3 bg-forest-100 rounded-full text-forest-600">
```

**Step 3: Update the form card (left column)**

Change:
```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
```
To:
```tsx
<div className="bg-white rounded-xl shadow-sm border border-sage-200/50 overflow-hidden sticky top-6">
    <div className="bg-forest-50 px-6 py-4 border-b border-forest-100">
```

**Step 4: Update the "Add Inventory" header icon**

```tsx
<Plus className="w-4 h-4 mr-2 text-forest-500" />
```

**Step 5: Update the table card**

Change:
```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <thead className="bg-gray-50 border-b border-gray-200">
```
To:
```tsx
<div className="bg-white rounded-xl shadow-sm border border-sage-200/40 overflow-hidden">
    <thead className="bg-forest-50 border-b border-forest-100">
```

**Step 6: Update the table footer**

```tsx
<tfoot className="bg-forest-50 border-t border-forest-100">
```

**Step 7: Update the submit button**

Change:
```tsx
className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold..."
```
To:
```tsx
className="w-full bg-forest-700 text-white py-3 rounded-lg font-semibold hover:bg-forest-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-[0.98]"
```

**Step 8: Update the "View Impact Report" button**

```tsx
className="bg-forest-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-forest-700 transition-colors shadow-sm flex items-center gap-2"
```

**Step 9: Commit**
```bash
git add components/Calculator.tsx
git commit -m "design: warm cream/sage tones on calculator form, forest accent buttons"
```

---

### Task 16: Redesign Dashboard

**File:** `components/Dashboard.tsx`

**Goal:** More nature-forward hero card. Richer section backgrounds.

**Step 1: Update the main CO₂ hero card gradient**

Change:
```tsx
<div className="bg-gradient-to-br from-forest-800 to-forest-900 rounded-2xl p-8 text-white shadow-xl md:col-span-2 relative overflow-hidden">
```
To:
```tsx
<div className="rounded-2xl p-8 text-white shadow-xl md:col-span-2 relative overflow-hidden"
     style={{ background: 'linear-gradient(135deg, #163f28 0%, #0d2619 60%, #1d3a20 100%)' }}>
```

**Step 2: Update the Growth & Yield analysis section**

Change:
```tsx
<div className="lg:col-span-2 bg-forest-50 rounded-2xl p-8 border border-forest-100 flex flex-col justify-between">
```
To:
```tsx
<div className="lg:col-span-2 rounded-2xl p-8 flex flex-col justify-between"
     style={{ background: 'linear-gradient(135deg, #f0faf3 0%, #e6ede6 100%)', border: '1px solid #b4e6c5' }}>
```

**Step 3: Add a subtle decorative element to the hero card**

Inside the hero card, add a second decorative circle (after the existing one):
```tsx
<div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-40 h-40 bg-forest-600/20 rounded-full blur-2xl"></div>
```

**Step 4: Update the empty state**

Change:
```tsx
<div className="bg-gray-100 p-6 rounded-full mb-6">
    <Trees className="w-12 h-12 text-gray-400" />
```
To:
```tsx
<div className="bg-forest-100 p-6 rounded-full mb-6">
    <Trees className="w-12 h-12 text-forest-400" />
```

**Step 5: Commit**
```bash
git add components/Dashboard.tsx
git commit -m "design: deepen hero card gradient, nature-forward growth analysis section"
```

---

### Task 17: Redesign Header

**File:** `App.tsx`

**Goal:** Green accent line under header, cleaner white bar.

**Step 1: Update the `<header>` element**

Change:
```tsx
<header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
```
To:
```tsx
<header className="bg-white h-16 flex items-center justify-between px-6 z-10"
        style={{ borderBottom: '2px solid #b4e6c5', boxShadow: '0 1px 12px rgba(34,128,75,0.06)' }}>
```

**Step 2: Update the title style**

```tsx
<h1 className="text-xl font-bold text-forest-900 tracking-tight">{getTitle()}</h1>
```

**Step 3: Commit**
```bash
git add App.tsx
git commit -m "design: forest-green accent border on header, tighter typography"
```

---

### Task 18: Update Analytics Charts to Use New Palette

**File:** `components/Analytics.tsx`

**Step 1: Update the COLORS array in Dashboard** (it's in Dashboard.tsx)

Change:
```ts
const COLORS = ['#39a872', '#60c68f', '#96deb3', '#c3eed2', '#298759', '#1f563d'];
```
To (more distinct, nature palette):
```ts
const COLORS = ['#2e9e5e', '#5e825e', '#98776a', '#4db87a', '#163f28', '#826057'];
```

**Step 2: Update the area chart gradient in Analytics.tsx**

Change gradient stop color to deeper green:
```tsx
<stop offset="5%" stopColor="#2e9e5e" stopOpacity={0.85}/>
<stop offset="95%" stopColor="#2e9e5e" stopOpacity={0.02}/>
```
And the Area stroke:
```tsx
<Area type="monotone" dataKey="total" stroke="#1d673d" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
```

**Step 3: Update species bar chart color**

```tsx
<Bar dataKey="co2" fill="#2e9e5e" name="Lifetime CO₂ (kg)" radius={[4, 4, 0, 0]} />
```

**Step 4: Update scatter chart color**

```tsx
<Scatter name="Trees" data={scatterData} fill="#5e825e" fillOpacity={0.65} stroke="#3b543c" />
```

**Step 5: Commit**
```bash
git add components/Analytics.tsx components/Dashboard.tsx
git commit -m "design: update chart colors to forest/sage palette for visual coherence"
```

---

## Final Steps

### Task 19: Final Verification Pass

**Step 1: Full browser test checklist**

Run `npm run dev` and verify:
- [ ] App loads (both TS6 and TS9 fetch successfully)
- [ ] TS1 regions load in the dropdown
- [ ] Species modal opens, search is empty on reopen
- [ ] Can add trees: Red maple 20cm, 5 trees
- [ ] DBH `0` is rejected
- [ ] Horizon slider updates forecast table
- [ ] Region change updates forecast table
- [ ] Refresh page — trees persist
- [ ] "Clear Project" removes trees and clears storage
- [ ] Dashboard renders with all stats
- [ ] "Export / Print" opens print dialog, sidebar hidden
- [ ] Analytics shows 3 charts: cumulative, annual rate, species bar
- [ ] Scatter chart and species breakdown table both work
- [ ] Design looks nature-forward (creams, sage greens, forest)
- [ ] Mobile: sidebar opens/closes correctly

**Step 2: Final commit**
```bash
git add -A
git commit -m "chore: final verification — all features and bug fixes complete"
```

---

## Appendix: Files Changed Summary

| File | Type | What Changed |
|---|---|---|
| `CLAUDE.md` | New | AI context, gotchas, file map |
| `docs/ARCHITECTURE.md` | New | Data flow, carbon math, region system |
| `types.ts` | Modified | Added `RegionOption` |
| `constants.ts` | No change | Already had TS1 URL |
| `App.tsx` | Modified | Load TS1, region state, localStorage save/restore, header updates |
| `services/carbonCalculator.ts` | Modified | Species matching fix, regionCode param |
| `components/Calculator.tsx` | Modified | useEffect fix, DBH validation, region selector UI, design |
| `components/Dashboard.tsx` | Modified | Print export, hero redesign |
| `components/Analytics.tsx` | Modified | Annual chart, O(n²) fix, chart colors |
| `components/SpeciesSelectorModal.tsx` | Modified | Reset query on open |
| `components/Sidebar.tsx` | Modified | Design refresh |
| `index.html` | Modified | Color palette, Inter font, print CSS |
| `styles.css` | No change | Legacy file, mostly unused |
| `components/DataView.tsx` | No change | Leave as dead code — don't delete (may be useful for future data explorer tab) |
