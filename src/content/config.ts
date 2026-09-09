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
    }),
});

export const collections = { reports };
