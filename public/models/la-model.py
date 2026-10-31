"""
R-02 Los Angeles pro forma. The Setback.

Same engine as R-01 (dc-model.py) and the /calculator page. Inputs match
src/data/city-proforma.json -> cities.la exactly, so the article, the numbers
page and the calculator show one set of numbers.

Modeling conventions (same three as R-01):
  1. Construction carry uses the AVERAGE drawn balance (0.5 x hard + soft).
  2. Entitlement carry is on LAND ONLY. Nothing else is spent yet.
  3. Property tax is solved iteratively: tax depends on value, value on NOI,
     NOI on tax.

L.A.-specific addition: Measure ULA. ULA taxes the sale, not the operation,
so it does not touch return on cost. It raises the return the building needs.
If a merchant builder sells at value V and pays rate t on the whole price,
net proceeds are V(1 - t). To keep the same profit margin over cost:
    needed return on cost = (cap + spread) / (1 - t)
ULA is a cliff: the rate applies to the entire price once the threshold is
crossed. Thresholds for sales closing after June 30, 2026: $5.4M (4%) and
$10.9M (5.5%).

Run: python3 la-model.py
"""

MIX = {"studio": (0.25, 484), "one_br": (0.55, 697), "two_br": (0.20, 996)}
WAVG_NRSF = sum(share * sf for share, sf in MIX.values())

ULA_TIERS = [(10_900_000, 0.055), (5_400_000, 0.04)]


def ula_rate(price):
    for threshold, rate in ULA_TIERS:
        if price > threshold:
            return rate
    return 0.0


BASE = dict(
    units=40, eff=0.80, hard_psf=355, park=0.50, park_cost=35_000,
    ent=18, con=28, rate=0.080, land=3_200_000, rent=2750, vac=0.060,
    other=0.03, opex_u=9000, soft=0.20, cap=0.0475, tax=0.0120,
    iz_share=0.10, iz_rent=1500, spread=0.0125,
)


def run(**over):
    p = {**BASE, **over}
    units = p["units"]
    nrsf = units * WAVG_NRSF
    gsf = nrsf / p["eff"]
    hard = gsf * p["hard_psf"] + units * p["park"] * p["park_cost"]
    soft = (p["land"] + hard) * p["soft"]
    ent_carry = p["land"] * p["rate"] * (p["ent"] / 12)
    con_carry = (hard + soft) * p["rate"] * (p["con"] / 12) * 0.5
    tdc = p["land"] + hard + soft + ent_carry + con_carry

    iz_u = units * p["iz_share"]
    gpr = (units - iz_u) * p["rent"] * 12 + iz_u * p["iz_rent"] * 12
    egi = gpr * (1 + p["other"]) * (1 - p["vac"])
    opex = p["opex_u"] * units

    v = egi / p["cap"]
    for _ in range(100):
        tax = v * p["tax"]
        noi = egi - opex - tax
        v = noi / p["cap"]

    hurdle = p["cap"] + p["spread"]
    t = ula_rate(v) if p.get("ula", False) else 0.0
    needs = hurdle / (1 - t)

    # Residual land value: the most a builder could pay for the land and
    # still earn the needed return. Solved by bisection on land.
    return dict(
        gsf=gsf, nrsf=nrsf, land=p["land"], hard=hard, soft=soft,
        ent_carry=ent_carry, con_carry=con_carry, tdc=tdc,
        gpr=gpr, egi=egi, opex=opex, tax=tax, noi=noi, value=v,
        roc=noi / tdc, hurdle=hurdle, ula_rate=t, needs=needs,
        gap=needs - noi / tdc, params=p,
    )


def residual_land(**over):
    lo, hi = -20_000_000, 20_000_000
    for _ in range(200):
        mid = (lo + hi) / 2
        r = run(**{**over, "land": mid})
        if r["roc"] > r["needs"]:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


if __name__ == "__main__":
    b = run()
    print("BASE (matches /calculator)")
    for k in ["gsf", "land", "hard", "soft", "ent_carry", "con_carry", "tdc",
              "gpr", "egi", "opex", "tax", "noi", "value"]:
        print(f"  {k:<10} {b[k]:>14,.0f}")
    print(f"  earns {b['roc']:.2%}  needs {b['needs']:.2%}  gap {b['gap']*100:.2f} pts")
    print(f"  cost per unit ${b['tdc']/40:,.0f}  value per unit ${b['value']/40:,.0f}")
    print(f"  residual land at hurdle ${residual_land():,.0f}")

    u = run(ula=True)
    print(f"\nWITH ULA: sale at ${u['value']:,.0f} -> rate {u['ula_rate']:.1%}, "
          f"tax ${u['value']*u['ula_rate']:,.0f}; needs {u['needs']:.2%}")
    print(f"  residual land with ULA ${residual_land(ula=True):,.0f}")
