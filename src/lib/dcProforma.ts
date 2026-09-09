/**
 * R-01 Washington, D.C. pro forma math. Mirrors research/dc-model.py and
 * the spec it implements exactly:
 *
 *   - Construction-period interest on the AVERAGE DRAWN BALANCE (50% of
 *     hard + soft), not the full committed amount.
 *   - Entitlement-period interest on the FULL land balance (land is
 *     acquired in a single draw, not drawn down over time).
 *   - Property tax solved iteratively: assessed value is a function of
 *     NOI, and NOI is a function of property tax.
 *   - Vacancy and credit loss applied after other income is added to
 *     gross potential rent.
 *
 * Every input traces to src/data/dc-proforma.json. Do not hand-tune any
 * value here — if a number disagrees with that file's `outputs` block,
 * the bug is in this function, not the data.
 */

export interface DcInputValues {
  units: number;
  efficiency_ratio: number;
  land_cost: number;
  hard_cost_psf: number;
  parking_ratio: number;
  parking_cost_per_space: number;
  soft_cost_pct: number;
  entitlement_months: number;
  construction_months: number;
  construction_loan_rate: number;
  achievable_rent: number;
  iz_set_aside_pct: number;
  iz_rent: number;
  vacancy_credit_loss: number;
  other_income_pct: number;
  opex_per_unit: number;
  property_tax_rate: number;
  exit_cap_rate: number;
  developer_spread: number;
}

export interface DcProformaResult {
  grossSf: number;
  hardCost: number;
  softCost: number;
  entitlementCarry: number;
  constructionCarry: number;
  totalDevelopmentCost: number;
  grossPotentialRent: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  propertyTax: number;
  stabilizedNoi: number;
  impliedStabilizedValue: number;
  returnOnCost: number; // fraction, e.g. 0.0372
  requiredReturn: number; // fraction (hurdle = exit cap + developer spread)
  gapBps: number;
  valueMinusCost: number;
}

const TAX_ITERATIONS = 60;

/**
 * `nrsfPerUnit` is the fixed, unit-mix-weighted net rentable square feet
 * per apartment (studios/one-beds/two-beds blended by their fixed share
 * of the building). Net rentable square footage is `inputs.units *
 * nrsfPerUnit`, computed here rather than passed in pre-multiplied, so
 * dragging the units slider actually moves the building's footprint
 * instead of leaving square footage frozen at whatever the default was.
 */
export function calculateDcProforma(
  inputs: DcInputValues,
  nrsfPerUnit: number
): DcProformaResult {
  const totalNetRentableSf = inputs.units * nrsfPerUnit;
  const grossSf = totalNetRentableSf / inputs.efficiency_ratio;
  const hardCost =
    grossSf * inputs.hard_cost_psf +
    inputs.units * inputs.parking_ratio * inputs.parking_cost_per_space;
  const softCost = (inputs.land_cost + hardCost) * inputs.soft_cost_pct;

  const monthlyRate = inputs.construction_loan_rate / 12;
  const entitlementCarry = inputs.land_cost * monthlyRate * inputs.entitlement_months;
  const constructionCarry =
    (hardCost + softCost) * monthlyRate * inputs.construction_months * 0.5;

  const totalDevelopmentCost =
    inputs.land_cost + hardCost + softCost + entitlementCarry + constructionCarry;

  const izUnits = inputs.units * inputs.iz_set_aside_pct;
  const grossPotentialRent =
    (inputs.units - izUnits) * inputs.achievable_rent * 12 + izUnits * inputs.iz_rent * 12;
  const effectiveGrossIncome =
    grossPotentialRent * (1 + inputs.other_income_pct) * (1 - inputs.vacancy_credit_loss);
  const operatingExpenses = inputs.opex_per_unit * inputs.units;

  let value = effectiveGrossIncome / inputs.exit_cap_rate;
  let propertyTax = 0;
  let stabilizedNoi = 0;
  for (let i = 0; i < TAX_ITERATIONS; i++) {
    propertyTax = value * inputs.property_tax_rate;
    stabilizedNoi = effectiveGrossIncome - operatingExpenses - propertyTax;
    value = stabilizedNoi / inputs.exit_cap_rate;
  }

  const returnOnCost = stabilizedNoi / totalDevelopmentCost;
  const requiredReturn = inputs.exit_cap_rate + inputs.developer_spread;
  const gapBps = (requiredReturn - returnOnCost) * 10_000;

  return {
    grossSf,
    hardCost,
    softCost,
    entitlementCarry,
    constructionCarry,
    totalDevelopmentCost,
    grossPotentialRent,
    effectiveGrossIncome,
    operatingExpenses,
    propertyTax,
    stabilizedNoi,
    impliedStabilizedValue: value,
    returnOnCost,
    requiredReturn,
    gapBps,
    valueMinusCost: value - totalDevelopmentCost,
  };
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatBps(value: number): string {
  return `${Math.round(value)} bps`;
}
