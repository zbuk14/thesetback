import {
  CITY_PRESETS,
  CHART_GRIDLINES_PCT,
  CONSTRAINT_COLOR_VARS,
  calculateProForma,
  formatPct,
  getChartFraction,
  getRequiredReturn,
} from '../lib/proforma';
import dcData from '../data/dc-proforma.json';
import './ReturnOnCostChart.css';

// viewBox geometry
const W = 900;
const H = 340;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 58;
const MARGIN_LEFT = 34;
const MARGIN_RIGHT = 16;
const PLOT_X0 = MARGIN_LEFT;
const PLOT_X1 = W - MARGIN_RIGHT;
const PLOT_Y0 = MARGIN_TOP;
const PLOT_Y1 = H - MARGIN_BOTTOM;
const PLOT_WIDTH = PLOT_X1 - PLOT_X0;
const PLOT_HEIGHT = PLOT_Y1 - PLOT_Y0;

function yFor(value: number) {
  return PLOT_Y1 - getChartFraction(value) * PLOT_HEIGHT;
}

// Three equal slots: D.C., an empty gap carrying the separator rule, and
// the benchmark. D.C.'s number comes straight from dc-proforma.json — the
// one sourced model in the codebase — not from the generic placeholder
// preset system, which is what caused the home page to disagree with the
// report in the first place.
const SLOT_WIDTH = PLOT_WIDTH / 3;
const BAR_WIDTH = Math.min(150, SLOT_WIDTH * 0.55);
const DC_CENTER = PLOT_X0 + 0.5 * SLOT_WIDTH;
const GAP_CENTER = PLOT_X0 + 1.5 * SLOT_WIDTH;
const BENCH_CENTER = PLOT_X0 + 2.5 * SLOT_WIDTH;

const dcRoc = dcData.outputs.return_on_cost * 100;
const dcRequired = dcData.outputs.required_return * 100;
const dcGapBps = dcData.outputs.gap_bps;
const dcColor = CONSTRAINT_COLOR_VARS.regulatory;

const benchmarkPreset = CITY_PRESETS.find((p) => p.isBenchmark)!;
const benchmarkRequired = getRequiredReturn(benchmarkPreset.inputs.exitCap);
const benchmarkResult = calculateProForma(benchmarkPreset.inputs, benchmarkRequired);

export default function ReturnOnCostChart() {
  const dcTop = yFor(dcRoc);
  const dcReqY = yFor(dcRequired);
  const benchTop = yFor(benchmarkResult.returnOnCost);
  const benchReqY = yFor(benchmarkRequired);

  return (
    <div className="roc-chart" data-reveal>
      <div className="roc-chart__header">
        <p className="eyebrow">Return on Cost</p>
        <h3 className="roc-chart__title">
          Washington, D.C. against the return it needs, and against a market with none of this
          publication's frictions.
        </h3>

        <div className="roc-chart__legend" role="list" aria-label="Chart key">
          <span className="roc-chart__legend-item" role="listitem">
            <span className="roc-chart__legend-swatch" style={{ background: dcColor }} aria-hidden="true" />
            <span className="mono">Regulatory constraint</span>
          </span>
          <span className="roc-chart__legend-item" role="listitem">
            <span className="roc-chart__legend-swatch roc-chart__legend-swatch--outline" aria-hidden="true" />
            <span className="mono">Frictionless baseline</span>
          </span>
        </div>
      </div>

      <svg
        className="roc-chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Washington D.C. return on cost ${formatPct(dcRoc, 2)} against a required return of ${formatPct(
          dcRequired,
          2
        )}, a shortfall of ${dcGapBps} basis points. Benchmark return on cost ${formatPct(
          benchmarkResult.returnOnCost,
          1
        )} against a required return of ${formatPct(benchmarkRequired, 2)}, which it clears.`}
      >
        <defs>
          <pattern id="roc-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke={dcColor} strokeWidth="2" opacity="0.4" />
          </pattern>
        </defs>

        {CHART_GRIDLINES_PCT.map((g) => {
          const y = yFor(g);
          const isBaseline = g === CHART_GRIDLINES_PCT[0];
          return (
            <g key={g}>
              <line
                x1={PLOT_X0}
                x2={PLOT_X1}
                y1={y}
                y2={y}
                className={isBaseline ? 'roc-chart__baseline' : 'roc-chart__gridline'}
              />
              <text x={PLOT_X0 - 8} y={y} className="roc-chart__axis-label" textAnchor="end">
                {g}%
              </text>
            </g>
          );
        })}

        <line x1={GAP_CENTER} x2={GAP_CENTER} y1={PLOT_Y0} y2={PLOT_Y1} className="roc-chart__separator" />

        {/* D.C. — sourced. Bar to its actual return, cap at its actual
            required return, hatch filling the shortfall between them. */}
        <rect
          x={DC_CENTER - BAR_WIDTH / 2}
          y={dcTop}
          width={BAR_WIDTH}
          height={Math.max(0, PLOT_Y1 - dcTop)}
          rx="2"
          className="roc-chart__bar"
          style={{ fill: dcColor }}
        />
        <rect
          x={DC_CENTER - BAR_WIDTH / 2}
          y={dcReqY}
          width={BAR_WIDTH}
          height={Math.max(0, dcTop - dcReqY)}
          fill="url(#roc-hatch)"
        />
        <line
          x1={DC_CENTER - BAR_WIDTH / 2}
          x2={DC_CENTER + BAR_WIDTH / 2}
          y1={dcReqY}
          y2={dcReqY}
          className="roc-chart__cap"
        />
        <text x={DC_CENTER} y={dcTop - 10} className="roc-chart__value-label" textAnchor="middle">
          {formatPct(dcRoc, 2)}
        </text>
        <text x={DC_CENTER} y={dcReqY - 10} className="roc-chart__req-label" textAnchor="middle">
          Required {formatPct(dcRequired, 2)}
        </text>
        <text x={DC_CENTER} y={PLOT_Y1 + 22} className="roc-chart__bar-label" textAnchor="middle">
          Washington, D.C.
        </text>
        <text x={DC_CENTER} y={PLOT_Y1 + 38} className="roc-chart__gap-label" textAnchor="middle">
          −{dcGapBps} bps
        </text>

        {/* Benchmark — outline only, no fill, and no shortfall to hatch
            because it clears its own required return. */}
        <rect
          x={BENCH_CENTER - BAR_WIDTH / 2}
          y={benchTop}
          width={BAR_WIDTH}
          height={Math.max(0, PLOT_Y1 - benchTop)}
          rx="2"
          className="roc-chart__bar-outline"
        />
        <line
          x1={BENCH_CENTER - BAR_WIDTH / 2}
          x2={BENCH_CENTER + BAR_WIDTH / 2}
          y1={benchReqY}
          y2={benchReqY}
          className="roc-chart__cap roc-chart__cap--muted"
        />
        <text x={BENCH_CENTER} y={benchTop - 10} className="roc-chart__value-label roc-chart__value-label--muted" textAnchor="middle">
          {formatPct(benchmarkResult.returnOnCost, 1)}
        </text>
        <text x={BENCH_CENTER} y={PLOT_Y1 + 22} className="roc-chart__bar-label roc-chart__bar-label--muted" textAnchor="middle">
          Baseline
        </text>
      </svg>

      <div className="roc-chart__explainer">
        <p className="mono roc-chart__explainer-label">How to Read This</p>
        <p className="roc-chart__explainer-text">
          Return on cost is what a finished building earns each year, divided by what it cost to
          build. The number alone means little. What matters is how it compares to the rate that
          finished buildings of the same type actually trade at. That difference is the value a
          developer creates by building rather than buying. Ground-up apartments generally need at
          least 1.25 percentage points of cushion to attract investors. So the threshold here is the
          rate D.C. buildings trade at, plus 1.25 points. The hatched area is how far short it falls.
          Below the line, the money goes somewhere else. The baseline on the right is the same
          building with none of the frictions this publication studies: cheap land, fast permits,
          cheap debt.
        </p>
      </div>
    </div>
  );
}
