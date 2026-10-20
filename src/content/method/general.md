---
kind: general
title: Method
standfirst: How the numbers are built, where every input comes from, and what to check next.
---

Every city report runs on one model. It asks a simple question: if you built a normal apartment building in this city today, would it make money?

The same model powers every calculator on the site, so a city never shows two different numbers on two pages.

## How the model works

### 1. The building

Each city gets one ordinary apartment building, sized and priced to that city's averages. In Washington: 40 apartments, mostly one-bedrooms.

Some of the building can't be rented: hallways, stairs, the lobby, walls. In our model, 80 percent of the floor space is apartments. You pay to build all of it but only collect rent on that 80 percent.

### 2. What it costs

Add up everything spent before the first tenant moves in.

- **Land.** Buying the lot.
- **Construction.** Concrete, steel, wiring, labor. Priced per square foot. This is the biggest cost by far.
- **Parking.** Underground spaces are expensive. Each one costs about as much as a new car.
- **Fees and design.** Architects, engineers, lawyers, permits, insurance. Modeled as 20 percent on top of everything else.
- **Interest while waiting for approval.** Only the land has been bought at this point, so this is small.
- **Interest while building.** The construction loan is drawn a little at a time, like a credit card filling up over 18 months. On average about half is borrowed at any moment, so interest is charged on half.

### 3. What it earns each year

Start with the rent from every apartment, full every month. Then adjust:

- Some apartments must rent cheaply by law (inclusionary zoning).
- Some sit empty between tenants, and some tenants don't pay.
- A little extra comes in from laundry, storage and fees.

That leaves the money that actually comes in. Subtract the cost of running the building (staff, repairs, insurance) and property tax.

What's left is the building's **yearly profit**, before paying back any loans. Real estate calls this **net operating income**, or **NOI**.

Property tax is a small loop. The tax depends on what the building is worth, and what it's worth depends on its profit after tax. The model solves the loop directly.

### 4. What it's worth

Buyers price buildings by their yearly profit, the same way you might value a business. In Washington right now, buyers pay about $100 for every $5.25 of yearly profit. That ratio, 5.25 percent, is called the **cap rate**. Think of it as the interest rate the building pays its owner.

Building value = yearly profit ÷ cap rate.

If the building is worth less than it cost, it loses money the day it opens.

### 5. Does it clear the bar?

The main test is **return on cost**: yearly profit divided by what it cost to build. It's the building's interest rate on the money spent.

Building something new is riskier than buying a finished building. Construction runs late, costs run over, apartments take time to fill. So builders want more than the cap rate. We add 1.25 percentage points on top as the reward for that risk.

In Washington the bar is 5.25 + 1.25 = **6.50 percent**. If a building earns less, investors put their money somewhere safer.

### 6. Testing fixes

To measure a policy, we change one input and rerun the model. Removing parking requirements, dropping the affordable-unit rule, cutting the approval timeline, removing property tax. Each test shows how far that fix moves the building toward the bar.

Fixes don't add up neatly. Removing parking also removes the fees and interest stacked on top of it, so combining fixes isn't simple addition. Combined packages are run together, never summed.

### 7. Turning the question around

We also run the model backward. Given what the building earns, what is the most a builder could pay for the land and still clear the bar? This is called **residual land value**.

When that number is below zero, the building fails even with free land. Any argument about land prices stops mattering.

## Simplifications

Every model simplifies. Ours are chosen so that each one makes the building look **better** than reality. If the building fails under generous assumptions, it fails under real ones.

- **No interest on land during construction.** In reality, money tied up in land keeps costing something during the build. Leaving it out understates cost.
- **No fill-up period.** The model assumes the building is full the day it opens. Real buildings take months to lease.
- **No developer fee.** Builders usually pay themselves a fee. We leave it out.
- **Sold at today's prices.** We assume buyers keep paying today's cap rate. If prices fall, the result gets worse.

One choice cuts the other way and is worth naming: fees and design costs are calculated on land plus construction. Some models leave land out of that base.
