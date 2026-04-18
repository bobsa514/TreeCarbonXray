# Changelog

All notable changes to Tree Carbon Xray are documented here.

## [Unreleased]

## 2026-04-17 — Editorial Magazine Redesign

Full visual redesign based on a Claude Design handoff bundle. The science engine, data pipeline, and confidence-tier model are untouched — this is a pure visual layer overhaul.

### Changed
- **Design system**: Off-white paper (`#f8f7f2`), ink (`#1a1d1a`), muted olive (`#6b8e5a`), terracotta (`#c87a54`). Instrument Serif editorial headlines + Inter UI + JetBrains Mono for data. Paper-grain background texture, hairline rules.
- **Navigation**: Replaced left Sidebar with sticky `TopNav` (brand · horizontal tabs · tree-count badge) and a subbar exposing horizon (mini-bar slider), region, and DBH unit toggle globally.
- **Project Builder**: Editorial two-column layout — sticky add-tree card with confidence-tier guidance on the left, live lifetime-total strip (ink panel with serif numerals), inventory table with inline quantity steppers + per-tree silhouettes, mini-bar year timeline on the right. New magazine-style empty state with botanical accents.
- **Impact Report**: Magazine masthead with volume/issue line, serif project title (88px), side-note model-confidence card, giant ink hero panel with `clamp(100px, 16vw, 220px)` serif headline number, equivalency tile in terracotta wash, side-by-side composition donut. Pull-quote-style growth narrative.
- **Visual Analytics**: Dropped Recharts in favor of hand-authored SVG — cumulative area with hover crosshair, annual-rate bars with dashed "peak year" marker, species-ranked bars, efficiency scatter. "Peak Growth Window" callout card at the top.
- **Species Browser**: Full-bleed modal with botanical header, photo/silhouette cards, inline confidence badge per card, typical DBH hint.

### Added
- `styles/tokens.css` — design-system CSS custom properties (colors, radii, shadows, type ramp, pill/button/input/conf-badge utilities).
- `styles/botanicals.css` — decorative-accent hooks.
- `components/Botanicals.tsx` — reusable line-illustration SVGs (`BotLeaf`, `BotBranch`, `BotRings`, `BotSprig`) + `TreeSilhouette` card placeholder with 4 canopy variants.
- `components/Modal.tsx` — reusable modal shell with escape-to-close and scroll lock.
- `components/TopNav.tsx` — new top navigation + global controls subbar.
- `components/SpeciesBrowser.tsx` — replaces `SpeciesSelectorModal`.
- `services/format.ts` — `fmt`, `cmToIn`, `inToCm`, `fmtDbh` helpers.
- `getModelConfidence()` lightweight tier lookup on `services/carbonCalculator.ts` for surfaces that don't need a full forecast.

### Removed
- `components/Sidebar.tsx` — superseded by TopNav.
- `components/SpeciesSelectorModal.tsx` — superseded by SpeciesBrowser.
- Tailwind CDN + `tailwind.config` removed from `index.html`. All components now style through design-token CSS classes (`.btn`, `.pill`, `.conf`, `.tbl`, `.card`, `.eyebrow`, `.serif`, `.mono`, etc.) plus inline styles. Reduces one CDN dependency and unifies the styling model.

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
