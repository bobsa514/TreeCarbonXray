# Tree Carbon Xray — Design Brief for Interactive Prototype

This document describes **what the product does** and **what each screen must accomplish** — not how it should look. It is intended as the functional framework for an interactive prototype that the product owner will iterate on with a UI/UX designer before engineering implementation.

Everything below is content and behavior: the tools, the math, the user stories, the data the user sees and manipulates. Design direction (visual style, layout, typography, color, iconography, motion, spacing, component vocabulary) is intentionally omitted and should be decided by the designer.

---

## 1. What the product is

Tree Carbon Xray is a browser-based tool that lets a user build a small inventory of trees (real or proposed), pick a projection horizon (5–50 years), and get a scientifically-grounded answer to one question:

> **How much carbon will these trees store over the life of this project?**

The answer is delivered in three forms:
1. A **forecast table** of each tree's projected growth and carbon storage.
2. A **client-ready impact report** with headline numbers, real-world equivalencies, and project metadata.
3. A **visual analytics view** with time-series charts showing how and when carbon accumulates.

The user can export the whole thing as a CSV for downstream reporting or as a printed PDF report.

The science is the US Forest Service i-Tree research dataset — the same data underpinning the professional i-Tree Eco desktop tool. The positioning is: **i-Tree Eco-level rigor, delivered in 5 minutes in a browser, with no install or GIS expertise required.**

---

## 2. Primary users

### Persona A — The Landscape Architect (primary)
- Works at a small-to-midsize landscape architecture firm.
- Designs parks, streetscapes, residential developments, campus master plans.
- Needs to answer client questions about environmental impact in pitches and deliverables.
- Not a data scientist; has never used i-Tree Eco because the setup cost is too high.
- Deliverable mindset — the output needs to look presentable to a client.

### Persona B — The Urban Planner / Municipal Forester
- Works for a city, county, or parks department.
- Evaluating planting plans, comparing species mixes, making budget cases.
- Needs a defensible number ("based on USFS data, this project will sequester X kg CO₂") that can go into a grant application or council memo.

### Persona C — The Environmental Consultant
- Produces sustainability reports for clients (developers, corporations, nonprofits).
- Needs a fast, credible way to estimate the carbon contribution of landscape elements alongside other ESG inputs.

### Persona D — The Informed Homeowner / Educator (secondary)
- Curious about the trees in their yard, on their campus, or in their neighborhood.
- Not a professional but wants a real number, not a vibe.

---

## 3. Jobs to be done (user stories)

These are the outcomes the product must make easy. Every screen should be evaluated against whether it advances one of these jobs.

### Discovery & setup
- **U1.** *As a first-time visitor, I want to understand what this tool does and what kind of answer it gives me within 10 seconds of landing.*
- **U2.** *As a first-time visitor, I want to try the tool with a realistic example without having to input my own data first, so I can see whether it's worth my time.*
- **U3.** *As a returning user, I want my previous project to still be there when I come back.*

### Building an inventory
- **U4.** *As a practitioner, I want to search a species by common name OR scientific name — I don't always know which form my site survey used.*
- **U5.** *As a practitioner, I want to visually browse species by photo when I don't remember the exact name.*
- **U6.** *As a practitioner, I want the tool to suggest a realistic default DBH for the species I picked, so I can get a quick estimate even before I have field measurements.*
- **U7.** *As a practitioner, I want to override that default with a measured DBH from the field.*
- **U8.** *As a practitioner working in imperial units, I want to enter DBH in inches without mental conversion.*
- **U9.** *As a practitioner, I want to specify a region of the country so the forecast uses locally-calibrated growth data.*
- **U10.** *As a practitioner, I want to add multiple trees of the same species as a single row with a quantity count, not one row per tree.*
- **U11.** *As a practitioner, I want to adjust the quantity of an already-added species without removing and re-adding it.*
- **U12.** *As a practitioner, I want to remove a tree I added by mistake.*
- **U13.** *As a practitioner, I want to clear the whole project and start fresh.*

### Understanding the forecast
- **U14.** *As a practitioner, I want to see how much carbon each tree holds today AND how much it will hold at the end of my planning horizon.*
- **U15.** *As a practitioner, I want to adjust the planning horizon (5, 10, 20, 50 years) and see the whole forecast update.*
- **U16.** *As a practitioner, I want to know how confident the model is in its estimate for each species — am I getting a species-specific answer, a genus-level approximation, or a fallback proxy?*
- **U17.** *As a practitioner, if the model is using a proxy, I want to know WHICH species is being used as the proxy and roughly how wide the uncertainty band is.*
- **U18.** *As a practitioner, I want to be warned if I type a species name that isn't in the catalog — but I also want the option to proceed with a proxy estimate if I choose to.*

### Generating an impact report
- **U19.** *As a practitioner preparing a client deliverable, I want a headline number for lifetime carbon storage that I can point to.*
- **U20.** *As a practitioner, I want that abstract number translated into tangible equivalencies (cars driven for a year, gallons of gasoline) so a non-technical audience can grasp the scale.*
- **U21.** *As a practitioner, I want to add my project name, location, and date so the report is labeled as mine.*
- **U22.** *As a practitioner, I want to see the species composition of my inventory at a glance.*
- **U23.** *As a practitioner, I want to see the growth multiplier — what percentage increase over the current stock does the horizon represent?*
- **U24.** *As a practitioner, I want to print or export this report in a format I can hand to a client.*
- **U25.** *As a practitioner, I want a CSV with the raw year-by-year forecast for each species so I can do my own analysis or import into another tool.*

### Deep analysis
- **U26.** *As an analytically-minded user, I want to see the carbon accumulation curve over time to understand the shape of sequestration (not just the endpoint).*
- **U27.** *As a planner, I want to know when the annual sequestration rate peaks — that's my highest-value growth window and affects which horizon I should plan around.*
- **U28.** *As a planner, I want to compare species side by side: which species are the heavy carbon lifters in my mix, and which are more decorative?*
- **U29.** *As a planner, I want to understand the relationship between tree size and lifetime carbon potential so I can reason about whether planting bigger (more expensive) stock is worth it.*

### Trust
- **U30.** *As a professional putting my name on a deliverable, I want to know where the numbers come from and what their scientific basis is.*
- **U31.** *As a professional, I want the tool to degrade gracefully offline — if GitHub is slow, I shouldn't be blocked from using the app.*

---

## 4. Information architecture

The product is a single-page app with three primary views and one modal. The user moves freely between the three views once they have at least one tree in their inventory.

```
[GLOBAL NAV]
  ├── Project Builder   (inventory entry + live forecast table)
  ├── Impact Report     (client-ready summary with equivalencies)
  └── Visual Analytics  (time-series & species breakdown charts)

[GLOBAL CONTROLS]
  ├── Project Planning Horizon  (5–50 years, 5-yr steps) — affects all three views
  ├── USFS Region              (16 options + "all regions average") — affects all three views
  ├── DBH Unit                 (cm / inches) — affects all three views
  └── Clear Project            (confirm-gated destructive action)

[GLOBAL PERSISTENCE]
  The project inventory, horizon, region, unit, and metadata are
  saved to the browser's localStorage automatically (debounced ~500ms).
  State survives reload. No login or account.

[MODAL]
  └── Species Browser   (visual photo-grid picker for species selection)
```

---

## 5. Page 1 — Project Builder

**Purpose:** Let the user assemble an inventory of tree species + quantities + sizes, and see the projected carbon outcome update live as they build.

**This is the primary workspace.** The user spends most of their time here. When the inventory is empty, this is also the onboarding / first-run surface.

### 5.1 Empty state (no trees yet)
Must communicate:
- What this app does in one sentence.
- That the user can try an example project with one click (loads 4 pre-populated species: Red Maple × 5, White Oak × 3, London Plane × 10, Ginkgo × 7).
- That the alternative is to add a species of their own via the input form.

### 5.2 Add-tree form
The user needs to provide, for each inventory entry:

| Field | Type | Behavior |
|---|---|---|
| **Species** | Text input with autocomplete + "Browse list" button | Search by common OR scientific name. Dropdown shows up to 10 matches. "Browse list" opens the Species Browser modal (§8). On selection, form shows a small preview (species photo + common + scientific name + "Species selected" confirmation). |
| **Quantity** | Number stepper, min 1 | Defaults to 1. |
| **DBH** | Number + unit indicator | Diameter at Breast Height (1.37 m from ground). Displayed in cm or in per the global unit toggle. On species selection, **autofills** with the species' typical DBH at ~15-year urban age, if known. Also shows a "typical range for this species" hint (e.g. "9–32 cm"). User can override. |
| **DBH unit toggle** | cm ⇄ in | Inline toggle. Toggling converts the current entered value rather than wiping it. |
| **Submit** | Button | Disabled until species and DBH are both valid and > 0. |

**Validation & warnings:**
- DBH must be > 0. Invalid entries show an error inline.
- If the typed species string doesn't match anything in the catalog, the submit is **blocked on first attempt** with an amber warning: *"'X' was not found in the species catalog. Select from the dropdown or browse list for best accuracy. The model will use a genus-level or proxy estimate if you proceed."* A "Dismiss and add anyway" option allows the user to proceed; on re-submit, the tool uses a proxy estimate and flags the entry's confidence accordingly.

### 5.3 Global project controls (visible from this page)
- **Planning Horizon slider** — 5 to 50 years in 5-year steps. Changing this triggers a full recalculation of every tree's forecast. The default is 20 years.
- **USFS Region selector** — dropdown with 16 USFS regions, each labeled with a representative city/state (e.g. "North — Minneapolis, MN"). Plus a default option: "All Regions (average)". Changing this recalculates all trees. Region determines which TS6 growth coefficients are used.

### 5.4 Inventory table / list
Every tree the user has added appears in a live-updating table (or, on mobile, a stack of cards). Each row shows:

- Quantity (editable inline — user can nudge the count without re-entry).
- Species common name + scientific name (italic).
- **Model confidence badge** — one of `exact`, `genus`, `proxy`. Color-coded and tooltip-rich. If confidence is not `exact`, the row also shows a small "model: [scientific name of proxy species]" note.
- Current size — initial DBH + estimated initial height (in meters).
- Projected growth — delta DBH over the horizon, with "over N yrs" subtitle.
- Total impact — total kg CO₂ stored at end of horizon, accounting for quantity.
- Delete action.

Table footer (or mobile card list footer) shows the **project lifetime total** in kg CO₂, summed across all species × their quantities.

### 5.5 Model confidence — user-facing semantics
This is one of the most important UX concepts in the product. The user must always know which tier each tree is on:

| Tier | Meaning | Approximate uncertainty |
|---|---|---|
| **exact** | Growth data found for this exact species in the selected region. | ~10–20% |
| **genus** | No exact species data; using coefficients from a related species in the same genus. | ~20–40% |
| **proxy** | No genus-level data; using Acer rubrum (Red Maple) as a conservative growth proxy. | ~40–60% |

These tiers must appear anywhere a single-species forecast is presented, and should aggregate on the Impact Report (§6) so the reader of the report can see the overall model-confidence profile of the project.

### 5.6 Guidance panel
A small explanatory block on this page (content, not a decision about placement) that reads approximately:

> *"Growth Model Active: Calculations use US Forest Service regional growth coefficients. **Exact** = direct species match; **Genus** = related species proxy; **Proxy** = Acer rubrum fallback. Hover confidence badges for details."*

### 5.7 Primary action out of this page
Once there is at least one tree in the inventory, a prominent call-to-action moves the user to the **Impact Report** view.

---

## 6. Page 2 — Impact Report

**Purpose:** Turn the inventory into something a practitioner can show a client. This is the deliverable surface.

If the inventory is empty, this page must show a friendly empty state that sends the user back to the Builder.

### 6.1 Project metadata header
Editable-in-place section with three fields:
- **Project Name** (e.g. "Riverside Park Expansion")
- **Location** (e.g. "Portland, OR")
- **Date** (date picker — defaults to today)

When not editing, the header displays the project name as the page title (with a gray "Untitled Project" placeholder if blank), location, and date. An "Edit Details" affordance switches to edit mode with Save / Cancel actions.

### 6.2 Report-generation metadata
Static copy for the printed/exported version:
- Title: **"Tree Carbon Xray — Impact Report"**
- Generated-on date (today's date, long form).
- Data-source attribution (small text): *"Carbon projections use USFS i-Tree growth coefficients (TS6/TS9)."*

### 6.3 Actions
Available from this page:
- **Export / Print** — invokes the browser's print dialog. The printed output should be the report itself, with edit chrome hidden.
- **Export CSV** — downloads a CSV of the inventory (§6.7).
- **Tree count pill** — a read-only indicator showing "N Trees in Inventory" as social-proof reassurance.

### 6.4 Model confidence summary strip
A bar showing the aggregate confidence of the inventory:
- `Exact: N` · `Genus: N` · `Proxy: N`
  (Counts are in tree-units, i.e. weighted by quantity.)

This is how the report communicates to the reader how much of the number they're looking at is species-specific vs. approximated.

### 6.5 Headline stats

**Primary card — Lifetime Carbon Storage (visual hero of the page).**
Contains:
- The headline number: **total projected kg CO₂e** at the end of the horizon.
- Secondary split below it: **Current Stock** (year 0 carbon) and **Net Sequestration (Growth)** — the delta showing how much new carbon will be added by growth over the horizon.

**Secondary card — Equivalency.**
Translates the headline number into tangible units:
- **Passenger vehicles driven for one year** — calculated as `total CO₂ / 4,600 kg` (EPA estimate of annual CO₂ emissions from a typical passenger vehicle).
- **Gallons of gasoline consumed** — calculated as `total CO₂ / 8.887 kg/gallon` (EPA tailpipe CO₂ factor for gasoline).

These two equivalencies are the standard climate-communication shorthand the user can cite without further conversion.

### 6.6 Additional analysis blocks

**Project Composition chart.**
A species-distribution chart (donut / pie) showing the relative count of each species in the inventory, with a top-3 species legend by name and count.

**Growth & Yield narrative block.**
A short, auto-generated sentence that contextualizes the forecast. Content template:

> *"This project utilizes growth coefficients to model the biological maturation of the inventory. Over the next **[N] years**, the total carbon storage is projected to increase by **[P]%** as trees increase in diameter and biomass."*

Where **P** = `(net sequestration / current stock) × 100`. If current stock is 0, show "N/A".

Alongside this narrative, two small stat tiles:
- **Metric Tonnes** — `total kg CO₂ / 1000`, to 2 decimal places.
- **Trees** — total tree count (summed across quantities).

A small footnote: *"Includes above-ground biomass estimation derived from DBH–Height allometry."*

### 6.7 CSV export format
The downloaded file must contain one row per inventory entry (i.e. one row per species × quantity group), with these columns in this order:

1. Species (Common)
2. Species (Scientific)
3. Count
4. Initial DBH (unit matches the user's current DBH unit toggle)
5. Initial Height (m)
6. Model Confidence (`exact` | `genus` | `proxy`)
7. Model Source (scientific name of species used in the growth model — same as the input species if `exact`)
8. Model Note (human-readable confidence caveat with uncertainty range — see table below)
9. **Year 0 CO2 (kg)** through **Year N CO2 (kg)** — one column per year up to the horizon, each value being the **per-species-group total** (i.e. multiplied by count).

Model Note content by tier:
| Tier | Note text |
|---|---|
| exact | *"Species-specific USFS i-Tree coefficients (~10–20% uncertainty)"* |
| genus | *"Genus-level coefficients from [Proxy Species] (~20–40% uncertainty)"* |
| proxy | *"Proxy: [Proxy Species] model used — species not in USFS database (~40–60% uncertainty)"* |

Filename format: `tree-carbon-inventory-[YYYY-MM-DD].csv` (uses the project metadata date).

---

## 7. Page 3 — Visual Analytics

**Purpose:** Let an analytically-minded user look past the headline number and understand the *shape* of sequestration — how it accumulates over time, which species do the heavy lifting, and how initial size relates to lifetime carbon potential.

If the inventory is empty, show a friendly empty state.

### 7.1 Chart A — Total Carbon Storage Over Time (hero chart)
An area chart of cumulative CO₂ stored across the entire inventory from Year 0 to the horizon.
- X-axis: Year (0 to horizon).
- Y-axis: Total CO₂ (kg) — cumulative across the project.
- Caption: *"Projected total CO₂ stored by the project inventory (existing stock + new growth) over the planning horizon."*

This is the answer to "show me the curve, not just the endpoint."

### 7.2 Chart B — Annual Carbon Sequestration Rate
A bar chart of *incremental* carbon added each year (not cumulative).
- X-axis: Year.
- Y-axis: CO₂ Added (kg/yr).
- Caption: *"Carbon added each year (kg CO₂). Peak shows when trees are growing fastest — the highest-value growth window for planning."*
- Footnote: *"Year 0 shows current state (no annual delta). Sequestration rate typically peaks in middle age then tapers."*

This chart exists specifically to answer planning-horizon questions ("is a 20-year horizon capturing the peak growth window or cutting it short?").

### 7.3 Chart C — Total Carbon Storage by Species (End of Horizon)
A bar chart ranked by carbon contribution, one bar per species.
- X-axis: Species (common name).
- Y-axis: CO₂ (kg) at end of horizon.

Purpose: identify which species are the heavy carbon lifters.

### 7.4 Chart D — Sequestration Efficiency (scatter)
A scatter plot relating initial tree size to lifetime carbon potential per tree.
- X-axis: Initial DBH (cm).
- Y-axis: Lifetime CO₂ per tree (kg).
- Dot size: quantity of that species in the inventory.
- Caption: *"Initial DBH vs. Lifetime Carbon Potential per tree."*

Purpose: reason about whether planting larger (more expensive) stock pays off in carbon terms.

### 7.5 Species Breakdown table
A companion table alongside the efficiency chart, summarizing at end of horizon:

| Species | Qty | Total CO₂ | % of project |
|---|---|---|---|

Sorted descending by Total CO₂. The percentage column shows each species' share of the total projected carbon — this is the numeric counterpart to Chart C.

---

## 8. Modal — Species Browser

**Purpose:** Let the user find a species by sight when they don't know the name precisely, or want to browse the 194+ species catalog.

### Content
- A title and subtitle: *"Browse Species — Tap a card to populate the form with common and scientific names."*
- A search field at the top of the modal (same search logic as the autocomplete on the Builder form).
- A grid of species cards. Each card shows:
  - A photograph of the species.
  - Common name (prominent).
  - Scientific name (secondary, italic).
  - A clear "Select" affordance.
- Empty state: *"No species match your search."*
- A clear close / dismiss affordance.

### Behavior
- Opens from the "Browse list" button on the Builder form.
- Selecting a species closes the modal, populates the Builder form with that species, **and** triggers the typical-DBH autofill described in §5.2.
- Opening the modal should reset the search query to empty.

---

## 9. Global state & persistence

The following state is saved to the browser (localStorage, ~500ms debounce) and restored on next visit:
- Inventory (every ProjectTree added, including species, count, DBH, forecast).
- Planning horizon.
- Selected USFS region.
- Project metadata (name, location, date).
- DBH unit (cm / in).

No account, no login, no server-side storage. The app is single-user and browser-local by design.

A **"Clear Project"** action is always available when at least one tree exists. It must:
- Present a confirmation dialog ("Clear all trees from this project?").
- On confirm, empty the inventory AND reset project metadata (name, location, date).

---

## 10. Loading & error states

### Data loading (first paint)
On initial load, the app fetches three CSV datasets from GitHub (with a bundled local fallback if the network fails). Until these are parsed:
- Show a loading state with the message: *"Loading Model Data... Fetching growth coefficients from repository."*

### Load failure
If both network and local fallback fail for any required dataset:
- Show an error state with the message: *"Error Loading Data"* and the underlying error text, plus a Retry button.

### Lazy-loaded views
Builder, Impact Report, and Visual Analytics are each loaded on demand. Switching tabs may briefly show a lightweight *"Loading view..."* placeholder.

### Species image hydration
Species images are enriched in the background after initial paint. A generic fallback image is used until the per-species image arrives (and also as the permanent fallback if an image URL fails to load). This should never block interaction.

---

## 11. Data glossary (so the designer can frame tooltips, hints, and microcopy)

- **DBH** — *Diameter at Breast Height*. The diameter of a tree's trunk measured at 1.37 meters (4.5 ft) off the ground. This is the single most important input to the growth model.
- **USFS** — *United States Forest Service*. Supplies the i-Tree growth and biomass datasets that power the model.
- **i-Tree** — A suite of USFS tools and datasets for urban forestry analysis. This product uses the underlying science, not the tool itself.
- **TS6 Growth Coefficients** — Per-species, per-region regression coefficients predicting DBH and tree height as a function of age. Source: USFS i-Tree.
- **TS9 Biomass Density Factors** — Wood density (kg/m³) per species, used to convert volume to biomass.
- **TS1 Regional Information** — Maps USFS region codes to representative cities/states (16 regions, e.g. "North — Minneapolis, MN").
- **Sequestration** — New carbon being stored in the tree's biomass as it grows. Distinct from **storage**, which is the total carbon currently locked in the tree.
- **CO₂e** — Carbon dioxide equivalent. The product reports in kg CO₂e throughout, except where metric tonnes is more natural (Impact Report secondary stat).
- **Planning Horizon** — The number of years the forecast projects forward. User-adjustable from 5 to 50 years in 5-year steps.
- **Model Confidence** — Described in §5.5. The core UX concept for communicating that different species in the same inventory may be modeled with different degrees of precision.

---

## 12. Out of scope for this prototype

These are future capabilities on the product roadmap. The prototype should not accommodate them, but awareness may affect design framing:

- Multi-site projects (switching between separate inventories).
- Canopy cover co-benefits (shade, stormwater interception, energy savings).
- Tree health / condition modifier.
- Mortality / removal tracking.
- GIS / KML geo-tagged export.
- Batch CSV import of existing field spreadsheets.
- Server-rendered branded PDF (current export is browser print only).
- Carbon credit dollar valuation (CAR / VCS protocol alignment).
- Team / organization accounts and shared projects.
- Public API for programmatic access.

---

## 13. What success looks like for the prototype

A designer and the product owner should be able to iterate on this prototype against these tests:

1. **The 30-second test.** A first-time visitor reaches the app, clicks "Try Example Project," and within 30 seconds understands: (a) that they have a carbon forecast for 4 species, (b) the lifetime CO₂ number, and (c) that they could do this with their own trees.
2. **The confidence-tier test.** A user can, from any view where a per-species number is shown, explain why that number is `exact` vs. `genus` vs. `proxy` without reading documentation.
3. **The deliverable test.** A landscape architect can click "Export / Print" and hand the resulting page to a client without it feeling like a debug screen.
4. **The analyst test.** An analytically-minded user can answer "when does my sequestration peak?" from the Visual Analytics view in under 15 seconds.
5. **The return-visit test.** A user closes the tab, comes back tomorrow, and finds their project exactly where they left it.

These are the five moments the prototype is trying to nail. Every design decision should serve at least one of them.
