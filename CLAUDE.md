# The Setback

An independent research publication on American housing supply, by Zachary
Boukkouri. Astro + content collections; React islands only for the pro forma
calculator and comparison charts. Static output, deploys to Netlify.

Thesis: the housing shortage has a different binding constraint in every
city — regulatory, capital, or structural. Every city report diagnoses which
one, scores it against a fixed 5-metric scorecard, and quantifies it with the
same 40-unit development model.

## Design register — non-negotiable

These have each been violated and re-requested at least once. Don't
reintroduce them without being asked.

- **Flush left, no exceptions.** Headlines, standfirsts, buttons, section
  headings — everything shares the same left edge as the rest of the page.
  No progressive indent, no staggered/stepped text layout, no centered
  headlines. The setback motif (the stepped path) lives in exactly two
  places: the logo mark (`SetbackMark.astro`) and the section divider
  (`SetbackDivider.astro`). It does not appear in typography, layout, or
  anywhere else. If a design idea for a page depends on stepping the text
  itself, that idea has already been tried and rejected — ask before
  redoing it.
- **Restrained editorial register.** This reads as a research journal, not
  a startup landing page or advocacy site. Boldness comes from type scale,
  contrast, and structure — not color, gimmick, or motion. If a device
  reads as clever before it reads as informative, cut it.
- **No decorative motion.** Default to no animation. What's allowed:
  a quiet fade-and-rise on scroll entry (`[data-reveal]`, small distance,
  ~200–300ms, ease-out), quiet hover/focus states, a plain crossfade for
  state changes, and Astro View Transitions (opacity-only, ~200ms). Not
  allowed, ever, without being explicitly asked again: staggered text
  reveals, elements sliding in from off-screen, scale/zoom-on-scroll,
  parallax, scroll-jacking or pinned sections, counting-up numbers, spring
  or bounce easing, animated dividers or self-drawing lines. Everything
  respects `prefers-reduced-motion` — see the global rule in
  `src/styles/global.css`.
- **Charts must be legible, not decorative.** Every comparison chart needs
  a visible baseline, a labeled y-axis, a per-bar value label, and a
  threshold line that spans the full plot width with a label that doesn't
  collide with anything. The benchmark preset is context, not a
  competitor — render it as a thin marker/tick, never a bar the same
  weight as the six real cities.
- **Don't tune pro forma numbers to make a chart look better.** Every city
  input in `src/data/cityData.ts` is an unsourced placeholder (`status:
  'placeholder'`) pending real research. If a chart reads badly because
  the numbers cluster, fix the chart's presentation — axis, scale,
  labels — not the numbers. See "Sourcing architecture" below. R-01
  (Washington, D.C.) is the exception: `src/data/dc-proforma.json` carries
  real per-field sourcing (VERIFIED / VERIFIED_RANGE / DERIVED / ESTIMATE /
  ASSUMPTION), and its numbers are not placeholders — the same rule
  applies in the other direction there: don't change a value in that file
  to make its chart or calculator look better either. If the math
  disagrees with the file, the bug is in the code that reads it.
- **The chart doesn't lead on placeholder data.** The return-on-cost chart
  was removed from the homepage hero because it's built on the same
  unsourced data above, and shouldn't be the first thing a reader
  encounters — a reader has no way to tell a placeholder figure from a
  researched one at a glance. It now lives in its own full-width section
  below the framework (`#model` in `index.astro`), under a heading that
  frames it as one measure among several, not the site's central claim.
  The hero is headline, standfirst, and buttons only. Reconsider giving
  the chart hero-level prominence once city data is actually sourced —
  not before, and not without being asked.

## Sourcing architecture

There are two parallel systems, because they're at different stages of
being real:

### R-01 (Washington, D.C.) — actually sourced

`src/data/dc-proforma.json` is the single source of truth for the DC
report: `outputs` (expected results of the calculation, to the dollar/bp),
`inputs` (20 fields, each `{ id, label, value, unit, status, source, url,
slider }`), `reform_scenarios` (5 cumulative steps for the waterfall),
`sensitivity` (8-row tornado data), and `scorecard` (7 sourced metrics).
`status` is one of VERIFIED / VERIFIED_RANGE / DERIVED / ESTIMATE /
ASSUMPTION — see the field comment above `inputs` in that file, or the
Methodology section of the report itself, for what each means.

- `src/lib/dcProforma.ts` — the calculation engine (`calculateDcProforma`).
  Mirrors `research/dc-model.py`'s math exactly: construction-period
  interest on the average drawn balance, entitlement interest on the full
  land balance, and property tax solved iteratively (60-iteration
  fixed-point loop against assessed value). Don't hand-tune this to hit a
  number — if it disagrees with `dc-proforma.json`'s `outputs`, the bug is
  here.
- `src/components/SourcedProForma.tsx` — the DC-specific calculator
  island. Renders every field in `dc-proforma.json.inputs` (label,
  sublabel, slider, status chip linking to `source_url`) and recomputes
  live via `dcProforma.ts`. This is deliberately a separate component
  from `ProFormaCalculator.tsx` (below), not a refactor of it in place —
  the two have incompatible field shapes and `ProFormaCalculator` still
  serves the standalone `/calculator` page and the five unsourced city
  reports.
- `src/components/ReformWaterfallChart.astro` — reads
  `dc-proforma.json.reform_scenarios`. Static (server-rendered SVG, no
  client JS): a horizontal stepped waterfall from the 3.72% base case
  through each cumulative reform to the 4.37% regulatory ceiling, then a
  hatched block for the 213 bps that no zoning reform reaches, against a
  6.50% required-return line. Axis starts at 3.00%, not zero, so the
  reform bars aren't visually flattered against the unreachable gap —
  stated in the chart's own caption. Below 640px it swaps to a vertically
  stacked HTML/CSS version (same data, same scale) rather than shrinking
  the SVG, so the unreachable block stays legible next to the final bar.
- `src/components/SourcedScorecard.astro` — renders
  `dc-proforma.json.scorecard`, arbitrary row count, each row linking to
  its own `source_url`. This is what a report renders instead of
  `Scorecard.astro` (fixed 5-metric shape) whenever its frontmatter sets
  `proFormaData`.
- `research/dc-model.py` — a standalone, dependency-free reproduction of
  the same math as a sanity check independent of the TypeScript. It lives
  outside `src/` on purpose so Astro's build never bundles it. Run
  `python3 research/dc-model.py` from the repo root. Expected output:

  ```
  BASE      ROC 3.72%  TDC $16,328,290  NOI $606,856 VAL $11,559,166  GAP 278bps  V-C $-4,769,124
  REFORMED  ROC 4.37%  closes 66bps (24% of gap); 213bps unreachable
  Rent to clear hurdle at reform ceiling: $3,240/mo (+32% vs achievable)
  Residual land value at hurdle:          $-1,481,399 (vs $2,400,000 asking)
  ```

### Every other city — placeholder, pending research

The pro forma is built sourced-ready even though every value in it is
still a placeholder today:

- `src/data/cityData.ts` is the single source of truth. Every input
  (`landCost`, `hardCostPerUnit`, `softCostPct`, `permitMonths`,
  `constructionMonths`, `loanRate`, `monthlyRent`, `opexRatio`,
  `vacancyPct`, `exitCap`) is a `SourcedValue<T>`: `{ value, source, year,
  url, status }`, where `status` is `'placeholder'` or `'sourced'`. There's
  also one global `REQUIRED_RETURN`, shared across every city rather than
  set per city. The file's header comment lists the designated source for
  each field type (Zillow/Census for rent, RLB for hard costs, city
  permitting departments for timelines, CBRE/JLL for cap rates, etc.) —
  check there before pulling a new number in.
- `src/lib/proforma.ts` derives `CITY_PRESETS` (plain numeric inputs, for
  the calculator/chart math) from `cityData.ts` — it doesn't hold data
  itself anymore. `calculateProForma(inputs, requiredReturnPct)` splits
  carrying cost into two phases rather than charging interest on the full
  balance for the whole timeline: entitlement (`permitMonths`, land only)
  and construction (`constructionMonths`, ~50% of hard+soft, approximating
  the average drawn balance). NOI is now computed off effective gross
  income (gross rent less `vacancyPct`), not gross rent directly.
- Any UI showing a value needs to check its `status` and render the
  `.pending-flag` `[SOURCING PENDING]` marker (global.css) when it's still
  a placeholder — see `ProFormaCalculator.tsx`'s per-field tags,
  `ReturnOnCostChart.tsx`'s detail panel and "How to Read This" block, and
  `SourcesTable.astro`. When a value actually gets sourced, update its
  `source`/`year`/`url`/`status` together in `cityData.ts` — the tags and
  the sources table update themselves, no other file needs to change.
- `SourcesTable.astro` renders a full input/value/source/year/link table
  from `cityData.ts`, keyed by a report's `proFormaPreset` frontmatter
  field. Every city report currently sets one.

## Structure

- `src/content/reports/*.md|mdx` — one file per city report (collection
  key is `reports`, not `cities` — renamed when R-01 needed a path that
  matched its report_id rather than its city slug). Add a new city by
  writing a file here; don't touch layout code. `dc.mdx` shows the fully
  sourced pattern: `proFormaData: "dc-proforma"` in frontmatter, plus
  `<SourcedProForma client:visible />` and `<ReformWaterfallChart />`
  embedded in the body. The five unsourced stub reports instead set
  `proFormaPreset` to a key in `cityData.ts`, which renders the generic
  `ProFormaCalculator` and `SourcesTable` — see "Sourcing architecture".
- `src/pages/reports/[slug].astro` — the report template. Header,
  persistent margin metadata, scorecard, prose all align to one grid (see
  the flush-left rule above) — this was previously broken by three
  competing alignment systems and rebuilt once. Branches on whether
  frontmatter sets `proFormaData`: if so, it renders `SourcedScorecard`
  from that JSON file and skips the old `SourcesTable`; otherwise it
  renders the fixed-shape `Scorecard` and, if `proFormaPreset` is set,
  `SourcesTable`.
- `src/data/cityData.ts` — every pro forma input for the five unsourced
  cities, with sourcing metadata. See "Sourcing architecture" above.
- `src/data/dc-proforma.json` — R-01's sourced data. See "Sourcing
  architecture" above.
- `src/lib/proforma.ts` — pro forma math (derived from `cityData.ts`),
  chart scaling (`getChartFraction`, `CHART_GRIDLINES_PCT`), and
  constraint-type color mapping. Shared by `ProFormaCalculator.tsx`,
  `ReturnOnCostChart.tsx`, and `ChartPreviewCard.astro`. Not used by R-01
  — see `src/lib/dcProforma.ts` instead.
- `src/styles/global.css` — design tokens (palette, type, spacing, motion
  durations), the reduced-motion rule, and the `.pending-flag` marker
  style used everywhere sourcing status is shown.

## Planned work — do not build yet

- **Shortfall decomposition (successor to the return-on-cost bar chart).**
  The homepage chart (`ChartPreviewCard.astro`, `ReturnOnCostChart.tsx`)
  is still an interim visual for the five unsourced cities. It shows
  severity — how far each city falls below the required return — but not
  causation, so it doesn't actually demonstrate the publication's thesis
  that cities fail for different reasons. Right now the constraint type
  is asserted through bar color, not shown by the data.

  R-01 (Washington, D.C.) now has a real version of this idea:
  `ReformWaterfallChart.astro` decomposes the 278 bps gap into what
  zoning reform closes (66 bps, cumulatively, by named lever) versus what
  it can't reach (213 bps). That's the pattern to extend once a second
  city is sourced — not a city-vs-city comparison chart, but a per-city
  decomposition of its own gap into causes, sourced the same way DC's is.

  The still-unbuilt piece is the cross-city version: for each of the
  five unsourced cities, the gap between its return on cost and the
  required threshold, broken out by contributing cause — land cost,
  carrying cost from permitting delay, hard costs, and rent shortfall.
  That makes the failure mode visible per city (e.g. LA dominated by
  carrying cost, Detroit by rent shortfall, SF by land), turning the
  constraint taxonomy into something the data demonstrates rather than
  something the color legend claims.

  Do not build the cross-city version until those five cities' preset
  assumptions in `src/lib/proforma.ts` are sourced from real data (each
  would need its own `<city>-proforma.json`, following DC's pattern) — a
  decomposition makes a stronger claim than a single figure and isn't
  defensible on placeholder inputs. It also needs an explicit, stated
  counterfactual for attribution (likely: each input moved to the
  benchmark value, holding all others constant) — state that
  counterfactual directly wherever the visual appears, not just in this
  file.

## Before shipping a change

Run `npx astro check` and `npx astro build`, and actually look at it in a
browser at desktop and mobile widths — several real bugs (SVG gradients on
`fill`, sticky-positioning overlaps, cropped headline text) were only
caught by rendering, not by reading the code.
