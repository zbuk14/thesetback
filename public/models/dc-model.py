"""
The Setback — R-01 Washington, D.C.
Reproducible pro forma. Run: python3 dc-model.py
Every input traces to src/data/dc-proforma.json.

  - Construction interest on AVERAGE DRAWN BALANCE (50% of hard+soft).
  - Entitlement interest on FULL land balance (land acquired in one draw).
  - Property tax solved iteratively (assessed value <- NOI <- tax).
  - Vacancy and credit loss applied to GPR + other income.
"""

UNITS = 40
MIX = {"studio": (10, 484, 1821), "one_br": (22, 697, 2302), "two_br": (8, 996, 3090)}
TOT_NRSF = sum(c * s for c, s, _ in MIX.values())
HURDLE = 0.0650


def proforma(eff=.80, hard_psf=275, park=.50, park_cost=35_000, ent=14, con=18,
             rate=.080, land=2_400_000, rent=2450, vac=.070, other=.03,
             opex_u=9500, soft=.20, cap=.0525, tax_rate=.0085,
             iz_share=.10, iz_rent=1550):
    gsf = TOT_NRSF / eff
    hard = gsf * hard_psf + UNITS * park * park_cost
    soft_c = (land + hard) * soft
    carry = land * rate * (ent / 12) + (hard + soft_c) * rate * (con / 12) * .5
    tdc = land + hard + soft_c + carry
    iz_units = UNITS * iz_share
    gpr = (UNITS - iz_units) * rent * 12 + iz_units * iz_rent * 12
    egi = (gpr * (1 + other)) * (1 - vac)
    opex = opex_u * UNITS
    value = egi / cap
    for _ in range(60):
        tax = value * tax_rate
        noi = egi - opex - tax
        value = noi / cap
    return dict(gsf=gsf, tdc=tdc, egi=egi, noi=noi, value=value,
                roc=noi / tdc, gap_bps=(HURDLE - noi / tdc) * 1e4)


def solve(target, key, lo, hi, increasing=True, **kw):
    """Bisect for the value of `key` that hits `target` ROC.
    increasing=True  -> ROC rises with the input (e.g. rent)
    increasing=False -> ROC falls with the input (e.g. land, cost)"""
    for _ in range(90):
        mid = (lo + hi) / 2
        below = proforma(**{**kw, key: mid})["roc"] < target
        if below == increasing:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


if __name__ == "__main__":
    b = proforma()
    print(f"BASE      ROC {b['roc']:.2%}  TDC ${b['tdc']:,.0f}  NOI ${b['noi']:,.0f} "
          f"VAL ${b['value']:,.0f}  GAP {b['gap_bps']:.0f}bps  V-C ${b['value']-b['tdc']:,.0f}")

    reform = dict(ent=4, park=0, eff=.84, iz_share=0)
    c = proforma(**reform)
    print(f"REFORMED  ROC {c['roc']:.2%}  closes {(c['roc']-b['roc'])*1e4:.0f}bps "
          f"({(c['roc']-b['roc'])/(HURDLE-b['roc']):.0%} of gap); "
          f"{(HURDLE-c['roc'])*1e4:.0f}bps unreachable")

    rent_req = solve(HURDLE, "rent", 2000, 6000, increasing=True, **reform)
    land_res = solve(HURDLE, "land", -6e6, 3e6, increasing=False, **reform)
    print(f"Rent to clear hurdle at reform ceiling: ${rent_req:,.0f}/mo "
          f"({rent_req/2450-1:+.0%} vs achievable)")
    print(f"Residual land value at hurdle:          ${land_res:,.0f} (vs $2,400,000 asking)")
