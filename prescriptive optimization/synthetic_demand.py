"""Deterministic synthetic price response for examples and tests only."""

from __future__ import annotations

import numpy as np
import pandas as pd
from numpy.typing import NDArray


def synthetic_constant_elasticity_demand(
    contexts: pd.DataFrame, candidate_prices: NDArray[np.float64]
) -> NDArray[np.float64]:
    """Return a synthetic constant-elasticity demand curve.

    The formula is Q(p) = baseline_demand * (p / reference_price) **
    (-price_elasticity). It is illustrative and is not trained on project data.
    Required context columns are ``baseline_demand``, ``reference_price`` and
    ``price_elasticity``.
    """
    required = {"baseline_demand", "reference_price", "price_elasticity"}
    missing = required.difference(contexts.columns)
    if missing:
        raise ValueError(
            f"Synthetic demand data is missing columns: {', '.join(sorted(missing))}."
        )

    baseline = contexts["baseline_demand"].to_numpy(dtype=float)
    reference = contexts["reference_price"].to_numpy(dtype=float)
    elasticity = contexts["price_elasticity"].to_numpy(dtype=float)
    prices = np.asarray(candidate_prices, dtype=float).reshape(-1)
    if (
        len(prices) != len(contexts)
        or not np.all(np.isfinite(baseline))
        or not np.all(np.isfinite(reference))
        or not np.all(np.isfinite(elasticity))
        or not np.all(np.isfinite(prices))
        or np.any(baseline < 0)
        or np.any(reference <= 0)
        or np.any(elasticity < 0)
        or np.any(prices <= 0)
    ):
        raise ValueError("Synthetic demand inputs must be finite and within valid ranges.")
    return baseline * np.power(prices / reference, -elasticity)
