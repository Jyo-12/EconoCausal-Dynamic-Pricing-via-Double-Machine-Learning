"""Budget-constrained discount optimization using a supplied demand predictor."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np
import pandas as pd
from numpy.typing import ArrayLike, NDArray
from scipy.optimize import minimize

DemandPredictor = Callable[[pd.DataFrame, NDArray[np.float64]], ArrayLike]


@dataclass(frozen=True)
class OptimizationResult:
    """Optimization outcome and, only on success, its recommended allocation."""

    success: bool
    status: str
    message: str
    allocation: pd.DataFrame | None
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


def _validated_column(data: pd.DataFrame, name: str) -> NDArray[np.float64]:
    try:
        values = data[name].to_numpy(dtype=float)
    except (TypeError, ValueError) as error:
        raise ValueError(f"'{name}' must contain numeric values.") from error
    if not np.all(np.isfinite(values)):
        raise ValueError(f"'{name}' must contain only finite values.")
    return values


def _failure(
    *,
    status: str,
    message: str,
    budget: float,
    total_revenue: float | None = None,
    expenditure: float | None = None,
    objective_value: float | None = None,
    iterations: int | None = None,
    function_evaluations: int | None = None,
    solver_status: int | None = None,
) -> OptimizationResult:
    remaining = budget - expenditure if expenditure is not None else None
    return OptimizationResult(
        success=False,
        status=status,
        message=message,
        allocation=None,
        budget=budget,
        total_revenue=total_revenue,
        total_discount_expenditure=expenditure,
        remaining_budget=remaining,
        budget_satisfied=False,
        bounds_satisfied=False,
        objective_value=objective_value,
        iterations=iterations,
        function_evaluations=function_evaluations,
        solver_status=solver_status,
    )


def optimize_discounts(
    data: pd.DataFrame,
    budget: float,
    demand_predictor: DemandPredictor,
    *,
    tolerance: float = 1e-6,
    max_iterations: int = 1000,
) -> OptimizationResult:
    """Maximize predicted revenue subject to a total discount-spend budget.

    ``data`` must contain positive ``price`` and non-negative ``max_discount``
    columns. An optional positive ``min_supported_price`` column limits the
    discounted price to the observed support for that unit. The predictor
    receives a copy of the input rows and the candidate prices, and must return
    one finite, non-negative demand prediction per row.

    SLSQP is a local optimizer; nonlinear demand functions are not guaranteed
    to yield a global optimum.
    """
    try:
        budget_value = float(budget)
    except (TypeError, ValueError) as error:
        raise ValueError("budget must be a finite, non-negative number.") from error
    if not np.isfinite(budget_value) or budget_value < 0:
        raise ValueError("budget must be a finite, non-negative number.")
    if not np.isfinite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be a finite, positive number.")
    if not isinstance(max_iterations, int) or max_iterations < 1:
        raise ValueError("max_iterations must be a positive integer.")
    if not callable(demand_predictor):
        raise ValueError("demand_predictor must be callable.")
    if not isinstance(data, pd.DataFrame) or data.empty:
        raise ValueError("data must be a non-empty pandas DataFrame.")

    required = {"price", "max_discount"}
    missing = required.difference(data.columns)
    if missing:
        raise ValueError(f"data is missing required columns: {', '.join(sorted(missing))}.")

    contexts = data.copy(deep=True).reset_index(drop=True)
    prices = _validated_column(contexts, "price")
    maximum_discounts = _validated_column(contexts, "max_discount")
    if np.any(prices <= 0):
        raise ValueError("price values must be positive.")
    if np.any(maximum_discounts < 0):
        raise ValueError("max_discount values must be non-negative.")
    if np.any(maximum_discounts >= prices):
        raise ValueError("max_discount must be less than price so discounted prices stay positive.")

    if "min_supported_price" in contexts:
        minimum_prices = _validated_column(contexts, "min_supported_price")
        if np.any(minimum_prices <= 0) or np.any(minimum_prices > prices):
            raise ValueError("min_supported_price must be positive and no greater than price.")
        maximum_discounts = np.minimum(
            maximum_discounts, prices - minimum_prices
        )

    def evaluate(discounts: NDArray[np.float64]) -> tuple[NDArray[np.float64], NDArray[np.float64], NDArray[np.float64]]:
        candidate_discounts = np.asarray(discounts, dtype=float).reshape(-1)
        if candidate_discounts.size != len(contexts) or not np.all(np.isfinite(candidate_discounts)):
            raise ValueError("candidate discounts must be finite and match the number of units.")
        candidate_prices = prices - candidate_discounts
        if np.any(candidate_prices <= 0):
            raise ValueError("candidate discounts must leave every recommended price positive.")

        predictions = np.asarray(
            demand_predictor(contexts, candidate_prices), dtype=float
        ).reshape(-1)
        if predictions.size != len(contexts):
            raise ValueError("demand_predictor must return one prediction per optimization unit.")
        if not np.all(np.isfinite(predictions)) or np.any(predictions < 0):
            raise ValueError("demand_predictor must return finite, non-negative predictions.")

        revenues = candidate_prices * predictions
        expenditures = candidate_discounts * predictions
        if not np.all(np.isfinite(revenues)) or not np.all(np.isfinite(expenditures)):
            raise ValueError("predicted revenue and discount expenditure must be finite.")
        return predictions, revenues, expenditures

    # Validate the baseline predictor response before invoking the numerical solver.
    evaluate(np.zeros(len(contexts), dtype=float))

    def revenue(discounts: NDArray[np.float64]) -> float:
        return float(np.sum(evaluate(discounts)[1]))

    def expenditure(discounts: NDArray[np.float64]) -> float:
        return float(np.sum(evaluate(discounts)[2]))

    initial = np.zeros(len(contexts), dtype=float)
    if budget_value == 0:
        predictions, revenues, expenditures = evaluate(initial)
        return _success_result(
            contexts=contexts,
            prices=prices,
            discounts=initial,
            predictions=predictions,
            revenues=revenues,
            expenditures=expenditures,
            budget=budget_value,
            objective_value=-float(np.sum(revenues)),
            message="Zero budget; returned the feasible no-discount allocation.",
            iterations=0,
            function_evaluations=1,
            solver_status=0,
            tolerance=tolerance,
        )

    solution = minimize(
        fun=lambda discounts: -revenue(discounts),
        x0=initial,
        method="SLSQP",
        bounds=[(0.0, upper) for upper in maximum_discounts],
        constraints={
            "type": "ineq",
            "fun": lambda discounts: budget_value - expenditure(discounts),
        },
        options={"ftol": tolerance, "maxiter": max_iterations},
    )
    iteration_count = getattr(solution, "nit", None)
    evaluation_count = getattr(solution, "nfev", None)
    solver_status = getattr(solution, "status", None)
    if not solution.success:
        return _failure(
            status="solver_failed",
            message=f"SLSQP did not converge: {solution.message}",
            budget=budget_value,
            iterations=iteration_count,
            function_evaluations=evaluation_count,
            solver_status=solver_status,
        )

    discounts = np.asarray(solution.x, dtype=float).reshape(-1)
    if discounts.size != len(contexts) or not np.all(np.isfinite(discounts)):
        return _failure(
            status="invalid_solution",
            message="SLSQP returned non-finite discounts or the wrong number of decisions.",
            budget=budget_value,
            iterations=iteration_count,
            function_evaluations=evaluation_count,
            solver_status=solver_status,
        )
    bounds_satisfied = bool(
        np.all(discounts >= -tolerance)
        and np.all(discounts <= maximum_discounts + tolerance)
    )
    if not bounds_satisfied:
        return _failure(
            status="infeasible_bounds",
            message="SLSQP returned discounts outside the configured bounds.",
            budget=budget_value,
            iterations=iteration_count,
            function_evaluations=evaluation_count,
            solver_status=solver_status,
        )

    # Remove tiny solver-boundary drift before independently checking feasibility.
    discounts = np.clip(discounts, 0.0, maximum_discounts)
    predictions, revenues, expenditures = evaluate(discounts)
    total_revenue = float(np.sum(revenues))
    total_expenditure = float(np.sum(expenditures))
    if total_expenditure > budget_value + tolerance:
        return _failure(
            status="infeasible_budget",
            message=(
                "SLSQP returned a solution that exceeds the budget "
                f"({total_expenditure:.12g} > {budget_value:.12g})."
            ),
            budget=budget_value,
            total_revenue=total_revenue,
            expenditure=total_expenditure,
            objective_value=-total_revenue,
            iterations=iteration_count,
            function_evaluations=evaluation_count,
            solver_status=solver_status,
        )

    return _success_result(
        contexts=contexts,
        prices=prices,
        discounts=discounts,
        predictions=predictions,
        revenues=revenues,
        expenditures=expenditures,
        budget=budget_value,
        objective_value=-total_revenue,
        message=str(solution.message),
        iterations=iteration_count,
        function_evaluations=evaluation_count,
        solver_status=solver_status,
        tolerance=tolerance,
    )


def _success_result(
    *,
    contexts: pd.DataFrame,
    prices: NDArray[np.float64],
    discounts: NDArray[np.float64],
    predictions: NDArray[np.float64],
    revenues: NDArray[np.float64],
    expenditures: NDArray[np.float64],
    budget: float,
    objective_value: float,
    message: str,
    iterations: int | None,
    function_evaluations: int | None,
    solver_status: int | None,
    tolerance: float,
) -> OptimizationResult:
    allocation = pd.DataFrame(
        {
            "unit_id": contexts["unit_id"].to_numpy()
            if "unit_id" in contexts
            else contexts.index.to_numpy(),
            "original_price": prices,
            "recommended_discount": discounts,
            "recommended_price": prices - discounts,
            "predicted_demand": predictions,
            "predicted_revenue": revenues,
            "discount_expenditure": expenditures,
        }
    )
    total_revenue = float(np.sum(revenues))
    total_expenditure = float(np.sum(expenditures))
    return OptimizationResult(
        success=True,
        status="success",
        message=message,
        allocation=allocation,
        budget=budget,
        total_revenue=total_revenue,
        total_discount_expenditure=total_expenditure,
        remaining_budget=max(0.0, budget - total_expenditure),
        budget_satisfied=total_expenditure <= budget + tolerance,
        bounds_satisfied=True,
        objective_value=objective_value,
        iterations=iterations,
        function_evaluations=function_evaluations,
        solver_status=solver_status,
    )
