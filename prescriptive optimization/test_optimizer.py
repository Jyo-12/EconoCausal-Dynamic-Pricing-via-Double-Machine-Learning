from types import SimpleNamespace

import numpy as np
import pandas as pd
import pytest

import pricing.optimizer as optimizer_module
from pricing import optimize_discounts
from pricing.synthetic_demand import synthetic_constant_elasticity_demand


@pytest.fixture
def units():
    return pd.DataFrame(
        {
            "unit_id": ["a", "b", "c"],
            "price": [20.0, 35.0, 12.0],
            "max_discount": [5.0, 8.0, 3.0],
            "min_supported_price": [16.0, 30.0, 10.0],
            "baseline_demand": [100.0, 45.0, 160.0],
            "reference_price": [20.0, 35.0, 12.0],
            "price_elasticity": [1.4, 1.8, 0.9],
        }
    )


def test_unconstrained_budget_returns_valid_result(units):
    result = optimize_discounts(
        units, 100_000.0, synthetic_constant_elasticity_demand
    )

    assert result.success
    assert result.status == "success"
    assert result.allocation is not None
    assert {
        "unit_id",
        "original_price",
        "recommended_discount",
        "recommended_price",
        "predicted_demand",
        "predicted_revenue",
        "discount_expenditure",
    }.issubset(result.allocation.columns)
    allocation = result.allocation
    assert np.all(allocation["recommended_discount"] >= 0)
    assert np.all(
        allocation["recommended_discount"]
        <= units["max_discount"].to_numpy() + 1e-6
    )
    assert np.all(allocation["recommended_price"] >= units["min_supported_price"])
    assert result.budget_satisfied
    assert result.bounds_satisfied
    assert result.total_discount_expenditure == pytest.approx(
        allocation["discount_expenditure"].sum()
    )
    assert result.total_revenue == pytest.approx(allocation["predicted_revenue"].sum())


def test_restrictive_budget_is_respected(units):
    result = optimize_discounts(
        units, 100.0, synthetic_constant_elasticity_demand
    )

    assert result.success
    assert result.total_discount_expenditure <= 100.0 + 1e-6
    assert result.total_discount_expenditure < 100.0 + 1e-8
    assert np.any(result.allocation["recommended_discount"] > 0)


def test_zero_budget_returns_no_discounts(units):
    result = optimize_discounts(
        units, 0, synthetic_constant_elasticity_demand
    )

    assert result.success
    assert np.all(result.allocation["recommended_discount"] == 0)
    assert result.total_discount_expenditure == 0
    assert result.remaining_budget == 0


def test_zero_maximum_discount_is_respected(units):
    units.loc[1, "max_discount"] = 0
    result = optimize_discounts(
        units, 100.0, synthetic_constant_elasticity_demand
    )

    assert result.success
    assert result.allocation.loc[1, "recommended_discount"] == 0


@pytest.mark.parametrize(
    ("changed", "budget", "message"),
    [
        ({"price": -1}, 10, "price values must be positive"),
        ({}, -1, "budget must be a finite, non-negative number"),
        ({"max_discount": -1}, 10, "max_discount values must be non-negative"),
        ({"price": np.nan}, 10, "'price' must contain only finite values"),
    ],
)
def test_invalid_inputs_are_rejected(units, changed, budget, message):
    if changed:
        column, value = next(iter(changed.items()))
        units.loc[0, column] = value
    with pytest.raises(ValueError, match=message):
        optimize_discounts(units, budget, synthetic_constant_elasticity_demand)


def test_candidate_exceeding_budget_is_not_success(units, monkeypatch):
    def infeasible_solver(**kwargs):
        return SimpleNamespace(
            success=True,
            message="solver reported success",
            x=np.array([4.0, 0.0, 0.0]),
            nit=1,
            nfev=1,
            status=0,
        )

    monkeypatch.setattr(optimizer_module, "minimize", infeasible_solver)
    result = optimize_discounts(
        units, 1.0, synthetic_constant_elasticity_demand
    )

    assert not result.success
    assert result.status == "infeasible_budget"
    assert result.allocation is None
    assert result.total_discount_expenditure > result.budget


def test_unsuccessful_solver_does_not_return_recommendation(units, monkeypatch):
    def failed_solver(**kwargs):
        return SimpleNamespace(
            success=False,
            message="iteration limit reached",
            x=np.zeros(len(units)),
            nit=1000,
            nfev=10,
            status=9,
        )

    monkeypatch.setattr(optimizer_module, "minimize", failed_solver)
    result = optimize_discounts(
        units, 100.0, synthetic_constant_elasticity_demand
    )

    assert not result.success
    assert result.status == "solver_failed"
    assert result.allocation is None
    assert "iteration limit" in result.message


def test_predictor_receives_candidate_prices(units):
    observed_prices = []

    def predictor(contexts, candidate_prices):
        observed_prices.append(candidate_prices.copy())
        return contexts["baseline_demand"].to_numpy() * (
            contexts["price"].to_numpy() / candidate_prices
        )

    result = optimize_discounts(units, 50.0, predictor)

    assert result.success
    assert any(not np.array_equal(prices, units["price"].to_numpy()) for prices in observed_prices)


@pytest.mark.parametrize(
    "predictions",
    [
        np.array([1.0, np.nan, 3.0]),
        np.array([1.0, -1.0, 3.0]),
        np.array([1.0, 2.0]),
    ],
)
def test_invalid_predictor_outputs_are_rejected(units, predictions):
    def predictor(contexts, candidate_prices):
        return predictions

    with pytest.raises(ValueError, match="demand_predictor"):
        optimize_discounts(units, 100.0, predictor)


def test_deterministic_inputs_produce_consistent_allocations(units):
    first = optimize_discounts(
        units, 100.0, synthetic_constant_elasticity_demand
    )
    second = optimize_discounts(
        units, 100.0, synthetic_constant_elasticity_demand
    )

    assert first.success and second.success
    np.testing.assert_allclose(
        first.allocation["recommended_discount"],
        second.allocation["recommended_discount"],
        atol=1e-7,
    )
