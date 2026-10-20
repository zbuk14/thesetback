import { defineCollection, z } from 'astro:content';

const constraintTypes = z.enum(['regulatory', 'capital', 'structural']);

const reports = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      city: z.string(),
      reportNumber: z.string(),
      // 'draft-sourced' added for R-01: every input carries a stated
      // source or methodology note, but several are still ESTIMATE/
      // ASSUMPTION status pending primary-record validation (see the
      // priority queue in dc-proforma.json) — short of 'published'.
      status: z.enum(['published', 'draft-sourced', 'in-progress', 'upcoming']),
      constraintTypes: z.array(constraintTypes).min(1),
      dek: z.string(),
      author: z.string().optional(),
      publishDate: z.date().optional(),
      dataVintage: z.string().optional(),
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),
      // Fixed 5-metric shape used by upcoming stub reports that don't yet
      // have a sourced data file. R-01 (and any report with proFormaData
      // set) renders its scorecard from that JSON's `scorecard` array
      // instead — arbitrary row count, per-row source links.
      scorecard: z
        .object({
          permitsPer1000: z.number().optional(),
          medianApprovalMonths: z.number().optional(),
          vacancyRatePct: z.number().optional(),
          rentToIncomePct: z.number().optional(),
          shareSingleFamilyZonedPct: z.number().optional(),
        })
        .optional(),
      proFormaPreset: z.string().optional(),
      // Filename (no extension) of a sourced data file in src/data/,
      // e.g. "dc-proforma" -> src/data/dc-proforma.json. When set, the
      // report renders the JSON-driven SourcedProForma calculator and
      // sourced scorecard instead of the generic placeholder-preset
      // versions.
      proFormaData: z.string().optional(),
      // Every report is Part 1 of a two-part set. `companion` is the path
      // to Part 2 ("The numbers"); leave it unset until a numbers file
      // exists in src/content/numbers/. See docs/report-template.md.
      part: z.literal(1).default(1),
      companion: z.string().optional(),
    }),
});

// Part 2 of a report: the step-by-step finance walkthrough. It carries no
// city, constraint, status, vintage, date or author of its own. Those are
// read from the parent report (`report` = that report's slug) so there is
// exactly one place to edit them.
const numbers = defineCollection({
  type: 'content',
  schema: z.object({
    report: z.string(),
    title: z.string(),
    dek: z.string(),
    part: z.literal(2),
    companion: z.string().optional(),
  }),
});

export const collections = { reports, numbers };
