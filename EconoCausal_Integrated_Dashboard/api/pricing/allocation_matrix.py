
"""Utilities for converting household-product discounts into a matrix."""

import pandas as pd


def build_allocation_matrix(
    allocation: pd.DataFrame,
    value_column: str = "recommended_discount",
) -> pd.DataFrame:
    """Build a household-by-product matrix of allocated discount values.

    Missing household-product pairs remain NaN so they are distinguishable
    from pairs that were explicitly assigned a zero discount.
    """
    required_columns = {
        "household_id",
        "product_id",
        value_column,
    }

    missing = required_columns.difference(allocation.columns)
    if missing:
        raise ValueError(
            f"Missing required columns: {', '.join(sorted(missing))}"
        )

    if allocation.empty:
        raise ValueError("allocation must not be empty.")

    if allocation[list(required_columns)].isna().any().any():
        raise ValueError("Household IDs, product IDs, and values cannot be null.")

    if not pd.api.types.is_numeric_dtype(allocation[value_column]):
        raise ValueError(f"{value_column} must contain numeric values.")

    if not pd.Series(allocation[value_column]).map(
        lambda value: pd.notna(value) and value != float("inf")
        and value != float("-inf")
    ).all():
        raise ValueError(f"{value_column} must contain finite values.")

    if (allocation[value_column] < 0).any():
        raise ValueError(f"{value_column} cannot contain negative values.")

    if allocation.duplicated(["household_id", "product_id"]).any():
        raise ValueError("Duplicate household-product pairs are not allowed.")

    matrix = allocation.pivot(
        index="household_id",
        columns="product_id",
        values=value_column,
    )

    matrix.index.name = "household_id"
    matrix.columns.name = "product_id"

    return matrix
