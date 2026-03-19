# Changelog

All notable changes to Tree Carbon Xray are documented here.

## [Unreleased]

## 2026-03-19 — Codex Review Fixes

### Fixed
- **P1:** Implemented 5 missing USFS equation types (loglogw4, quart, expow2, expow3, expow4) — 48 TS6 rows / 28 species were silently using linear fallback
- **P2:** Region selector now visible on mobile screens (was `hidden md:flex`)
- **P2:** Species input warns when name doesn't match catalog (amber warning + dismiss)
- **P2:** CSV export removes invalid `#` comment line, adds year-by-year forecast columns
- **P3:** Analytics chart titles clarified (storage vs sequestration)
- **P3:** README corrected for horizon range (5–50, not 1–50) and feature descriptions
- **P3:** Added regression tests for all equation types in smoke test suite

## 2026-03-14

### Fixed
- **Species images**: Replaced 6 wrong/generic Wikimedia images for aggregate USFS categories — "Urban general conifer" was showing the Israeli flag, "General hardwood harris" showed a Texas county map, "General spiny dry vieilledent" showed a lobster, "General woodland jenkins" showed a river ferry, and 2 others showed wood grain instead of trees
- **Dashboard stats**: Fixed `useMemo` missing `_horizon` dependency — stats cards (CO2 tonnes, car equivalencies) now correctly update when the horizon slider changes
- **README demo URL**: Updated from stale GitHub Pages link to live Vercel deployment at tree-carbon-xray.vercel.app
- **CLAUDE.md**: Updated base path and dev URL references for Vercel migration
- **vite.config.ts**: Removed dead Gemini API key `define` block left over from AI Studio scaffold

## 2026-03-02

### Added
- DBH auto-fill from TS6 growth equations at typical 15-year urban tree age
- Species image preview card in add-tree form
- Project metadata (name, location, date) — editable header in Dashboard, persisted to localStorage
- DBH unit toggle (cm / inches) with internal cm-only math
- DBH species range hint (0.5x–1.8x typicalDbh)
- Inline form validation replacing alert() dialogs
- Confidence badge tooltips explaining exact/genus/proxy match levels
- CSV export of full tree inventory with forecast values
- Mobile responsive inventory (card layout on small screens)
- Example project onboarding ("Try Example Project" button)

### Fixed
- Species matching: switched from bidirectional substring to exact → genus → proxy priority
- useEffect dependency loop in Calculator.tsx (projectTreesRef pattern)

## 2026-03-01

### Added
- Initial MVP: species picker, carbon forecasting, impact report
- USFS region selector (16 regions from TS1 data)
- localStorage persistence with reconcile-on-reload
- Annual sequestration rate chart in Analytics
- Print/PDF export from Dashboard
- Nature-forward design: cream/sage/bark palette, Inter font, forest gradients
