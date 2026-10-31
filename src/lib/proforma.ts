import {
  CITY_DATA,
  REQUIRED_SPREAD,
  cityHasPendingFields,
  getCityData,
  type CityInputs,
  type ConstraintType,
} from '../data/cityData';

export type { ConstraintType } from '../data/cityData';

export const UNIT_COUNT = 40;

export interface ProFormaInputs {
  landCost: number; // total acquisition cost, $
  hardCostPerUnit: number; // $ per unit
  softCostPct: number; // % of land + hard cost
  permitMonths: number; // entitlement-phase months (land carry only)
  constructionMonths: number; // construction-phase months (draw carry)
  loanRate: number; // annual %
  monthlyRent: number; // $ per unit per month
  opexRatio: number; // % of effective gross income
  vacancyPct: number; // % vacancy & credit loss
  exitCap: number; // %
}

export interface ProFormaResult {
  totalHardCost: number;
  totalSoftCost: number;
  entitlementCarry: number; // interest on land only, during permitMonths
  constructionCarry: number; // interest on ~50% drawn balance, during constructionMonths
  carryingCost: number; // entitlementCarry + constructionCarry
  totalDevCost: number;
  grossAnnualIncome: number; // gross potential rent, no vacancy applied
  effectiveGrossIncome: number; // grossAnnualIncome after vacancy & credit loss
  noi: number;
  returnOnCost: number; // %
  stabilizedValue: number;
  clearsThreshold: boolean;
  marginPct: number; // returnOnCost - requiredReturnPct
}

/**
 * Carrying cost is modeled in two phases rather than one flat charge
 * against the full loan balance for the whole timeline:
 *
 * - Entitlement (permitMonths): only land is owned and carried; nothing
 *   has been drawn for construction yet.
 * - Construction (constructionMonths): hard and soft costs draw down
 *   over the build, so interest is charged on the average outstanding
 *   balance, approximated at 50% of (hard + soft) — not the full amount.
 *
 * Conflating the two phases (charging interest on the full balance for
 * the entire permit + construction timeline) overstates what regulatory
 * delay actually costs, since most of the loan isn't drawn during
 * entitlement.
 */
export function calculateProForma(
  inputs: ProFormaInputs,
  requiredReturnPct = 0
): ProFormaResult {
  const totalHardCost = inputs.hardCostPerUnit * UNIT_COUNT;
  const totalSoftCost = (inputs.landCost + totalHardCost) * (inputs.softCostPct / 100);

  const monthlyRate = inputs.loanRate / 100 / 12;
  const entitlementCarry = inputs.landCost * monthlyRate * inputs.permitMonths;
  const constructionCarry =
    (totalHardCost + totalSoftCost) * 0.5 * monthlyRate * inputs.constructionMonths;
  const carryingCost = entitlementCarry + constructionCarry;

  const totalDevCost = inputs.landCost + totalHardCost + totalSoftCost + carryingCost;

  const grossAnnualIncome = inputs.monthlyRent * UNIT_COUNT * 12;
  const effectiveGrossIncome = grossAnnualIncome * (1 - inputs.vacancyPct / 100);
  const noi = effectiveGrossIncome * (1 - inputs.opexRatio / 100);

  const returnOnCost = totalDevCost > 0 ? (noi / totalDevCost) * 100 : 0;
  const stabilizedValue = inputs.exitCap > 0 ? noi / (inputs.exitCap / 100) : 0;

  return {
    totalHardCost,
    totalSoftCost,
    entitlementCarry,
    constructionCarry,
    carryingCost,
    totalDevCost,
    grossAnnualIncome,
    effectiveGrossIncome,
    noi,
    returnOnCost,
    stabilizedValue,
    clearsThreshold: returnOnCost >= requiredReturnPct,
    marginPct: returnOnCost - requiredReturnPct,
  };
}

interface Lever {
  key: string;
  label: string;
  apply: (inputs: ProFormaInputs) => ProFormaInputs;
}

const LEVERS: Lever[] = [
  {
    key: 'permitMonths',
    label: 'Permit timeline',
    apply: (i) => ({ ...i, permitMonths: Math.max(0, i.permitMonths - 4) }),
  },
  {
    key: 'constructionMonths',
    label: 'Construction timeline',
    apply: (i) => ({ ...i, constructionMonths: Math.max(0, i.constructionMonths - 4) }),
  },
  {
    key: 'landCost',
    label: 'Land cost',
    apply: (i) => ({ ...i, landCost: i.landCost * 0.75 }),
  },
  {
    key: 'hardCostPerUnit',
    label: 'Hard construction cost',
    apply: (i) => ({ ...i, hardCostPerUnit: i.hardCostPerUnit * 0.9 }),
  },
  {
    key: 'softCostPct',
    label: 'Soft costs',
    apply: (i) => ({ ...i, softCostPct: Math.max(0, i.softCostPct - 5) }),
  },
  {
    key: 'loanRate',
    label: 'Construction loan rate',
    apply: (i) => ({ ...i, loanRate: Math.max(0, i.loanRate - 2) }),
  },
  {
    key: 'monthlyRent',
    label: 'Achievable rent',
    apply: (i) => ({ ...i, monthlyRent: i.monthlyRent * 1.1 }),
  },
  {
    key: 'opexRatio',
    label: 'Operating expenses',
    apply: (i) => ({ ...i, opexRatio: Math.max(0, i.opexRatio - 5) }),
  },
  {
    key: 'vacancyPct',
    label: 'Vacancy & credit loss',
    apply: (i) => ({ ...i, vacancyPct: Math.max(0, i.vacancyPct - 2) }),
  },
];

export interface DrivingFactor {
  key: string;
  label: string;
  deltaPct: number;
}

/**
 * Sensitivity pass: for each lever, apply a standardized improvement and
 * measure the resulting lift in return on cost. The lever with the largest
 * lift is the current deal's biggest drag — the line item named in the
 * "what kills it here" callout.
 */
export function getDrivingFactor(inputs: ProFormaInputs): DrivingFactor {
  const base = calculateProForma(inputs);

  const scored = LEVERS.map((lever) => {
    const adjusted = calculateProForma(lever.apply(inputs));
    return {
      key: lever.key,
      label: lever.label,
      deltaPct: adjusted.returnOnCost - base.returnOnCost,
    };
  });

  scored.sort((a, b) => b.deltaPct - a.deltaPct);
  return scored[0];
}

export interface CityPreset {
  key: string;
  label: string;
  shortLabel: string;
  isBenchmark?: boolean;
  constraintTypes: ConstraintType[];
  inputs: ProFormaInputs;
  hasPendingFields: boolean;
}

function toProFormaInputs(inputs: CityInputs): ProFormaInputs {
  return {
    landCost: inputs.landCost.value,
    hardCostPerUnit: inputs.hardCostPerUnit.value,
    softCostPct: inputs.softCostPct.value,
    permitMonths: inputs.permitMonths.value,
    constructionMonths: inputs.constructionMonths.value,
    loanRate: inputs.loanRate.value,
    monthlyRent: inputs.monthlyRent.value,
    opexRatio: inputs.opexRatio.value,
    vacancyPct: inputs.vacancyPct.value,
    exitCap: inputs.exitCap.value,
  };
}

/**
 * CITY_PRESETS carries the unwrapped numeric inputs the calculator UI and
 * charts operate on. The full sourcing metadata (source, year, url,
 * status per field) lives in `src/data/cityData.ts` — components that
 * need to render "[SOURCING PENDING]" tags or a sources table import
 * `CITY_DATA` directly rather than this.
 */
export const CITY_PRESETS: CityPreset[] = CITY_DATA.map((city) => ({
  key: city.key,
  label: city.label,
  shortLabel: city.shortLabel,
  isBenchmark: city.isBenchmark,
  constraintTypes: city.constraintTypes,
  inputs: toProFormaInputs(city.inputs),
  hasPendingFields: cityHasPendingFields(city.inputs),
}));

export const DEFAULT_REQUIRED_SPREAD = REQUIRED_SPREAD.value;
export const REQUIRED_SPREAD_IS_PENDING = REQUIRED_SPREAD.status === 'placeholder';
export const REQUIRED_SPREAD_SOURCE = REQUIRED_SPREAD;

/** Each city's required return is derived, not a shared flat number. */
export function getRequiredReturn(exitCap: number, spread = DEFAULT_REQUIRED_SPREAD): number {
  return exitCap + spread;
}

export function getPreset(key: string): CityPreset {
  return CITY_PRESETS.find((p) => p.key === key) ?? CITY_PRESETS[0];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/**
 * Zero-based: the return-on-cost chart is now a single sourced city (D.C.)
 * plus the benchmark, not six clustered placeholder bars, so there's no
 * longer a reason to truncate the axis to exaggerate small differences
 * between bars. Starting at zero lets the bar height itself, and the
 * hatched shortfall above it, read honestly at a glance.
 */
export const CHART_FLOOR_PCT = 0;
export const CHART_CEILING_PCT = 8.5;
export const CHART_GRIDLINES_PCT = [0, 2, 4, 6, 8];

/** 0–1 position within [floor, ceiling], clamped. 0 = floor, 1 = ceiling. */
export function getChartFraction(value: number): number {
  const range = CHART_CEILING_PCT - CHART_FLOOR_PCT;
  return Math.min(1, Math.max(0, (value - CHART_FLOOR_PCT) / range));
}

export const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  regulatory: 'Regulatory',
  capital: 'Capital',
  structural: 'Structural',
  cost: 'Cost-driven',
};

export const CONSTRAINT_COLOR_VARS: Record<ConstraintType, string> = {
  regulatory: 'var(--constraint-regulatory)',
  capital: 'var(--constraint-capital)',
  structural: 'var(--constraint-structural)',
  cost: 'var(--constraint-cost)',
};

export { getCityData };
