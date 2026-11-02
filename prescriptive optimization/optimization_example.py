"""Run personalized household/product discounts with synthetic demand only."""

import pandas as pd

from pricing import optimize_discounts
from pricing.synthetic_demand import synthetic_constant_elasticity_demand


def main() -> None:
    units = pd.DataFrame(
        {
            "unit_id": [
                "household-101/product-a",
                "household-101/product-b",
                "household-205/product-a",
            ],
            "household_id": [101, 101, 205],
            "product_id": ["product-a", "product-b", "product-a"],
            "price": [20.0, 35.0, 20.0],
            "max_discount": [5.0, 8.0, 5.0],
            "min_supported_price": [16.0, 30.0, 16.0],
            "baseline_demand": [2.0, 1.2, 0.8],
            "reference_price": [20.0, 35.0, 20.0],
            "price_elasticity": [1.4, 1.8, 0.9],
        }
    )
    result = optimize_discounts(
        units,
        budget=10.0,
        demand_predictor=synthetic_constant_elasticity_demand,
    )
    if not result.success:
        raise RuntimeError(f"Optimization failed ({result.status}): {result.message}")

    print(result.allocation.to_string(index=False))
    print(f"\nPredicted revenue (synthetic): {result.total_revenue:.2f}")
    print(f"Discount expenditure: {result.total_discount_expenditure:.2f}")
    print(f"Remaining budget: {result.remaining_budget:.2f}")
    print(f"Solver: {result.message}")
    print("Each decision is a household/product offer.")
    print("Predictions are synthetic and are not project model estimates.")


if __name__ == "__main__":
    main()
