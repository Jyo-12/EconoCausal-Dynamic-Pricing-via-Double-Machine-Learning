import pytest
from pydantic import ValidationError

from main import app
from pricing.routes import OptimizationRequest, optimize


@pytest.fixture
def payload():
    return {
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
                "price_elasticity": 1.4,
                "min_supported_price": 16.0,
            },
            {
                "household_id": 101,
                "product_id": "p2",
                "price": 35.0,
                "max_discount": 8.0,
                "baseline_demand": 45.0,
                "reference_price": 35.0,
                "price_elasticity": 1.8,
                "min_supported_price": 30.0,
            },
        ],
    }


def test_optimizer_route_is_registered():
    assert "post" in app.openapi()["paths"]["/api/optimize"]


def test_demo_endpoint_returns_household_product_allocations(payload):
    request = OptimizationRequest.model_validate(payload)

    response = optimize(request)

    assert response.success
    assert response.prediction_mode == "synthetic_demo"
    assert "Synthetic demo only" in response.warning
    assert response.budget_satisfied
    assert response.total_discount_expenditure <= response.budget + 1e-6
    assert [
        (row.household_id, row.product_id)
        for row in response.allocation
    ] == [(101, "p1"), (101, "p2")]
    assert all(row.recommended_price > 0 for row in response.allocation)


@pytest.mark.parametrize(
    ("change", "message"),
    [
        ({"budget": -1}, "budget"),
        ({"prediction_mode": "production"}, "prediction_mode"),
    ],
)
def test_request_validation_rejects_unsupported_inputs(payload, change, message):
    payload.update(change)

    with pytest.raises(ValidationError, match=message):
        OptimizationRequest.model_validate(payload)


def test_request_rejects_duplicate_optimization_units(payload):
    payload["units"].append(payload["units"][0].copy())

    with pytest.raises(ValidationError, match="household/product"):
        OptimizationRequest.model_validate(payload)


def test_request_rejects_partial_historical_price_support(payload):
    payload["units"][1].pop("min_supported_price")

    with pytest.raises(ValidationError, match="for every unit"):
        OptimizationRequest.model_validate(payload)


def test_request_without_historical_price_support_can_run(payload):
    for unit in payload["units"]:
        unit.pop("min_supported_price")
    request = OptimizationRequest.model_validate(payload)

    response = optimize(request)

    assert response.success
    assert response.bounds_satisfied

def test_optimization_response_includes_allocation_matrix(payload):
    request = OptimizationRequest.model_validate(payload)
    response = optimize(request)

    assert response.allocation_matrix is not None

    matrix = response.allocation_matrix
    assert matrix.household_ids == [101]
    assert matrix.product_ids == ["p1", "p2"]
    assert len(matrix.values) == 1
    assert len(matrix.values[0]) == 2

    for column_index, product_id in enumerate(matrix.product_ids):
        allocation_row = next(
            row
            for row in response.allocation
            if row.product_id == product_id
        )
        assert matrix.values[0][column_index] == pytest.approx(
            allocation_row.recommended_discount
        )


def test_optimization_matrix_represents_missing_pairs_as_null(payload):
    payload["units"][1]["household_id"] = 102

    request = OptimizationRequest.model_validate(payload)
    response = optimize(request)

    assert response.allocation_matrix is not None

    matrix = response.allocation_matrix
    assert matrix.household_ids == [101, 102]
    assert matrix.product_ids == ["p1", "p2"]
    assert len(matrix.values) == 2
    assert all(len(row) == 2 for row in matrix.values)

    # Only (101, p1) and (102, p2) were supplied.
    assert matrix.values[0][1] is None
    assert matrix.values[1][0] is None
