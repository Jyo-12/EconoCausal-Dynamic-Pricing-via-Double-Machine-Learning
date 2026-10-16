Feature Engineering and Causal Variable Selection Plan
Project: EconoCausal --- Dynamic Pricing via Double Machine
Learning
Status: Planning document --- variables and transformations are
provisional until the full dataset is inspected.
1. Purpose
This document defines the planned approach for selecting causal
variables and engineering features for the EconoCausal project. The goal
is to estimate how product price affects demand while accounting for
observed confounders, then provide a reliable analysis-ready dataset for
Double Machine Learning (DML).

2. Causal question
For a given product and commercial context, how does a change in price
affect the quantity demanded, after adjusting for relevant observed
pre-treatment factors?

The intended observation unit in the project methodology is a product
in a specific time period. The final time granularity (for example,
product-store-week) must be confirmed against the source data and the
project requirements before aggregation.
3. Current data availability
At the time this plan was written, the repository contains the EDA
notebook and four EDA summary outputs for the transaction and promotion
datasets. The cleaned transaction and promotion CSV files are not
currently available in the author's working copy.
The EDA notebook reports the following transaction columns:
- household_key
- BASKET_ID
- DAY
- PRODUCT_ID
- QUANTITY
- SALES_VALUE
- STORE_ID
- RETAIL_DISC
- TRANS_TIME
- WEEK_NO
- COUPON_DISC
- COUPON_MATCH_DISC
The promotion table contains:
- PRODUCT_ID
- STORE_ID
- WEEK_NO
- display
- mailer
The EDA summary reported zero missing values in the inspected columns,
but also identified zero-quantity and zero-sales observations. These
values require investigation and should not be removed automatically.
The notebook's duplicate check is chunk-based, so global duplicate
validation is still required.
4. Causal variable selection
4.1 Primary variables
  Variable role     Candidate         Planned           Notes
                                      definition        
  Treatment, T    Product price     log(price) when Price is not an
                                      a valid, positive explicit column
                                      price measure is  in the reported
                                      established       transaction
                                                        schema. Its
                                                        derivation must
                                                        be verified
                                                        before use.
  Outcome, Y      Demand / quantity log(quantity)   Zero, negative,
                    sold              for valid         return, and
                                      positive          unusually large
                                      quantities, if    quantities need
                                      this matches the  investigation. Do
                                      chosen demand     not silently drop
                                      definition        them.
  Covariates, X   Pre-treatment     Selected observed Include only
                    context           variables that    after checking
                                      influence price   timing,
                                      assignment and    definitions,
                                      demand            availability, and
                                                        causal
                                                    justification.
4.2 Candidate covariates
  Candidate                Source column(s)      Why it may matter Decision status
  Product identity         PRODUCT_ID          Captures          Candidate; decide
                                                 differences in    encoding or
                                                 product demand    product/category
                                                 and price levels  grouping
  Store identity           STORE_ID            Captures          Candidate; verify
                                                 store-specific    coverage and
                                                 demand and        encoding strategy
                                                 pricing context   
  Time context             DAY, WEEK_NO, and Demand and prices Candidate; verify
                           any verified calendar can vary over     the meaning and
                           fields                time              mapping of time
                                                                   fields
  Display promotion        display             Display activity  Candidate; verify
                                                 may be related to coding and join
                                                 price and demand  coverage
  Mailer promotion         mailer              Mailer activity   Candidate; inspect
                                                 may be related to values because the
                                                 price and demand  sample includes a
                                                                   non-numeric code
  Retail discount          RETAIL_DISC         Contains          Requires causal
                                                 transaction       review: it may be
                                                 discount          part of how the
                                                 information       observed price is
                                                                   formed, so it must
                                                                   not automatically
                                                                   be controlled for
  Coupon discount          COUPON_DISC         May capture       Requires causal
                                                 coupon-related    review and overlap
                                                 price incentives  checks with price
                                                                   and promotions
  Coupon match discount    COUPON_MATCH_DISC   May capture an    Requires causal
                                                 additional coupon review and overlap
                                                 discount          checks
                                                 component         
  Historical demand        Lagged                Past demand can   Candidate only if
                           quantity/sales,       influence pricing history is
                           derived after         decisions and     available and lags
                           ordering observations predict current   are constructed
                           by time               demand            without leakage
  Other                    To be confirmed from  May explain       Pending inspection
  store/product/calendar   the remaining source  pricing and       of the other
  attributes               tables                demand            dataset files
                                             differences       
4.3 Variables not to use as ordinary model features
- BASKET_ID and household_key are identifiers. They may be useful
  for aggregation or diagnostics, but should not automatically be
  treated as numeric predictors.
- SALES_VALUE is not automatically a confounder because it is
  closely related to the outcome and may be used to derive a price
  measure. Its role must be decided from the causal graph and the
  transaction semantics.
- Post-treatment variables, variables caused by the current price, or
  variables that leak the current outcome should not be included as
  pre-treatment controls.
- Do not include both a derived price treatment and redundant
  transformations of the same price as ordinary controls without a
  clear model specification.
5. Price and demand definitions
5.1 Candidate unit price
The transaction schema does not show a direct PRICE column. A
candidate calculation is:
candidate_unit_price = SALES_VALUE / QUANTITY
This calculation is not yet approved as the treatment definition.
Before adopting it, inspect the dataset documentation and confirm how
SALES_VALUE, QUANTITY, returns, and discounts are recorded.
Calculate it only for rows where the denominator is valid, and
separately report excluded or undefined cases. Do not interpret the
ratio as a causal price without validation.
5.2 Log transformations
The proposed DML specification uses:
- T = log(price)
- Y = log(quantity)
Log transformations require strictly positive values. Define explicit
handling and reporting for zero or negative values before transforming.
Do not silently add arbitrary constants or discard records without
documenting the rationale and checking how the decision changes the
target population.
Because both treatment and outcome are logged, the estimated treatment
effect can be interpreted as a price elasticity under the specified
model and identification assumptions.
6. Data integration and observation level
The planned integration between transactions and promotions must be
validated before feature engineering is finalized.
1. Inspect the grain of each table and the meaning of DAY and
   WEEK_NO.
2. Confirm the intended observation unit, provisionally
   product-store-time.
3. Check whether promotions are unique at PRODUCT_ID + STORE_ID +
   WEEK_NO.
4. If the promotion table contains repeated keys, investigate their
   meaning and resolve them with an explicit, documented rule before
   joining.
5. Check join cardinality and compare row counts before and after the
   join.
6. Measure unmatched transaction keys and promotion coverage.
7. If transaction rows are aggregated, document the grouping keys and
   aggregation functions for quantity, sales, and discounts.
8. Ensure that aggregation does not remove meaningful price variation
   needed to estimate the treatment effect.
The join keys and aggregation level will be finalized only after
inspecting the full datasets and all relevant source tables.
7. Planned feature engineering workflow
1. Inspect schema: confirm columns, data types, key uniqueness,
   units, and source definitions.
2. Validate data quality: examine missing values, duplicates,
   zero/negative quantities, zero/negative sales, extreme values, and
   invalid identifiers.
3. Define the observation grain: select a defensible product-time
   unit, including store if supported by the data and research
   question.
4. Build candidate price: validate the available price fields and
   derive a unit-price measure only if justified.
5. Define demand outcome: determine the appropriate quantity
   measure and document treatment of returns and nonpositive values.
6. Integrate promotion context: join display and mailer using
   verified keys and validate the resulting row counts.
7. Create temporal features: derive calendar or lag features only
   from correctly ordered and documented time fields.
8. Select covariates: retain observed pre-treatment variables with
   a causal justification; flag ambiguous variables for review.
9. Apply transformations: create log treatment and outcome only for
   valid values; encode categorical features using a strategy
   appropriate to the chosen model.
10. Validate final data: check schema, types, duplicates, join
    integrity, feature distributions, and potential leakage.
11. Prepare modeling split: use a split strategy consistent with the
    time structure and prevent information from the future entering
    training features.
12. Document decisions: record all exclusions, assumptions,
    transformations, and limitations.
8. Preliminary causal DAG
The following is a conceptual DAG to guide review, not a confirmed
causal graph. Arrows must be revised based on domain knowledge and the
verified dataset.
Product / Store Context ───────► Price (T) ───────► Demand (Y)
          │                         ▲                  ▲
          └─────────────────────────┼──────────────────┘
                                    │                  │
Time / Seasonality ────────────────►│─────────────────►│
                                    │                  │
Promotion Context ─────────────────►│─────────────────►│
                                    │                  │
Historical Demand ─────────────────►│─────────────────►│
Potential confounders are variables that influence both price assignment
and demand and are measured before the treatment for the relevant
observation. A variable's inclusion must be based on its causal role,
not merely on its correlation with the outcome.
9. Risks and safeguards
- Invalid price proxy: SALES_VALUE / QUANTITY may not equal the
  intended product price in every record. Verify definitions and
  discount treatment.
- Join multiplication: duplicate promotion keys can inflate
  transaction counts. Validate key uniqueness and join cardinality.
- Nonpositive values: log transformations are undefined for
  nonpositive values. Report how such rows are handled.
- Outliers and returns: large or negative values may represent
  valid business events. Investigate before filtering.
- Post-treatment adjustment: discounts or other variables may be
  components or consequences of the pricing decision. Review the
  causal graph before treating them as controls.
- Temporal leakage: lag features and train/test splits must
  respect time ordering.
- Unobserved confounding: DML adjusts for observed covariates; it
  does not guarantee removal of bias from unmeasured factors.
- Limited overlap: causal estimates are less reliable where
  comparable observations at different prices are absent. Check price
  variation and overlap before interpreting results.
10. Planned deliverables
- docs/causal_variable_selection.md --- this plan and decision log.
- A documented causal variable table and reviewed DAG.
- Reproducible feature-engineering code after the cleaned datasets are
  available.
- Validation outputs for price, quantity, joins, and the final
  analysis-ready dataset.
- A documented feature schema for the DML modeling stage.
