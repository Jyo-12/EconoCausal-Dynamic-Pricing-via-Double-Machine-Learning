
import numpy as np
import pandas as pd
import pytest

from pricing.allocation_matrix import build_allocation_matrix


@pytest.fixture
def allocation():
    return pd.DataFrame({
        "household_id": [101, 101, 102, 102],
        "product_id": ["p1", "p2", "p1", "p2"],
        "recommended_discount": [3.0, 5.0, 2.0, 0.0],
        "recommended_price": [17.0, 30.0, 18.0, 35.0],
    })


def test_build_discount_matrix(allocation):
    matrix = build_allocation_matrix(allocation)

    assert matrix.shape == (2, 2)
    assert matrix.loc[101, "p1"] == 3.0
    assert matrix.loc[101, "p2"] == 5.0
    assert matrix.loc[102, "p1"] == 2.0
    assert matrix.loc[102, "p2"] == 0.0


def test_missing_household_product_pair_is_nan():
    data = pd.DataFrame({
        "household_id": [101, 102],
        "product_id": ["p1", "p2"],
        "recommended_discount": [3.0, 5.0],
    })

    matrix = build_allocation_matrix(data)

    assert matrix.loc[101, "p1"] == 3.0
    assert np.isnan(matrix.loc[101, "p2"])
    assert np.isnan(matrix.loc[102, "p1"])
    assert matrix.loc[102, "p2"] == 5.0


def test_custom_value_column(allocation):
    matrix = build_allocation_matrix(
        allocation,
        value_column="recommended_price",
    )

    assert matrix.loc[101, "p1"] == 17.0
    assert matrix.loc[102, "p2"] == 35.0


def test_duplicate_household_product_pairs_are_rejected(allocation):
    duplicate = pd.concat(
        [allocation, allocation.iloc[[0]]],
        ignore_index=True,
    )

    with pytest.raises(ValueError, match="Duplicate"):
        build_allocation_matrix(duplicate)


def test_missing_required_column_is_rejected():
    data = pd.DataFrame({
        "household_id": [101],
        "product_id": ["p1"],
    })

    with pytest.raises(ValueError, match="Missing required columns"):
        build_allocation_matrix(data)


def test_empty_input_is_rejected():
    data = pd.DataFrame(
        columns=[
            "household_id",
            "product_id",
            "recommended_discount",
        ]
    )

    with pytest.raises(ValueError, match="must not be empty"):
        build_allocation_matrix(data)


def test_negative_discount_is_rejected(allocation):
    allocation.loc[0, "recommended_discount"] = -1.0

    with pytest.raises(ValueError, match="negative"):
        build_allocation_matrix(allocation)


def test_non_finite_discount_is_rejected(allocation):
    allocation.loc[0, "recommended_discount"] = np.inf

    with pytest.raises(ValueError, match="finite"):
        build_allocation_matrix(allocation)


def test_null_household_or_product_value_is_rejected(allocation):
    allocation.loc[0, "household_id"] = None

    with pytest.raises(ValueError, match="cannot be null"):
        build_allocation_matrix(allocation)
