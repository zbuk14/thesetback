import { useState } from 'react';
import {
  calculateDcProforma,
  formatBps,
  formatPercent,
  formatUsd,
  type DcInputValues,
} from '../lib/dcProforma';
import dcData from '../data/dc-proforma.json';
import './SourcedProForma.css';

type Status = 'VERIFIED' | 'VERIFIED_RANGE' | 'DERIVED' | 'ESTIMATE' | 'ASSUMPTION';

interface SliderSpec {
  min: number;
  max: number;
  step: number;
}

interface UnitMixEntry {
  count: number;
  nrsf: number;
  rent: number;
}

interface InputField {
  id: string;
  label: string;
  sublabel?: string;
  value: number | Record<string, UnitMixEntry>;
  unit?: string;
  status: Status;
  source: string;
  url: string | null;
  slider: SliderSpec | null;
  priority?: number;
}

const DATA = dcData as unknown as {
  inputs: InputField[];
};

// Nineteen open sliders is a wall. Grouped into three collapsible
// sections, first one open, so a reader sees the building before the
// assumptions underneath it.
const GROUPS: { title: string; ids: string[] }[] = [
  { title: 'The building', ids: ['units', 'unit_mix', 'efficiency_ratio'] },
  {
    title: 'What it costs',
    ids: [
      'land_cost',
      'hard_cost_psf',
      'parking_ratio',
      'parking_cost_per_space',
      'soft_cost_pct',
      'entitlement_months',
      'construction_months',
      'construction_loan_rate',
    ],
  },
  {
    title: 'What it earns',
    ids: [
      'achievable_rent',
      'iz_set_aside_pct',
      'iz_rent',
      'vacancy_credit_loss',
      'other_income_pct',
      'opex_per_unit',
      'property_tax_rate',
      'exit_cap_rate',
      'developer_spread',
    ],
  },
];

// Two-decimal percent fields read as rates a lender/underwriter quotes to
// the basis point; the rest are conventionally quoted to one decimal.
const TWO_DECIMAL_PERCENT_IDS = new Set([
  'construction_loan_rate',
  'exit_cap_rate',
  'property_tax_rate',
  'developer_spread',
]);

function formatValueForUnit(value: number, unit: string | undefined, id: string): string {
  switch (unit) {
    case 'usd':
    case 'usd_per_sf':
    case 'usd_per_month':
      return formatUsd(value);
    case 'months':
      return `${value} mo`;
    case 'percent':
    case 'percent_of_assessed_value':
      return formatPercent(value, TWO_DECIMAL_PERCENT_IDS.has(id) ? 2 : 1);
    case 'ratio':
      return value.toFixed(2);
    case 'count':
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
};

function StatusChip({ status, url }: { status: Status; url: string | null }) {
  const label = STATUS_LABEL[status];
  const chipClass = `spf-chip spf-chip--${status.toLowerCase().replace('_', '-')}`;
  if (url) {
    return (
      <a className={chipClass} href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }
  return <span className={chipClass}>{label}</span>;
}

const UNIT_TYPE_LABEL: Record<string, string> = {
  studio: 'Studio',
  one_br: 'One-bedroom',
  two_br: 'Two-bedroom',
};

const UNIT_MIX_FIELD = DATA.inputs.find((f) => f.id === 'unit_mix')!;
const UNIT_MIX_DATA = UNIT_MIX_FIELD.value as Record<string, UnitMixEntry>;
const BASE_UNITS = DATA.inputs.find((f) => f.id === 'units')!.value as number;

// Unit mix is stored as fixed shares of the building, not fixed counts,
// so changing the units slider actually moves square footage instead of
// leaving it frozen at the default. Shares and per-type NRSF/rent are
// derived once from the sourced default mix; only the unit COUNT per
// type (and therefore total NRSF) scales with the live units value.
const UNIT_MIX_SHARES = Object.fromEntries(
  Object.entries(UNIT_MIX_DATA).map(([key, u]) => [key, u.count / BASE_UNITS])
) as Record<string, number>;

const NRSF_PER_UNIT = Object.entries(UNIT_MIX_DATA).reduce(
  (sum, [key, u]) => sum + UNIT_MIX_SHARES[key] * u.nrsf,
  0
);

const FIELDS_BY_ID = new Map(DATA.inputs.map((f) => [f.id, f]));

function buildInitialValues(): DcInputValues {
  const values: Record<string, number> = {};
  for (const field of DATA.inputs) {
    if (typeof field.value === 'number') values[field.id] = field.value;
  }
  return values as unknown as DcInputValues;
}

function Field({
  field,
  value,
  onChange,
}: {
  field: InputField;
  value: number;
  onChange: (id: string, value: number) => void;
}) {
  return (
    <div className="spf-field">
      <div className="spf-field__label-row">
        <label htmlFor={`spf-${field.id}`}>
          {field.label}
          {field.sublabel && <span className="spf-field__sublabel"> · {field.sublabel}</span>}
        </label>
        <span className="spf-field__value mono">{formatValueForUnit(value, field.unit, field.id)}</span>
      </div>

      <input
        id={`spf-${field.id}`}
        type="range"
        min={field.slider!.min}
        max={field.slider!.max}
        step={field.slider!.step}
        value={value}
        onChange={(e) => onChange(field.id, Number(e.target.value))}
      />

      <StatusChip status={field.status} url={field.url} />
    </div>
  );
}

function UnitMixPanel({ units }: { units: number }) {
  return (
    <div className="spf-field">
      <div className="spf-field__label-row">
        <label>
          {UNIT_MIX_FIELD.label}
          {UNIT_MIX_FIELD.sublabel && <span className="spf-field__sublabel"> · {UNIT_MIX_FIELD.sublabel}</span>}
        </label>
      </div>
      <dl className="spf-unit-mix">
        {Object.entries(UNIT_MIX_DATA).map(([key, u]) => {
          const count = units * UNIT_MIX_SHARES[key];
          return (
            <div className="spf-unit-mix__row" key={key}>
              <dt>
                {count.toFixed(1)} × {UNIT_TYPE_LABEL[key] ?? key}
              </dt>
              <dd className="mono">
                {u.nrsf} SF · {formatUsd(u.rent)}/mo
              </dd>
            </div>
          );
        })}
      </dl>
      <StatusChip status={UNIT_MIX_FIELD.status} url={UNIT_MIX_FIELD.url} />
    </div>
  );
}

export default function SourcedProForma() {
  const [values, setValues] = useState<DcInputValues>(buildInitialValues);

  // One state object, one pure function, called fresh on every render.
  // No memoization, no parallel calculation path for the summary vs. the
  // readout: every displayed number below comes from this single call.
  const result = calculateDcProforma(values, NRSF_PER_UNIT);

  // Dev-only reconciliation panel: append ?reconcile to the URL to print
  // every intermediate figure against dc-proforma.json's `outputs` block.
  const [showReconcile] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('reconcile')
  );

  function updateField(id: string, value: number) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  const units = values.units;
  const costPerUnit = units > 0 ? result.totalDevelopmentCost / units : 0;
  const clears = result.returnOnCost >= result.requiredReturn;

  return (
    <div className="spf">
      <div className="spf__header">
        <p className="eyebrow">Pro Forma Calculator</p>
        <h3 className="spf__title">40-Unit Apartment Building, Washington, D.C.</h3>
        <p className="spf__subtitle">
          Every input below carries a source. Drag any slider to test the
          model against a different assumption.
        </p>
      </div>

      <div className="spf-summary mono">
        <span>{units.toLocaleString()} units</span>
        <span className="spf-summary__sep">·</span>
        <span>{Math.round(result.grossSf).toLocaleString()} sq ft</span>
        <span className="spf-summary__sep">·</span>
        <span>{formatUsd(result.totalDevelopmentCost)} total</span>
        <span className="spf-summary__sep">·</span>
        <span>{formatUsd(costPerUnit)} per unit</span>
      </div>

      <div className="spf__body">
        <div className="spf__inputs">
          {GROUPS.map((group, i) => (
            <details className="spf-group" key={group.title} open={i === 0}>
              <summary className="spf-group__summary">
                <span className="spf-group__title">{group.title}</span>
                <span className="spf-group__chevron" aria-hidden="true" />
              </summary>
              <div className="spf-group__fields">
                {group.ids.map((id) => {
                  if (id === 'unit_mix') return <UnitMixPanel key={id} units={units} />;
                  const field = FIELDS_BY_ID.get(id)!;
                  return (
                    <Field
                      key={id}
                      field={field}
                      value={values[id as keyof DcInputValues]}
                      onChange={updateField}
                    />
                  );
                })}
              </div>
            </details>
          ))}
        </div>

        <div className="spf__outputs">
          <div className="spf-result">
            <p className="label">Return on cost</p>
            <p className="spf-result__figure mono" data-pass={clears}>
              {formatPercent(result.returnOnCost)}
            </p>

            <div className="spf-result__compare">
              <p className="spf-result__compare-row">
                <span>Earns</span>
                <span className="mono" data-pass={clears}>
                  {formatPercent(result.returnOnCost)}
                </span>
              </p>
              <p className="spf-result__compare-row">
                <span>Needs</span>
                <span className="mono">{formatPercent(result.requiredReturn)}</span>
              </p>
            </div>

            <div className="spf-result__bar" aria-hidden="true">
              <div className="spf-result__bar-track">
                <div
                  className="spf-result__bar-fill"
                  data-pass={clears}
                  style={{ width: `${Math.min(100, Math.max(4, (result.returnOnCost / 0.10) * 100))}%` }}
                />
                <div
                  className="spf-result__bar-threshold"
                  style={{ left: `${Math.min(100, (result.requiredReturn / 0.10) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <dl className="spf-breakdown">
            <div className="spf-breakdown__row">
              <dt>Total development cost</dt>
              <dd className="mono">{formatUsd(result.totalDevelopmentCost)}</dd>
            </div>
            <div className="spf-breakdown__row">
              <dt>Of which, entitlement carry (land only)</dt>
              <dd className="mono">{formatUsd(result.entitlementCarry)}</dd>
            </div>
            <div className="spf-breakdown__row">
              <dt>Of which, construction carry (avg. draw)</dt>
              <dd className="mono">{formatUsd(result.constructionCarry)}</dd>
            </div>
            <div className="spf-breakdown__row">
              <dt>Effective gross income</dt>
              <dd className="mono">{formatUsd(result.effectiveGrossIncome)}</dd>
            </div>
            <div className="spf-breakdown__row">
              <dt>Property tax (solved iteratively)</dt>
              <dd className="mono">{formatUsd(result.propertyTax)}</dd>
            </div>
            <div className="spf-breakdown__row">
              <dt>Stabilized annual NOI</dt>
              <dd className="mono">{formatUsd(result.stabilizedNoi)}</dd>
            </div>
            <div className="spf-breakdown__row">
              <dt>Implied stabilized value</dt>
              <dd className="mono">{formatUsd(result.impliedStabilizedValue)}</dd>
            </div>
            <div className="spf-breakdown__row">
              <dt>Value minus cost to build</dt>
              <dd className="mono">{formatUsd(result.valueMinusCost)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {showReconcile && (
        <div className="spf-reconcile">
          <p className="mono spf-reconcile__title">Reconciliation (?reconcile)</p>
          <dl className="spf-reconcile__grid">
            <div><dt>NRSF</dt><dd className="mono">{Math.round(units * NRSF_PER_UNIT).toLocaleString()}</dd></div>
            <div><dt>GSF</dt><dd className="mono">{result.grossSf.toLocaleString(undefined, { maximumFractionDigits: 0 })}</dd></div>
            <div><dt>Hard cost</dt><dd className="mono">{formatUsd(result.hardCost)}</dd></div>
            <div><dt>Soft cost</dt><dd className="mono">{formatUsd(result.softCost)}</dd></div>
            <div><dt>Entitlement carry</dt><dd className="mono">{formatUsd(result.entitlementCarry)}</dd></div>
            <div><dt>Construction carry</dt><dd className="mono">{formatUsd(result.constructionCarry)}</dd></div>
            <div><dt>TDC</dt><dd className="mono">{formatUsd(result.totalDevelopmentCost)}</dd></div>
            <div><dt>EGI</dt><dd className="mono">{formatUsd(result.effectiveGrossIncome)}</dd></div>
            <div><dt>NOI</dt><dd className="mono">{formatUsd(result.stabilizedNoi)}</dd></div>
            <div><dt>Value</dt><dd className="mono">{formatUsd(result.impliedStabilizedValue)}</dd></div>
            <div><dt>ROC</dt><dd className="mono">{formatPercent(result.returnOnCost)}</dd></div>
            <div><dt>Gap</dt><dd className="mono">{formatBps(result.gapBps)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
