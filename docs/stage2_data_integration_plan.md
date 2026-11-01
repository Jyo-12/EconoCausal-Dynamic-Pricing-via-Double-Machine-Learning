# EconoCausal — Stage 2: Data Integration and Feature Engineering

## 1. Objective

The objective of Stage 2 is to transform the initial exploratory data analysis into a validated, analysis-ready dataset for causal inference.

EconoCausal aims to estimate the causal effect of product prices on quantity demanded using Double Machine Learning (DML). Before implementing the causal model, we must validate the source data, establish a consistent observation level, define treatment and outcome variables, and identify relevant confounders.

This stage focuses on data quality, transaction-promotion integration, feature engineering, and reproducibility.

## 2. Current Project Status

The initial EDA has produced the following findings:

### Transaction Dataset

- Total transaction rows: 2,595,732
- Unique households: 2,500
- Unique baskets: 276,484
- Unique products: 92,339
- Unique stores: 582
- Distinct weeks: 102
- Rows with zero quantity: 14,466
- Rows with zero sales: 18,850
- Rows with quantity above 100: 23,136
- Missing values: None reported in the inspected columns

### Promotion Dataset

- Total promotion rows: 36,786,524
- Unique products: 68,377
- Unique stores: 115
- Distinct weeks: 93
- Missing values: None reported in the inspected columns

These results come from the initial EDA outputs. Additional validation is required before the datasets can be used for causal modelling.

In particular, the existing duplicate check was performed within chunks and does not establish global uniqueness. Promotion-key uniqueness and join integrity also remain to be verified.

## 3. Stage 2 Tasks

### Task 1: Data Quality Validation

The transaction and promotion datasets must undergo additional quality checks.

The validation process will investigate:

- Exact duplicate transaction records across the complete dataset.
- Repeated basket-product combinations.
- Duplicate promotion keys.
- Zero and negative quantities.
- Zero and negative sales values.
- Unusually large quantities and potential outliers.
- Data types and identifier consistency.
- Missing or invalid values in required columns.

Unusual observations must be investigated rather than automatically deleted.

Any exclusions or transformations must be documented with a clear rationale.

Expected output:

`outputs/validation/data_quality_report.csv`

### Task 2: Promotion Data Integration

The transaction and promotion datasets share the following candidate join keys:

- PRODUCT_ID
- STORE_ID
- WEEK_NO

Before joining, verify whether these columns uniquely identify promotion records.

If duplicate promotion keys exist, investigate their meaning and define a documented resolution strategy.

After validating the relationship between the tables, perform an appropriate join and check:

- Transaction row count before joining.
- Promotion-key uniqueness.
- Number of matched transaction records.
- Number of unmatched transaction records.
- Transaction row count after joining.
- Whether the join unexpectedly multiplies transaction rows.

Use merge validation where appropriate to prevent accidental row multiplication.

Expected output:

`outputs/validation/promotion_join_validation.csv`

### Task 3: Define the Observation Level

The proposed observation level is product-store-week.

However, this must be validated against the source data and the project's research question.

The transaction data is recorded at a transaction-line level, whereas the promotion data is organized around product, store, and week.

If aggregation is appropriate, document the rules used to calculate:

- Total quantity sold.
- Total sales value.
- Relevant discount measures.
- Promotion indicators.

Investigate whether prices change within a week. If weekly aggregation removes meaningful price variation, consider a finer time resolution.

The final observation level must preserve the variation required to study the causal effect of price on demand.

### Task 4: Treatment and Outcome Definition

The primary causal question is:

How does a change in product price affect quantity demanded after accounting for relevant observed confounders?

The main variables are:

Treatment (T):
Product price.

Outcome (Y):
Quantity sold at the selected observation level.

Covariates (X):
Relevant pre-treatment factors that may influence pricing decisions and demand.

The current transaction schema does not contain a direct PRICE column.

A candidate unit-price calculation is:

candidate_unit_price = SALES_VALUE / QUANTITY

However, this definition must be validated against the dataset documentation before being accepted as the treatment variable.

The meaning of SALES_VALUE, QUANTITY, and discount fields must be examined, including the handling of returns and multi-unit purchases.

Zero and negative quantities require explicit investigation before any logarithmic transformation is applied.

### Task 5: Causal Variable Selection

The following variables are candidates for investigation:

| Variable | Source Column | Potential Role |
|---|---|---|
| Product identity | PRODUCT_ID | Account for product-level differences |
| Store identity | STORE_ID | Account for store-specific differences |
| Time | DAY, WEEK_NO | Account for temporal variation |
| Display promotion | display | Represent promotional exposure |
| Mailer promotion | mailer | Represent promotional exposure |
| Historical demand | To be engineered | Capture previous demand patterns |
| Retail discount | RETAIL_DISC | Requires causal review |
| Coupon discount | COUPON_DISC | Requires causal review |
| Coupon match discount | COUPON_MATCH_DISC | Requires causal review |

The final covariate set must be determined using the causal structure and the availability of verified variables.

Discount variables must not automatically be included as ordinary controls because they may be components of the treatment mechanism.

Identifiers such as BASKET_ID and household_key should not automatically be treated as numeric predictors.

Variables derived from the current outcome or measured after the relevant treatment must not introduce leakage.

### Task 6: Feature Engineering

Once the data definitions and observation level are established, the pipeline may construct:

- A validated unit-price measure.
- Quantity sold at the chosen observation level.
- Product, store, and time identifiers.
- Verified promotion indicators.
- Calendar features where the date mapping is known.
- Lagged demand features using correctly ordered historical observations.
- Log-price and log-quantity variables where the chosen modelling specification permits them.

Every transformation must have a documented definition.

Lagged features must use past information only.

Nonpositive values must not be silently removed or modified merely to make logarithmic transformations possible.

### Task 7: Analysis Table Validation

Before proceeding to DML, validate the resulting analysis table.

The checks should include:

- Required columns are present.
- Join keys are valid.
- The promotion join has not unexpectedly multiplied rows.
- The selected observation level is consistent.
- Duplicate analysis keys have been investigated.
- Price and quantity definitions are documented.
- Invalid and nonpositive values are handled according to an explicit policy.
- Feature distributions and price variation have been inspected.
- Temporal features do not use future information.

The resulting dataset must be reproducible from the documented source data and transformation steps.

Large raw or derived datasets should not be committed to the repository unless repository size and data licensing permit it.

## 4. Preliminary Causal Framework

The proposed causal relationships are:

Product and Store Context → Price → Quantity Sold

Product and Store Context → Quantity Sold

Time and Seasonality → Price

Time and Seasonality → Quantity Sold

Promotion Context → Price

Promotion Context → Quantity Sold

These relationships are hypotheses that require domain justification.

The causal diagram must be reviewed after inspecting the actual dataset and confirming the definitions of the available variables.

Double Machine Learning can adjust for relevant observed confounders, but it does not automatically eliminate bias caused by unobserved confounders.

The availability of comparable observations at different prices must also be assessed before interpreting causal estimates.

## 5. Reproducibility Requirements

The data preparation workflow must:

1. Use configurable or repository-relative file paths.
2. Avoid dependencies on personal computer directories.
3. Document source-data access and licensing conditions.
4. Record cleaning and transformation decisions.
5. Save validation summaries in a reproducible format.
6. Avoid committing restricted or unnecessarily large datasets.
7. Use automated checks where practical.
8. Fail clearly when required columns or validation conditions are missing.

## 6. Expected Deliverables

The Stage 2 deliverables are:

- A documented data-quality report.
- A verified promotion-join validation report.
- A documented observation-level decision.
- A verified treatment and outcome definition.
- A reviewed causal-variable selection table.
- A reproducible feature-engineering workflow.
- A validated analysis-ready dataset, subject to source-data availability and licensing.
- Updated documentation describing assumptions and limitations.

## 7. Acceptance Criteria

Stage 2 will be considered complete when:

- Global duplicate diagnostics have been performed.
- Promotion-key uniqueness has been verified or resolved using a documented rule.
- Join cardinality and unmatched coverage have been measured.
- Unusual quantity and sales observations have been investigated.
- The observation level has been justified.
- The price and demand definitions have been approved.
- Candidate confounders have been reviewed using the causal framework.
- Feature engineering is reproducible.
- The resulting dataset passes the required validation checks.

## 8. Next Stage: Double Machine Learning

After Stage 2 is complete, the project can proceed to:

1. Price-demand exploratory analysis.
2. Price variation and overlap diagnostics.
3. Selection of an appropriate Double Machine Learning estimator.
4. Cross-fitting and causal-effect estimation.
5. Uncertainty estimation and robustness checks.
6. Sensitivity analysis for potential confounding.
7. Profit-aware pricing optimization under explicit assumptions.

No causal effect or price elasticity should be reported until the treatment definition, data quality, modelling assumptions, and estimation procedure have been validated.

## 9. Current Limitations

The current EDA provides initial descriptive summaries but does not establish global duplicate-free data, promotion-join integrity, a verified price measure, or a final modelling sample.

These items must be resolved before reliable causal conclusions can be drawn.

This document defines the planned Stage 2 workflow. It does not claim that the validation tasks have already been completed.
