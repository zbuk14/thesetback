import { useEffect, useMemo, useRef, useState } from 'react';
import { getCityData, type CityInputs } from '../data/cityData';
import {
  CITY_PRESETS,
  DEFAULT_REQUIRED_SPREAD,
  REQUIRED_SPREAD_SOURCE,
  calculateProForma,
  formatCurrency,
  formatPct,
  getDrivingFactor,
  getPreset,
  getRequiredReturn,
  type ProFormaInputs,
} from '../lib/proforma';
import './ProFormaCalculator.css';

interface FieldConfig {
  key: keyof ProFormaInputs;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  hint?: string;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'landCost',
    label: 'Land cost',
    min: 200_000,
    max: 8_000_000,
    step: 50_000,
    format: (v) => formatCurrency(v),
  },
  {
    key: 'hardCostPerUnit',
    label: 'Hard cost per unit',
    min: 120_000,
    max: 400_000,
    step: 5_000,
    format: (v) => formatCurrency(v),
  },
  {
    key: 'softCostPct',
    label: 'Soft costs',
    min: 5,
    max: 30,
    step: 0.5,
    format: (v) => formatPct(v),
    hint: '% of land + hard cost',
  },
  {
    key: 'permitMonths',
    label: 'Permit timeline',
    min: 0,
    max: 30,
    step: 1,
    format: (v) => `${v} mo`,
    hint: 'entitlement phase, land carry only',
  },
  {
    key: 'constructionMonths',
    label: 'Construction timeline',
    min: 6,
    max: 36,
    step: 1,
    format: (v) => `${v} mo`,
    hint: 'draw phase, feeds construction carry',
  },
  {
    key: 'loanRate',
    label: 'Construction loan rate',
    min: 4,
    max: 13,
    step: 0.25,
    format: (v) => formatPct(v, 2),
  },
  {
    key: 'monthlyRent',
    label: 'Monthly rent per unit',
    min: 800,
    max: 4500,
    step: 25,
    format: (v) => formatCurrency(v),
  },
  {
    key: 'vacancyPct',
    label: 'Vacancy & credit loss',
    min: 0,
    max: 15,
    step: 0.5,
    format: (v) => formatPct(v),
    hint: '% of gross rent',
  },
  {
    key: 'opexRatio',
    label: 'Operating expense ratio',
    min: 20,
    max: 55,
    step: 1,
    format: (v) => formatPct(v),
    hint: '% of effective gross income',
  },
  {
    key: 'exitCap',
    label: 'Exit cap rate',
    min: 3,
    max: 9,
    step: 0.25,
    format: (v) => formatPct(v, 2),
  },
];

interface Props {
  initialPresetKey?: string;
  showPresetSwitcher?: boolean;
  title?: string;
}

export default function ProFormaCalculator({
  initialPresetKey = 'dc',
  showPresetSwitcher = true,
  title = '40-Unit Multifamily, Modeled by City',
}: Props) {
  const [activePreset, setActivePreset] = useState(initialPresetKey);
  const [inputs, setInputs] = useState<ProFormaInputs>(() => getPreset(initialPresetKey).inputs);
  const [requiredSpread, setRequiredSpread] = useState(DEFAULT_REQUIRED_SPREAD);

  // Tracks which fields are still unsourced placeholders for the *loaded*
  // preset, independent of whatever a reader drags the sliders to — the
  // sourcing status describes the data's provenance, not the current
  // hypothetical value.
  const [cityMeta, setCityMeta] = useState<CityInputs>(() => getCityData(initialPresetKey).inputs);

  // Derived, not stored: the required return is exit cap + spread, so it
  // tracks whichever the reader last moved rather than going stale.
  const requiredReturn = getRequiredReturn(inputs.exitCap, requiredSpread);

  const result = useMemo(
    () => calculateProForma(inputs, requiredReturn),
    [inputs, requiredReturn]
  );

  const drivingFactor = useMemo(
    () => (result.clearsThreshold ? null : getDrivingFactor(inputs)),
    [inputs, result.clearsThreshold]
  );

  // Values ease rather than jump: a brief opacity dip on change, skipped
  // entirely under reduced motion rather than collapsed to an instant flash.
  const [isSettling, setIsSettling] = useState(false);
  const prevRoc = useRef(result.returnOnCost);
  useEffect(() => {
    if (prevRoc.current === result.returnOnCost) return;
    prevRoc.current = result.returnOnCost;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setIsSettling(true);
    const t = setTimeout(() => setIsSettling(false), 160);
    return () => clearTimeout(t);
  }, [result.returnOnCost]);

  function applyPreset(key: string) {
    const preset = getPreset(key);
    setActivePreset(key);
    setInputs(preset.inputs);
    setCityMeta(getCityData(key).inputs);
  }

  function updateField(key: keyof ProFormaInputs, value: number) {
    setActivePreset('custom');
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="pf-calc">
      <div className="pf-calc__header">
        <div>
          <p className="eyebrow">Pro Forma Calculator</p>
          <h3 className="pf-calc__title">{title}</h3>
          <p className="pf-calc__subtitle">
            One hypothetical 40-unit building. Same hard costs, same rent
            structure. Only the local conditions change.
          </p>
        </div>
      </div>

      {showPresetSwitcher && (
        <div className="pf-calc__presets" role="group" aria-label="City presets">
          {CITY_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className="pf-calc__preset-btn"
              data-active={activePreset === preset.key}
              data-benchmark={preset.isBenchmark ? 'true' : undefined}
              onClick={() => applyPreset(preset.key)}
            >
              {preset.shortLabel}
            </button>
          ))}
        </div>
      )}

      <div className="pf-calc__body">
        <div className="pf-calc__inputs">
          {FIELDS.map((field) => (
            <div className="pf-field" key={field.key}>
              <div className="pf-field__label-row">
                <label htmlFor={`pf-${field.key}`}>
                  {field.label}
                  {field.hint && <span className="pf-field__hint"> · {field.hint}</span>}
                </label>
                <span className="pf-field__value mono">{field.format(inputs[field.key])}</span>
              </div>
              <input
                id={`pf-${field.key}`}
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={inputs[field.key]}
                onChange={(e) => updateField(field.key, Number(e.target.value))}
              />
              {cityMeta[field.key].status === 'placeholder' && (
                <p className="pending-flag pf-field__pending">[SOURCING PENDING]</p>
              )}
            </div>
          ))}

          <div className="pf-field pf-field--required-spread">
            <div className="pf-field__label-row">
              <label htmlFor="pf-required-spread">
                Required spread
                <span className="pf-field__hint"> · over exit cap</span>
              </label>
              <span className="pf-field__value mono">{formatPct(requiredSpread, 2)}</span>
            </div>
            <input
              id="pf-required-spread"
              type="range"
              min={0.5}
              max={3}
              step={0.25}
              value={requiredSpread}
              onChange={(e) => setRequiredSpread(Number(e.target.value))}
            />
            <a
              className="pf-field__sourced"
              href={REQUIRED_SPREAD_SOURCE.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              title={REQUIRED_SPREAD_SOURCE.source}
            >
              Sourced
            </a>
            <p className="pf-field__derived">
              Required return = exit cap + spread = <span className="mono">{formatPct(requiredReturn, 2)}</span>
            </p>
          </div>
        </div>

        <div className="pf-calc__outputs" data-settling={isSettling}>
          <div className="pf-result">
            <p className="label">Return on cost</p>
            <p className="pf-result__figure mono" data-pass={result.clearsThreshold}>
              {formatPct(result.returnOnCost, 2)}
            </p>
            <p className="pf-result__verdict" data-pass={result.clearsThreshold}>
              {result.clearsThreshold
                ? `Clears the ${formatPct(requiredReturn, 2)} threshold`
                : `Falls short of the ${formatPct(requiredReturn, 2)} threshold`}
            </p>

            <div className="pf-result__bar" aria-hidden="true">
              <div className="pf-result__bar-track">
                <div
                  className="pf-result__bar-fill"
                  data-pass={result.clearsThreshold}
                  style={{ width: `${Math.min(100, Math.max(4, (result.returnOnCost / 10) * 100))}%` }}
                />
                <div
                  className="pf-result__bar-threshold"
                  style={{ left: `${Math.min(100, (requiredReturn / 10) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {drivingFactor && (
            <div className="pf-callout">
              <p className="label pf-callout__label">What kills it here</p>
              <p className="pf-callout__body">
                <strong>{drivingFactor.label}</strong> is the single largest
                drag on this deal; improving it alone would lift return on
                cost by roughly{' '}
                <strong>{formatPct(Math.abs(drivingFactor.deltaPct), 2)}</strong>.
              </p>
            </div>
          )}

          <dl className="pf-breakdown">
            <div className="pf-breakdown__row">
              <dt>Total development cost</dt>
              <dd className="mono">{formatCurrency(result.totalDevCost)}</dd>
            </div>
            <div className="pf-breakdown__row">
              <dt>Of which, entitlement carry (land only)</dt>
              <dd className="mono">{formatCurrency(result.entitlementCarry)}</dd>
            </div>
            <div className="pf-breakdown__row">
              <dt>Of which, construction carry (avg. draw)</dt>
              <dd className="mono">{formatCurrency(result.constructionCarry)}</dd>
            </div>
            <div className="pf-breakdown__row">
              <dt>Effective gross income</dt>
              <dd className="mono">{formatCurrency(result.effectiveGrossIncome)}</dd>
            </div>
            <div className="pf-breakdown__row">
              <dt>Stabilized annual NOI</dt>
              <dd className="mono">{formatCurrency(result.noi)}</dd>
            </div>
            <div className="pf-breakdown__row">
              <dt>Implied stabilized value</dt>
              <dd className="mono">{formatCurrency(result.stabilizedValue)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
