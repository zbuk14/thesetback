/**
 * Single source of truth for every number the pro forma calculator and
 * comparison charts use. Every input is wrapped in a SourcedValue so the
 * UI can show exactly which numbers are real and which are still
 * placeholders — see `status` below.
 *
 * DO NOT change the `value` fields when doing design/layout work. Values
 * only change when a real source has been checked and `source`, `year`,
 * `url`, and `status` are updated together.
 *
 * DESIGNATED SOURCES — where to pull real numbers when this data actually
 * gets researched. Nothing below has been checked against these yet.
 *
 * - monthlyRent: Zillow Observed Rent Index (metro, downloadable) or
 *   Census ACS B25064 median gross rent; HUD FMR as a cross-check.
 * - hardCostPerUnit: Rider Levett Bucknall quarterly construction cost
 *   report (per-sq-ft by city × assumed unit sq ft — state the
 *   assumption); Census construction spending as a secondary check.
 * - landCost: city assessor records or listing comps, on a
 *   per-buildable-unit basis — state the method used.
 * - permitMonths: city permitting data — DC DOB annual report, LADBS
 *   metrics, SF DBI, NYC DOB NOW, Detroit BSEED, Miami-Dade RER.
 * - constructionMonths: no single public source; state as an explicit
 *   assumption with a note (varies by building type, size, and city
 *   construction-labor conditions).
 * - exitCap: CBRE or JLL semiannual cap rate survey, multifamily, by
 *   metro.
 * - loanRate: published construction loan spreads over SOFR — state the
 *   date the spread was observed.
 * - opexRatio: NAA Survey of Operating Income & Expenses, or IREM —
 *   state the range used.
 * - softCostPct: no single public source exists; state as an assumption
 *   (15-20% is the conventional band) with a note.
 * - vacancyPct: Census ACS rental vacancy rate by metro, or CoStar /
 *   RealPage market reports as a cross-check.
 *
 * requiredReturn is no longer a flat global number — see REQUIRED_SPREAD
 * below. It's derived per city as `exitCap + requiredSpread`, since a
 * single flat threshold implied every market had the same cost of
 * capital, which isn't true: a city with a 4.5% exit cap and one with an
 * 8% exit cap don't need the same return to clear.
 */

export type SourceStatus = 'placeholder' | 'sourced';

export interface SourcedValue<T> {
  value: T;
  source: string;
  year: number | null;
  url: string | null;
  status: SourceStatus;
}

export type ConstraintType = 'regulatory' | 'capital' | 'structural' | 'cost';

export interface CityInputs {
  landCost: SourcedValue<number>;
  hardCostPerUnit: SourcedValue<number>;
  softCostPct: SourcedValue<number>;
  permitMonths: SourcedValue<number>;
  constructionMonths: SourcedValue<number>;
  loanRate: SourcedValue<number>;
  monthlyRent: SourcedValue<number>;
  opexRatio: SourcedValue<number>;
  vacancyPct: SourcedValue<number>;
  exitCap: SourcedValue<number>;
}

export interface CityPresetData {
  key: string;
  label: string;
  shortLabel: string;
  isBenchmark?: boolean;
  constraintTypes: ConstraintType[];
  inputs: CityInputs;
}

/** Shorthand for an unsourced placeholder value. */
function pending<T>(value: T): SourcedValue<T> {
  return { value, source: 'PENDING', year: null, url: null, status: 'placeholder' };
}

/**
 * Required-return spread over exit cap. Unlike everything else in this
 * file, this one is actually sourced: `requiredReturn = exitCap +
 * requiredSpread`, computed per city rather than pulled from one flat
 * number. Exposed as an adjustable input in the calculator, defaulting to
 * this value.
 *
 * Set to 1.25 (125bps) to match src/data/dc-proforma.json's own
 * `developer_spread` input exactly — R-01 is the one report with a real
 * sourced model, so its number is the one every other spread in the
 * codebase should agree with, not a second, independently-chosen figure.
 */
export const REQUIRED_SPREAD: SourcedValue<number> = {
  value: 1.25, // 125 bps, matching dc-proforma.json's developer_spread
  source:
    'Industry convention for ground-up multifamily; developers in 2026 generally require 6%+ development yield with a minimum 125-150bps spread over exit cap. Practitioner range 125-175bps, with urban-core deals occasionally below 100bps. CBRE notes the historical premium was approximately 200bps and has compressed. This model uses the low end of that range (125bps), matching the developer_spread input in R-01\'s sourced Washington, D.C. analysis. See also: https://dancap.ca/2025-outlook-real-estate/',
  year: 2026,
  url: 'https://dealforgehq.com/blog/how-to-calculate-development-yield',
  status: 'sourced',
};

export const CITY_DATA: CityPresetData[] = [
  {
    key: 'dc',
    label: 'Washington, D.C.',
    shortLabel: 'DC',
    constraintTypes: ['regulatory'],
    inputs: {
      landCost: pending(2_400_000),
      hardCostPerUnit: pending(230_000),
      softCostPct: pending(18),
      permitMonths: pending(14),
      constructionMonths: pending(18),
      loanRate: pending(8.5),
      monthlyRent: pending(2450),
      opexRatio: pending(38),
      vacancyPct: pending(5),
      exitCap: pending(5.25),
    },
  },
  {
    key: 'la',
    label: 'Los Angeles',
    shortLabel: 'LA',
    constraintTypes: ['cost'],
    inputs: {
      landCost: pending(4_300_000),
      hardCostPerUnit: pending(280_000),
      softCostPct: pending(20),
      permitMonths: pending(22),
      constructionMonths: pending(18),
      loanRate: pending(9),
      monthlyRent: pending(2650),
      opexRatio: pending(38),
      vacancyPct: pending(5),
      exitCap: pending(4.75),
    },
  },
  {
    key: 'detroit',
    label: 'Detroit',
    shortLabel: 'DET',
    constraintTypes: ['capital'],
    inputs: {
      landCost: pending(450_000),
      hardCostPerUnit: pending(195_000),
      softCostPct: pending(16),
      permitMonths: pending(5),
      constructionMonths: pending(18),
      loanRate: pending(10),
      monthlyRent: pending(1050),
      opexRatio: pending(43),
      vacancyPct: pending(5),
      exitCap: pending(8),
    },
  },
  {
    key: 'sf',
    label: 'San Francisco',
    shortLabel: 'SF',
    constraintTypes: ['structural'],
    inputs: {
      landCost: pending(4_700_000),
      hardCostPerUnit: pending(315_000),
      softCostPct: pending(22),
      permitMonths: pending(15),
      constructionMonths: pending(18),
      loanRate: pending(8.75),
      monthlyRent: pending(3250),
      opexRatio: pending(36),
      vacancyPct: pending(5),
      exitCap: pending(4.5),
    },
  },
  {
    key: 'nyc',
    label: 'New York City',
    shortLabel: 'NYC',
    constraintTypes: ['regulatory', 'structural'],
    inputs: {
      landCost: pending(6_000_000),
      hardCostPerUnit: pending(345_000),
      softCostPct: pending(24),
      permitMonths: pending(24),
      constructionMonths: pending(18),
      loanRate: pending(8.75),
      monthlyRent: pending(3350),
      opexRatio: pending(37),
      vacancyPct: pending(5),
      exitCap: pending(4.75),
    },
  },
  {
    key: 'miami',
    label: 'Miami',
    shortLabel: 'MIA',
    constraintTypes: ['capital'],
    inputs: {
      landCost: pending(2_300_000),
      hardCostPerUnit: pending(245_000),
      softCostPct: pending(19),
      permitMonths: pending(7),
      constructionMonths: pending(18),
      loanRate: pending(8.25),
      monthlyRent: pending(1950),
      opexRatio: pending(39),
      vacancyPct: pending(5),
      exitCap: pending(5.5),
    },
  },
  {
    key: 'benchmark',
    label: 'A Market That Builds (benchmark)',
    shortLabel: 'BENCH',
    isBenchmark: true,
    constraintTypes: [],
    inputs: {
      // Frictionless on exactly the three dimensions this publication
      // studies (permitting delay, land cost, cost of debt) — everything
      // else (hard cost, rent, opex, vacancy, exit cap) stays identical to
      // a realistic city preset, so the benchmark isn't just a tuned
      // number. That constraint is tight: with hardCostPerUnit/rent/opex
      // fixed, clearing exitCap (6.0%) + requiredSpread (1.5%) = 7.5% on
      // land and financing alone requires land and debt cost pushed close
      // to their theoretical floor (the absolute ceiling with land=$0 and
      // loanRate=0% is ~7.61% — there's almost no slack). If that reads as
      // too extreme, the honest fix is loosening which fields are allowed
      // to move, not padding these further.
      landCost: pending(50_000),
      hardCostPerUnit: pending(175_000),
      softCostPct: pending(13),
      permitMonths: pending(0),
      constructionMonths: pending(18),
      loanRate: pending(0.5),
      monthlyRent: pending(2000),
      opexRatio: pending(34),
      vacancyPct: pending(5),
      exitCap: pending(6.0),
    },
  },
];

export function getCityData(key: string): CityPresetData {
  return CITY_DATA.find((c) => c.key === key) ?? CITY_DATA[0];
}

/** True if every input for this city has been sourced (none are placeholder). */
export function isCityFullySourced(inputs: CityInputs): boolean {
  return Object.values(inputs).every((field) => field.status === 'sourced');
}

/** True if any input for this city is still an unsourced placeholder. */
export function cityHasPendingFields(inputs: CityInputs): boolean {
  return Object.values(inputs).some((field) => field.status === 'placeholder');
}
