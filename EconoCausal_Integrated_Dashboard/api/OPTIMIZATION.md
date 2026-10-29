# Discount optimization foundation

The optimizer allocates a discount to each supplied decision unit to maximize
predicted revenue subject to a total marketing budget. For the Week 3
personalization prototype, each decision unit is one household/customer-product
offer. It is a reusable backend foundation; the dashboard does not yet expose a
prescription workflow.

For unit \(i\), let \(P_i\) be its current price, \(d_i\) its discount, and
\(Q_i(P_i-d_i)\) the demand predictor's estimate at the candidate price. The
optimizer solves:

\[
\max_{0 \leq d_i \leq d_i^{\max}}\sum_i(P_i-d_i)Q_i(P_i-d_i)
\quad\text{subject to}\quad
\sum_i d_iQ_i(P_i-d_i)\leq B.
\]

Inputs are a non-empty pandas DataFrame with positive `price` and
non-negative `max_discount` columns, a non-negative `budget`, and a callable
`demand_predictor(contexts, candidate_prices)`. The predictor must return one
finite, non-negative demand estimate per row. An optional
`min_supported_price` column constrains recommendations to observed price
support. A `unit_id` column is preserved; otherwise the row position is used.

`pricing.optimize_discounts` uses SciPy SLSQP with a feasible zero-discount
starting point, per-unit bounds, and the nonlinear budget inequality. It
independently checks the returned allocation and withholds recommendations if
the solver fails, violates bounds, or exceeds the budget beyond the configured
absolute `tolerance`. SLSQP is a local optimizer and does not guarantee a
global optimum for nonlinear demand responses.

## API demonstration contract

`POST /api/optimize` is currently a **synthetic-demo endpoint only**. Each
decision unit is one household/customer-product offer. Requests must explicitly
set `prediction_mode` to `synthetic_demo` and provide `budget` plus one or more
units with `household_id`, `product_id`, `price`, `max_discount`,
`baseline_demand`, `reference_price`, and `price_elasticity`.
`min_supported_price` is optional but must be provided for all units or none.
Household/product keys must be unique in a request. Successful responses
include those identifiers, per-unit recommendations, totals, remaining budget,
diagnostics, and a synthetic-only warning. The API does not infer price,
baseline demand, or elasticity from uploaded CSVs and does not accept
production prediction mode.

Example request body:

```json
{
  "prediction_mode": "synthetic_demo",
  "budget": 100.0,
  "units": [
    {
      "household_id": 101,
      "product_id": "p1",
      "price": 20.0,
      "max_discount": 5.0,
      "baseline_demand": 100.0,
      "reference_price": 20.0,
      "price_elasticity": 1.4
    }
  ]
}
```

## Demand-model integration and limitations

The current Week 2 causal model estimates the effect of binary mailer/display
exposure on `SALES_VALUE`; it is not a price-response model and does not
estimate demand at alternate prices. The API also does not load a fitted model.
In addition, the project's `PRICE_PROXY` is documented as unvalidated shelf
price. These results cannot be passed off as counterfactual price predictions.

`pricing.synthetic_demand.synthetic_constant_elasticity_demand` is an isolated,
deterministic development-only example:

\[
Q(p)=Q_0(p/P_0)^{-\epsilon}.
\]

It requires `baseline_demand`, `reference_price`, and non-negative
`price_elasticity` columns. This formula and its output are synthetic—not
learned from project data, not causal estimates, and not production
recommendations. The API demo request's demand and elasticity values are
illustrative inputs, not model outputs. Replace the demo endpoint with a
validated fitted price-response model adapter before using the optimizer for
actual prescriptions. Avoid retraining inside the predictor; load/reuse a
fitted model and evaluate only candidate prices.

## Run the synthetic example

From the `EconoCausal_Integrated_Dashboard\api` directory in PowerShell:

```powershell
python -m pip install -r requirements.txt
python -m examples.optimization_example
```

The example's printed allocation is synthetic. The API endpoint is also
synthetic-only and is not yet connected to the Prescription UI. A later UI
change should require a validated model adapter, expose budget/discount
constraints, show the returned feasibility diagnostics, and clearly label
predicted outcomes.

## Tests

Run the unit tests from the same API directory:

```powershell
python -m pip install pytest
python -m pytest
```

The tests cover unconstrained and restricted budgets, zero budget, per-unit
bounds, invalid inputs, predictor calls with candidate prices, deterministic
repeat runs, solver failure, budget infeasibility, and independent revenue and
expenditure totals. Numerical feasibility is checked to the configured
absolute tolerance.
