import { useState } from 'react';
import {
  calculateDcProforma,
  formatBps,
  formatPercent,
  formatUsd,
  type DcInputValues,
} from '../lib/dcProforma';
import cityData from '../data/city-proforma.json';
import './CityProForma.css';

type Status = 'VERIFIED' | 'VERIFIED_RANGE' | 'DERIVED' | 'ESTIMATE' | 'ASSUMPTION' | 'N/A';

interface SourcedField {
  value: number | Record<string, { share: number; nrsf: number }>;
  status: Status;
  source: string;
  url?: string;
  range?: [number, number];
}

interface CityData {
  updated: string;
  shared: Record<string, SourcedField>;
  cities: Record<string, Record<string, unknown>>;
}

const DATA = cityData as unknown as CityData;

const CITY_KEYS = ['dc', 'la', 'det', 'sf', 'nyc', 'mia', 'bench'];
const CITY_SHORT_LABEL: Record<string, string> = {
  dc: 'DC',
  la: 'LA',
  det: 'DET',
  sf: 'SF',
  nyc: 'NYC',
  mia: 'MIA',
  bench: 'BENCH',
};

// The eleven fields a reader can actually drag. Everything else in the
// engine (unit count, mix, efficiency, parking, inclusionary terms,
// property tax, other income) is real, sourced, and held fixed per city
// in the panel below, rather than opened up as a twelfth through
// twentieth slider.
interface SliderSpec {
  id: string;
  label: string;
  sublabel?: string;
  min: number;
  max: number;
  step: number;
  unit: 'usd' | 'usd_psf' | 'percent' | 'percent2' | 'months';
}

const SLIDERS: SliderSpec[] = [
  { id: 'land_cost', label: 'Land cost', min: 200_000, max: 6_000_000, step: 50_000, unit: 'usd' },
  { id: 'hard_cost_psf', label: 'Hard cost per gross SF', min: 150, max: 700, step: 5, unit: 'usd_psf' },
  { id: 'soft_cost_pct', label: 'Soft costs', sublabel: '% of land + hard cost', min: 0.10, max: 0.30, step: 0.01, unit: 'percent' },
  { id: 'entitlement_months', label: 'Entitlement timeline', sublabel: 'land carry only', min: 0, max: 30, step: 1, unit: 'months' },
  { id: 'construction_months', label: 'Construction timeline', sublabel: 'draw period', min: 6, max: 36, step: 1, unit: 'months' },
  { id: 'construction_loan_rate', label: 'Construction loan rate', min: 0.04, max: 0.10, step: 0.0025, unit: 'percent2' },
  { id: 'achievable_rent', label: 'Achievable rent per unit', min: 800, max: 5000, step: 25, unit: 'usd' },
  { id: 'vacancy_credit_loss', label: 'Vacancy & credit loss', sublabel: '% of gross rent', min: 0, max: 0.12, step: 0.005, unit: 'percent' },
  { id: 'opex_per_unit', label: 'Operating expenses per unit', sublabel: 'annual, ex property tax', min: 5000, max: 14_000, step: 250, unit: 'usd' },
  { id: 'exit_cap_rate', label: 'Exit cap rate', min: 0.03, max: 0.09, step: 0.0025, unit: 'percent2' },
  { id: 'developer_spread', label: 'Required spread', sublabel: 'over exit cap', min: 0.005, max: 0.03, step: 0.0025, unit: 'percent2' },
];

// The remaining nine engine inputs: real and sourced, fixed per city.
const ASSUMPTION_IDS = [
  'units',
  'unit_mix',
  'efficiency_ratio',
  'parking_ratio',
  'parking_cost_per_space',
  'iz_set_aside_pct',
  'iz_rent',
  'property_tax_rate',
  'other_income_pct',
];

const ASSUMPTION_LABEL: Record<string, string> = {
  units: 'Units',
  unit_mix: 'Unit mix',
  efficiency_ratio: 'Efficiency ratio',
  parking_ratio: 'Parking ratio',
  parking_cost_per_space: 'Parking cost per space',
  iz_set_aside_pct: 'Inclusionary zoning set-aside',
  iz_rent: 'IZ unit rent',
  property_tax_rate: 'Property tax rate',
  other_income_pct: 'Other income',
};

function formatSliderValue(spec: SliderSpec, value: number): string {
  switch (spec.unit) {
    case 'usd':
    case 'usd_psf':
      return formatUsd(value);
    case 'percent':
      return formatPercent(value, 1);
    case 'percent2':
      return formatPercent(value, 2);
    case 'months':
      return `${value} mo`;
    default:
      return String(value);
  }
}

function formatAssumptionValue(id: string, value: number): string {
  switch (id) {
    case 'units':
      return String(value);
    case 'efficiency_ratio':
      return formatPercent(value, 0);
    case 'parking_ratio':
      return `${value.toFixed(2)}/unit`;
    case 'parking_cost_per_space':
      return formatUsd(value);
    case 'iz_set_aside_pct':
      return formatPercent(value, 0);
    case 'iz_rent':
      return value > 0 ? `${formatUsd(value)}/mo` : 'N/A';
    case 'property_tax_rate':
      return formatPercent(value, 2);
    case 'other_income_pct':
      return formatPercent(value, 0);
    default:
      return String(value);
  }
}

const STATUS_LABEL: Record<Status, string> = {
  VERIFIED: 'Verified',
  VERIFIED_RANGE: 'Verified range',
  DERIVED: 'Derived',
  ESTIMATE: 'Estimate',
  ASSUMPTION: 'Assumption',
  'N/A': 'N/A',
};

function StatusChip({ status, url }: { status: Status; url?: string }) {
  const label = STATUS_LABEL[status];
  const chipClass = `cpf-chip cpf-chip--${status.toLowerCase().replace(/[^a-z]/g, '-')}`;
  if (url) {
    return (
      <a className={chipClass} href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }
  return <span className={chipClass}>{label}</span>;
}

// Merge shared defaults with a city's overrides into one flat field map,
// keyed by field id, each carrying its resolved numeric/object value plus
// whichever metadata (shared or city-specific) actually applies.
function resolveFields(cityKey: string): { field: SourcedField; id: string }[] {
  const city = DATA.cities[cityKey];
  const ids = new Set([...Object.keys(DATA.shared), ...Object.keys(city).filter((k) => k !== 'name' && k !== 'constraint' && k !== 'note')]);
  return Array.from(ids).map((id) => {
    const override = city[id] as SourcedField | undefined;
    const field = override ?? DATA.shared[id];
    return { id, field };
  });
}

function buildInputs(cityKey: string): { inputs: DcInputValues; nrsfPerUnit: number; fieldsById: Record<string, SourcedField> } {
  const resolved = resolveFields(cityKey);
  const fieldsById: Record<string, SourcedField> = {};
  const raw: Record<string, number> = {};
  let mix: Record<string, { share: number; nrsf: number }> | null = null;

  for (const { id, field } of resolved) {
    fieldsById[id] = field;
    if (id === 'unit_mix') {
      mix = field.value as Record<string, { share: number; nrsf: number }>;
    } else {
      raw[id] = field.value as number;
    }
  }

  const nrsfPerUnit = Object.values(mix!).reduce((sum, u) => sum + u.share * u.nrsf, 0);
  return { inputs: raw as unknown as DcInputValues, nrsfPerUnit, fieldsById };
}

export default function CityProForma() {
  const [activeCity, setActiveCity] = useState('dc');
  const base = buildInputs(activeCity);
  const [values, setValues] = useState<DcInputValues>(base.inputs);
  const [nrsfPerUnit, setNrsfPerUnit] = useState(base.nrsfPerUnit);
  const [fieldsById, setFieldsById] = useState(base.fieldsById);

  const [showReconcile] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('reconcile')
  );

  function applyCity(cityKey: string) {
    const next = buildInputs(cityKey);
    setActiveCity(cityKey);
    setValues(next.inputs);
    setNrsfPerUnit(next.nrsfPerUnit);
    setFieldsById(next.fieldsById);
  }

  function updateField(id: string, value: number) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  // One state object, one pure function, called fresh every render.
  const result = calculateDcProforma(values, nrsfPerUnit);
  const units = values.units;
  const costPerUnit = units > 0 ? result.totalDevelopmentCost / units : 0;
  const clears = result.returnOnCost >= result.requiredReturn;
  const mix = fieldsById.unit_mix.value as Record<string, { share: number; nrsf: number }>;
  const cityName = (DATA.cities[activeCity].name as string) ?? activeCity;

  return (
    <div className="cpf">
      <div className="cpf__header">
        <p className="eyebrow">Pro Forma Calculator</p>
        <h3 className="cpf__title">40-Unit Multifamily, Modeled by City</h3>
        <p className="cpf__subtitle">
          One hypothetical building, sized and priced to each city's own
          conditions. Every input carries a source.
        </p>
      </div>

      <div className="cpf__presets" role="group" aria-label="City presets">
        {CITY_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="cpf__preset-btn"
            data-active={activeCity === key}
            data-benchmark={key === 'bench' ? 'true' : undefined}
            onClick={() => applyCity(key)}
          >
            {CITY_SHORT_LABEL[key]}
          </button>
        ))}
      </div>

      <div className="cpf-summary mono">
        <span>{units.toLocaleString()} units</span>
        <span className="cpf-summary__sep">·</span>
        <span>{Math.round(result.grossSf).toLocaleString()} sq ft</span>
        <span className="cpf-summary__sep">·</span>
        <span>{formatUsd(result.totalDevelopmentCost)} total</span>
        <span className="cpf-summary__sep">·</span>
        <span>{formatUsd(costPerUnit)} per unit</span>
      </div>

      <div className="cpf__body">
        <div className="cpf__inputs">
          {SLIDERS.map((spec) => {
            const field = fieldsById[spec.id];
            return (
              <div className="cpf-field" key={spec.id}>
                <div className="cpf-field__label-row">
                  <label htmlFor={`cpf-${spec.id}`}>
                    {spec.label}
                    {spec.sublabel && <span className="cpf-field__sublabel"> · {spec.sublabel}</span>}
                  </label>
                  <span className="cpf-field__value mono">
                    {formatSliderValue(spec, values[spec.id as keyof DcInputValues])}
                  </span>
                </div>
                <input
                  id={`cpf-${spec.id}`}
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={values[spec.id as keyof DcInputValues]}
                  onChange={(e) => updateField(spec.id, Number(e.target.value))}
                />
                <StatusChip status={field.status} url={field.url} />
              </div>
            );
          })}

          <details className="cpf-assumptions" open>
            <summary className="cpf-assumptions__summary">
              <span className="cpf-assumptions__title">City assumptions</span>
              <span className="cpf-assumptions__chevron" aria-hidden="true" />
            </summary>
            <div className="cpf-assumptions__fields">
              <div className="cpf-field">
                <div className="cpf-field__label-row">
                  <label>Unit mix</label>
                </div>
                <dl className="cpf-unit-mix">
                  {Object.entries(mix).map(([key, u]) => (
                    <div className="cpf-unit-mix__row" key={key}>
                      <dt>
                        {(units * u.share).toFixed(1)} × {key.replace('_', '-')}
                      </dt>
                      <dd className="mono">{u.nrsf} SF</dd>
                    </div>
                  ))}
                </dl>
                <StatusChip status={fieldsById.unit_mix.status} url={fieldsById.unit_mix.url} />
              </div>
              {ASSUMPTION_IDS.filter((id) => id !== 'unit_mix').map((id) => {
                const field = fieldsById[id];
                return (
                  <div className="cpf-field" key={id}>
                    <div className="cpf-field__label-row">
                      <label>{ASSUMPTION_LABEL[id]}</label>
                      <span className="cpf-field__value mono">
                        {formatAssumptionValue(id, field.value as number)}
                      </span>
                    </div>
                    <StatusChip status={field.status} url={field.url} />
                  </div>
                );
              })}
            </div>
          </details>
        </div>

        <div className="cpf__outputs">
          <div className="cpf-result">
            <p className="label">Return on cost</p>
            <p className="cpf-result__figure mono" data-pass={clears}>
              {formatPercent(result.returnOnCost)}
            </p>

            <div className="cpf-result__compare">
              <p className="cpf-result__compare-row">
                <span>Earns</span>
                <span className="mono" data-pass={clears}>
                  {formatPercent(result.returnOnCost)}
                </span>
              </p>
              <p className="cpf-result__compare-row">
                <span>Needs</span>
                <span className="mono">{formatPercent(result.requiredReturn)}</span>
              </p>
            </div>

            <div className="cpf-result__bar" aria-hidden="true">
              <div className="cpf-result__bar-track">
                <div
                  className="cpf-result__bar-fill"
                  data-pass={clears}
                  style={{ width: `${Math.min(100, Math.max(4, (result.returnOnCost / 0.10) * 100))}%` }}
                />
                <div
                  className="cpf-result__bar-threshold"
                  style={{ left: `${Math.min(100, (result.requiredReturn / 0.10) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <dl className="cpf-breakdown">
            <div className="cpf-breakdown__row">
              <dt>Total development cost</dt>
              <dd className="mono">{formatUsd(result.totalDevelopmentCost)}</dd>
            </div>
            <div className="cpf-breakdown__row">
              <dt>Of which, entitlement carry (land only)</dt>
              <dd className="mono">{formatUsd(result.entitlementCarry)}</dd>
            </div>
            <div className="cpf-breakdown__row">
              <dt>Of which, construction carry (avg. draw)</dt>
              <dd className="mono">{formatUsd(result.constructionCarry)}</dd>
            </div>
            <div className="cpf-breakdown__row">
              <dt>Effective gross income</dt>
              <dd className="mono">{formatUsd(result.effectiveGrossIncome)}</dd>
            </div>
            <div className="cpf-breakdown__row">
              <dt>Property tax (solved iteratively)</dt>
              <dd className="mono">{formatUsd(result.propertyTax)}</dd>
            </div>
            <div className="cpf-breakdown__row">
              <dt>Stabilized annual NOI</dt>
              <dd className="mono">{formatUsd(result.stabilizedNoi)}</dd>
            </div>
            <div className="cpf-breakdown__row">
              <dt>Implied stabilized value</dt>
              <dd className="mono">{formatUsd(result.impliedStabilizedValue)}</dd>
            </div>
            <div className="cpf-breakdown__row">
              <dt>Value minus cost to build</dt>
              <dd className="mono">{formatUsd(result.valueMinusCost)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {showReconcile && (
        <div className="cpf-reconcile">
          <p className="mono cpf-reconcile__title">Reconciliation (?reconcile) — {cityName}</p>
          <dl className="cpf-reconcile__grid">
            <div><dt>NRSF</dt><dd className="mono">{Math.round(units * nrsfPerUnit).toLocaleString()}</dd></div>
            <div><dt>GSF</dt><dd className="mono">{result.grossSf.toLocaleString(undefined, { maximumFractionDigits: 0 })}</dd></div>
            <div><dt>Hard cost</dt><dd className="mono">{formatUsd(result.hardCost)}</dd></div>
            <div><dt>Soft cost</dt><dd className="mono">{formatUsd(result.softCost)}</dd></div>
            <div><dt>Entitlement carry</dt><dd className="mono">{formatUsd(result.entitlementCarry)}</dd></div>
            <div><dt>Construction carry</dt><dd className="mono">{formatUsd(result.constructionCarry)}</dd></div>
            <div><dt>TDC</dt><dd className="mono">{formatUsd(result.totalDevelopmentCost)}</dd></div>
            <div><dt>EGI</dt><dd className="mono">{formatUsd(result.effectiveGrossIncome)}</dd></div>
            <div><dt>NOI</dt><dd className="mono">{formatUsd(result.stabilizedNoi)}</dd></div>
            <div><dt>Value</dt><dd className="mono">{formatUsd(result.impliedStabilizedValue)}</dd></div>
            <div><dt>Earns</dt><dd className="mono">{formatPercent(result.returnOnCost)}</dd></div>
            <div><dt>Needs</dt><dd className="mono">{formatPercent(result.requiredReturn)}</dd></div>
            <div><dt>Gap</dt><dd className="mono">{formatBps(result.gapBps)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
