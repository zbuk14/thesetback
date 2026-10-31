# Report template: two parts per city

Every city report is two pages.

| | Part 1, the report | Part 2, the numbers |
|---|---|---|
| URL | `/reports/<slug>/` | `/reports/<slug>/numbers/` |
| Reader | Anyone | Readers who want the finance |
| File | `src/content/reports/<slug>.mdx` | `src/content/numbers/<slug>.mdx` |
| Collection | `reports` | `numbers` |
| Template | `src/pages/reports/[slug]/index.astro` | `src/pages/reports/[slug]/numbers.astro` |
| Shell | `src/layouts/ReportLayout.astro` (shared) | same |

A report with no numbers file still works. Part 2 only generates for reports that have one, and the "The numbers" link on the index cards only appears when it exists.

## Single source for metadata

City, report number, constraint, status, data vintage, published date and byline live **only** in the Part 1 frontmatter. Part 2 reads them from the report it points at (`report: <slug>`). Never copy them into the numbers file.

## Part 1 frontmatter (`src/content/reports/<slug>.mdx`)

```yaml
city: "Los Angeles"
reportNumber: "R-02"
status: "published"            # published | draft | draft-sourced | in-progress | upcoming
constraintTypes: ["regulatory"]   # regulatory | capital | structural | cost
dek: "One-line standfirst."
author: "Zachary Boukkouri"
publishDate: 2026-10-01
dataVintage: "2025-2026"
proFormaData: "<slug>-proforma"   # sourced data file in src/data/, drives the scorecard
heroImage: "./<slug>-cover.jpg"
heroImageAlt: "Describe the photo."
part: 1
companion: "/reports/<slug>/numbers"
```

`part` is always `1`. `companion` points at Part 2. Leave it out until the numbers file exists.

## Part 2 frontmatter (`src/content/numbers/<slug>.mdx`)

```yaml
report: "la"                    # slug of the Part 1 report
title: "The numbers behind Los Angeles"
dek: "One-line standfirst."
part: 2
companion: "/reports/la"
```

That is all. No city, number, status, date or byline.

The build fails with a clear message if `report` does not match a file in `src/content/reports/`.

## Part 1 body

Plain prose with `##` section headings (the shell numbers them 01, 02 and so on). Components go in as MDX, with imports at the top of the file:

| Placeholder in draft | Component |
|---|---|
| `<!-- PermitChart -->` | `<PermitCollapseChart />` |
| `<!-- GapChart -->` | `<GapChart />` |

The Supply Scorecard renders above the prose automatically when the report has `proFormaData` (or a `scorecard` block). Do not put it in the body in that case. A report that sets neither (R-02) gets no automatic scorecard, and puts `<SourcedScorecard scorecard={[...]} />` in the body where it belongs. There is no calculator in Part 1.

The last two elements of the body are the call to Part 2. A rule, then one italic paragraph with the link inside it. The shell styles that pair as a call-to-action card:

```md
---

*Want to see how the building's numbers work? [Read the numbers behind this report →](/reports/la/numbers)*
```

Keep it as the last thing in the file. The card selector is `hr:last-of-type + p:last-child`.

## Part 2 body

Step outline, one `##` heading each:

1. **The building.** Unit mix table. Total and rentable square feet.
2. **Step 1: What it costs to build.** Land, hard costs, parking, soft costs, interest (during approval, during construction), total.
3. **Step 2: What it earns each year.** Full rent, affordable units, vacancy, other income, operating costs, property tax, net operating income.
4. **Step 3: What it is worth.** Cap rate. Value = income ÷ cap rate. The gap.
5. **Step 4: Why investors walk away.** Return on cost against the return needed.
6. **Step 5: What each fix is worth.** Faster approvals, the full zoning package, a property tax break. Then the calculator.
7. **Step 6: Why land price does not matter.** The land price that would hit the hurdle.
8. **Inputs and sources.** Every numbers page ends with this section. Write the heading as `<h2 id="inputs">8. Inputs and sources</h2>` (the `id` is required, because the Method page and Part 1 link to `/reports/<slug>/numbers#inputs`). Then the chip legend, the inputs table, "Other sources", "What we're checking next", and "Reproduce it" with the model download. Close the page with `How the model works: [Method →](/method)`.

   The inputs table is generated from the report's manifest by `InputsTable.astro`: `<InputsTable manifest="<slug>-proforma" rows={frontmatter.inputs} />`. List one row per manifest input under `inputs:` in the Part 2 frontmatter (label, source name, optional `decimals` or `suffix`). Values, statuses and URLs come from the manifest. The build fails if an input has no row. Copy `src/content/numbers/dc.mdx`.

Components and markup the shell styles for you:

- `<SourcedProForma client:visible />` goes after Step 5. Keep `client:visible`. For a city other than D.C., point the island at that city's data file.
- A markdown table is styled like the scorecard.
- A `>` blockquote is a worked equation: mono, tinted box, no italics. Use it only for arithmetic.
- A paragraph that starts with bold text (`**Land.**`) reads as a run-in head.
- Source chips are plain spans with the calculator's own classes, so readers recognize them:

```mdx
- <span className="spf-chip spf-chip--verified">Verified</span> taken directly from a published source.
```

Modifiers: `spf-chip--verified`, `spf-chip--verified-range`, `spf-chip--derived`, `spf-chip--estimate`.

The Part 2 page adds the `R-02 · The Numbers` eyebrow, the "← Back to the report" links at the top and bottom, and the meta row. No cover image, no scorecard.

## Writing rules

- Short, plain sentences.
- No em-dashes.
- No basis points in reader-facing text. Use plain percentages.
- Any comparison between levers (tax break vs. zoning, rent vs. cost) must be checked against the model before it is printed. Run the engine in `src/lib/dcProforma.ts` with the one input changed.

## Checklist for a new report

1. Write `src/data/<slug>-proforma.json` and check its outputs against the engine.
2. Write `src/content/reports/<slug>.mdx` (Part 1).
3. Write `src/content/numbers/<slug>.mdx` (Part 2).
4. Add the cover image next to the Part 1 file.
5. Put a line before the call-to-action rule in Part 1: `[How this was built →](/reports/<slug>/numbers#inputs)`.
6. Do not edit the Method page. `/method` is city-free. Its "city by city" cards are generated from `src/content/numbers/`, so the new report appears when its numbers file exists.
7. `npm run build`. Open both pages and `/reports/<slug>/numbers#inputs` at desktop width and at 375px.
8. Confirm the calculator on Part 2 shows the same figures the prose quotes.
