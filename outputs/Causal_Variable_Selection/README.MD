
## Project status

**Feature engineering: preliminary implementation completed.**  
**Causal variable selection: proposed specification documented; final causal assumptions still require review.**  
**DML model training and causal-effect estimation: outside the scope of this work.**

This folder contains the feature-engineering outputs and documentation for the Dynamic Pricing with Double Machine Learning project using the Dunnhumby *The Complete Journey* data.

## Objective

Prepare transaction data and document candidate variables for a later analysis of the causal effect of product price on quantity sold. This work prepares data and records limitations; it does not train a DML model or estimate a causal effect.

## Work completed

- Loaded and inspected transaction and promotion data.
- Performed preliminary data-quality checks.
- Created transaction-level data-quality flags.
- Aggregated transactions to one row per `PRODUCT_ID`, `STORE_ID`, and `WEEK_NO`.
- Calculated `PRICE_PROXY = TOTAL_SALES / TOTAL_QUANTITY` when aggregated quantity is positive.
- Created a feature dictionary and feature-engineering report.
- Investigated transaction-to-promotion key coverage and documented the mismatch.

## Output files

Expected outputs in the `outputs/causal_variable_selection/` folder:

| File | Description |
|---|---|
| `transaction_weekly_final.csv` | Aggregated transaction table at product-store-week level |
| `feature_dictionary.csv` | Descriptions and intended roles of engineered columns |
| `feature_engineering_report.json` | Summary of aggregation and data-quality decisions |
| `promotion_features.csv` | Promotion codes aggregated by product-store-week |
| `transactions_preliminary_features.csv` | Original transaction rows with preliminary features and flags |
| `transaction_validation_report.json` | Earlier transaction validation report |
| `causal_variable_selection_checkpoint.md` | Checkpoint documenting variable candidates, findings, and limitations |
| `transaction_validation_report_final.json` | Consolidated validation findings and decisions |

The exact set of files present may vary depending on which checkpoint artifacts have been committed.

## Proposed causal variable specification

| Role | Candidate | Notes |
|---|---|---|
| Treatment (T) | `PRICE_PROXY` | Preliminary ratio; not yet verified as the actual price faced by customers |
| Outcome (Y) | `TOTAL_QUANTITY` | Quantity purchased within each product-store-week |
| Candidate controls (X) | `PRODUCT_ID`, `STORE_ID`, `WEEK_NO` | Potential product, store, and time controls; final modeling representation needs review |
| Additional candidate controls | `display`, `mailer`, discount fields | Require defensible integration, timing, and semantic checks before use |

These are candidate roles, not a fully identified or finalized causal specification. Controls should be chosen based on the causal question and assumptions, not merely on availability.

## Promotion data matching limitation

The transaction data covers weeks 1–102, while promotion data covers weeks 9–101. There are 582 distinct transaction stores and 115 distinct promotion stores. Within weeks 9–101 and stores represented in promotion data, 2,265,861 unique transaction product-store-week keys were eligible for comparison:

- Exact matches: 483,320 (21.33%)
- Unmatched keys: 1,782,541 (78.67%)
- Keys where the product and store-week each appeared in promotion data, but the exact three-part key did not: 1,571,039

**Decision:** Do not interpret an absent promotion key as `display = 0` or `mailer = 0`. Promotion features have not been merged into the final transaction table because coverage and semantics do not yet justify filling unmatched values.

## Important limitations

1. `PRICE_PROXY` is computed as `TOTAL_SALES / TOTAL_QUANTITY` for positive quantity. It is a preliminary proxy, not a verified shelf price or price paid. Confirm the dataset's field definitions and discount conventions before using it as treatment.
2. The transaction data may only include observed purchases. Product-store-week periods with zero purchases may be absent, which limits interpretation of `TOTAL_QUANTITY` as full demand.
3. The promotion table has incomplete exact-key matching. Missing keys remain unknown; they are not automatically treated as no promotion.
4. Data-quality flags identify unusual records; they do not automatically justify dropping observations.
5. No final causal effect has been estimated, and no DML model has been trained in this work.

**This repository documents feature engineering and candidate causal variable selection only.**
