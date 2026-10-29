"""API contract for synthetic personalized-discount demonstrations."""

from __future__ import annotations

from typing import Literal

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .allocation_matrix import build_allocation_matrix
from .optimizer import optimize_discounts
from .synthetic_demand import synthetic_constant_elasticity_demand

router = APIRouter(prefix="/api", tags=["optimization"])


class OptimizationUnitInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    household_id: str | int
    product_id: str = Field(min_length=1)
    price: float = Field(gt=0, allow_inf_nan=False)
    max_discount: float = Field(ge=0, allow_inf_nan=False)
    baseline_demand: float = Field(ge=0, allow_inf_nan=False)
    reference_price: float = Field(gt=0, allow_inf_nan=False)
    price_elasticity: float = Field(ge=0, allow_inf_nan=False)
    min_supported_price: float | None = Field(
        default=None, gt=0, allow_inf_nan=False
    )

    @model_validator(mode="after")
    def validate_discount_and_support(self) -> OptimizationUnitInput:
        if self.max_discount >= self.price:
            raise ValueError("max_discount must be less than price.")

        if (
            self.min_supported_price is not None
            and self.min_supported_price > self.price
        ):
            raise ValueError("min_supported_price cannot exceed price.")

        return self


class OptimizationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prediction_mode: Literal["synthetic_demo"]
    budget: float = Field(ge=0, allow_inf_nan=False)
    units: list[OptimizationUnitInput] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unit_keys_and_price_support(self) -> OptimizationRequest:
        keys = [
            (str(unit.household_id), unit.product_id)
            for unit in self.units
        ]

        if len(set(keys)) != len(keys):
            raise ValueError(
                "Each household/product optimization unit must be unique."
            )

        support_values = [
            unit.min_supported_price is not None
            for unit in self.units
        ]

        if any(support_values) and not all(support_values):
            raise ValueError(
                "Provide min_supported_price for every unit "
                "or omit it for every unit."
            )

        return self


class OptimizationUnitOutput(BaseModel):
    household_id: str | int
    product_id: str
    original_price: float
    recommended_discount: float
    recommended_price: float
    predicted_demand: float
    predicted_revenue: float
    discount_expenditure: float


class AllocationMatrixOutput(BaseModel):
    household_ids: list[str | int]
    product_ids: list[str]
    values: list[list[float | None]]


class OptimizationResponse(BaseModel):
    prediction_mode: Literal["synthetic_demo"]
    warning: str
    success: bool
    status: str
    message: str
    budget: float
    total_revenue: float | None
    total_discount_expenditure: float | None
    remaining_budget: float | None
    budget_satisfied: bool
    bounds_satisfied: bool
    objective_value: float | None
    iterations: int | None
    function_evaluations: int | None
    solver_status: int | None
    allocation: list[OptimizationUnitOutput]
    allocation_matrix: AllocationMatrixOutput | None


@router.post("/optimize", response_model=OptimizationResponse)
def optimize(request: OptimizationRequest) -> OptimizationResponse:
    """Optimize discounts using explicitly supplied synthetic demand inputs."""
    unit_records = [unit.model_dump() for unit in request.units]
    contexts = pd.DataFrame(unit_records)

    if request.units[0].min_supported_price is None:
        contexts = contexts.drop(columns="min_supported_price")

    contexts.insert(
        0,
        "unit_id",
        [
            f"{unit.household_id}:{unit.product_id}"
            for unit in request.units
        ],
    )

    try:
        result = optimize_discounts(
            data=contexts,
            budget=request.budget,
            demand_predictor=synthetic_constant_elasticity_demand,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    allocation: list[OptimizationUnitOutput] = []

    if result.allocation is not None:
        for index, row in result.allocation.iterrows():
            unit = request.units[index]

            allocation.append(
                OptimizationUnitOutput(
                    household_id=unit.household_id,
                    product_id=unit.product_id,
                    original_price=float(row["original_price"]),
                    recommended_discount=float(
                        row["recommended_discount"]
                    ),
                    recommended_price=float(row["recommended_price"]),
                    predicted_demand=float(row["predicted_demand"]),
                    predicted_revenue=float(row["predicted_revenue"]),
                    discount_expenditure=float(
                        row["discount_expenditure"]
                    ),
                )
            )

    # Build the household-by-product matrix from the final allocation.
    # Missing pairs remain null; explicitly assigned zero discounts remain 0.0.
    allocation_matrix = None

    if allocation:
        matrix_input = pd.DataFrame(
            [
                {
                    "household_id": row.household_id,
                    "product_id": row.product_id,
                    "recommended_discount": row.recommended_discount,
                }
                for row in allocation
            ]
        )

        matrix = build_allocation_matrix(matrix_input)

        allocation_matrix = AllocationMatrixOutput(
            household_ids=matrix.index.tolist(),
            product_ids=matrix.columns.tolist(),
            values=[
                [
                    None if pd.isna(value) else float(value)
                    for value in row
                ]
                for row in matrix.to_numpy(dtype=object).tolist()
            ],
        )

    return OptimizationResponse(
        prediction_mode="synthetic_demo",
        warning=(
            "Synthetic demo only: demand responses are supplied synthetic "
            "assumptions, not project data or causal model predictions."
        ),
        success=result.success,
        status=result.status,
        message=result.message,
        budget=result.budget,
        total_revenue=result.total_revenue,
        total_discount_expenditure=result.total_discount_expenditure,
        remaining_budget=result.remaining_budget,
        budget_satisfied=result.budget_satisfied,
        bounds_satisfied=result.bounds_satisfied,
        objective_value=result.objective_value,
        iterations=result.iterations,
        function_evaluations=result.function_evaluations,
        solver_status=result.solver_status,
        allocation=allocation,
        allocation_matrix=allocation_matrix,
    )