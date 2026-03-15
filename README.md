# Tree Carbon Xray

**Browser-based tree carbon accounting powered by USFS i-Tree science.**

Inventory your trees, model their lifetime carbon storage using US Forest Service growth coefficients, and export a client-ready impact report — all in under five minutes, directly in the browser.

**[Live demo →](https://tree-carbon-xray.vercel.app/)**

---

## Why this exists

Tools like i-Tree Eco produce rigorous carbon estimates, but they require software installation, multi-week data collection protocols, and significant GIS expertise. Landscape architects and urban planners often just need a fast, credible answer: *how much carbon does this planting actually sequester?*

Tree Carbon Xray gives you that answer in minutes, using the same USFS biomass science, with a clean UI designed for field practitioners.

---

## Features

- **Species picker** — autocomplete or browse by photo across 194+ species with model confidence labels (`exact`, `genus`, or `proxy` fallback)
- **DBH auto-fill** — suggested diameter pre-filled from TS6 growth equations at typical 15-yr urban tree age; override with your own field measurement
- **Unit toggle** — enter DBH in cm or inches; all math stays in cm internally
- **Regional calibration** — select your USFS region (16 options) to use locally calibrated growth coefficients
- **Forecast table** — projected DBH, height, and carbon storage per species group over a configurable horizon (1–50 yrs)
- **Impact report** — summary cards, vehicle/gasoline equivalencies, species composition pie chart, and editable project metadata (name, location, date) for client delivery
- **CSV export** — one-click download of your full inventory with forecast values
- **Analytics** — cumulative sequestration timeline, annual rate chart, species breakdown
- **Example project** — one-click demo with Red Maple, White Oak, London Plane, and Ginkgo to see the full UI immediately
- **Mobile-friendly** — inventory adapts to card layout on small screens
- **Offline-resilient** — USFS CSVs load network-first with in-app local fallback; state persists in localStorage

---

## Data sources

| Dataset | Source | Role |
|---|---|---|
| TS6 Growth Coefficients | USFS i-Tree | DBH and height growth by species × region |
| TS9 Biomass Density | USFS i-Tree | Wood density factors for carbon conversion |
| TS1 Regional Info | USFS i-Tree | 16 USFS regions and associated cities |

Carbon math: `V = π(DBH/2)² × H × 0.45` → `biomass = V × density × 1.2` → `carbon = biomass × 0.5` → `CO₂e = carbon × 3.667`

---

## Quick start

```bash
npm install
npm run dev
# Open http://localhost:3000/
```

Run smoke tests (CSV parser + forecast engine):
```bash
npm run test:smoke
```

---

## Project structure

```
App.tsx                      # Routing, data loading, global state
types.ts                     # TypeScript interfaces
constants.ts                 # GitHub raw data URLs, example project data
index.html                   # Tailwind CDN config, importmap, print CSS
components/
  Calculator.tsx             # Inventory form, species picker, forecast table
  Dashboard.tsx              # Impact report, project metadata, CSV export
  Analytics.tsx              # Sequestration timeline and species charts
  SpeciesSelectorModal.tsx   # Full-screen species image picker
  Sidebar.tsx                # Navigation, tree facts
services/
  carbonCalculator.ts        # Growth math engine — forecastTreeGrowth()
  dataService.ts             # CSV parsers for USFS datasets
  speciesCatalog.ts          # Species catalog builder, image resolution
  csvExport.ts               # Client-side CSV generation
public/
  species-images.yaml        # Curated species photo URLs
Data/                        # Original USFS CSVs (bundled as local fallback)
```

---

## Roadmap

Planned improvements toward deeper i-Tree parity and professional use:

- [ ] **Multi-site projects** — separate inventory per project, switch between sites
- [ ] **Canopy cover inputs** — shade, stormwater interception, energy savings co-benefits
- [ ] **Health/condition modifier** — adjust carbon estimates for tree condition (poor/fair/good)
- [ ] **Removal / mortality tracking** — model trees removed from inventory over the horizon
- [ ] **GIS / KML export** — geo-tagged inventory for ArcGIS/QGIS import
- [ ] **Batch CSV import** — upload an existing field-collected spreadsheet
- [ ] **PDF report generation** — server-rendered branded PDF output (beyond browser print)
- [ ] **Canopy valuation** — dollar values for carbon credits (CAR/VCS protocol alignment)
- [ ] **Team / org accounts** — save and share projects across a practice
- [ ] **API access** — programmatic carbon estimates for integration into other planning tools

---

## Contributing

Open an issue or pull request — all welcome. This project uses USFS public data and is open source under the MIT license.
