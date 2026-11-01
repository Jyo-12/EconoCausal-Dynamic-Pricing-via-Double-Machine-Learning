# Feature Engineering and Causal Variable Selection — Final Handoff

**Project:** Dynamic Pricing with Double Machine Learning  
**Status:** Preliminary feature-engineering implementation completed; causal variable specification remains proposed pending review. DML training is outside this task.

## 1. Objective

Prepare a transaction dataset at product-store-week level and document candidate variables for a later study of the causal effect of product price on quantity sold.

## 2. Implemented feature engineering

The transaction table was aggregated using:

- `PRODUCT_ID`
- `STORE_ID`
- `WEEK_NO`

The aggregation creates the following measures:

- `TOTAL_QUANTITY`: sum of `QUANTITY`
- `TOTAL_SALES`: sum of `SALES_VALUE`
- `TOTAL_RETAIL_DISC`: sum of `RETAIL_DISC`
- `TOTAL_COUPON_DISC`: sum of `COUPON_DISC`
- `TOTAL_COUPON_MATCH_DISC`: sum of `COUPON_MATCH_DISC`
- `TRANSACTION_ROWS`: number of source transaction rows
- `UNIQUE_BASKETS`: number of distinct baskets
- `ZERO_QUANTITY_ROWS`: number of source rows with zero quantity
- `ZERO_SALES_ROWS`: number of source rows with zero sales
- `EXTREME_QUANTITY_ROWS`: number of source rows with quantity greater than 1,000

Additional features:

- `PRICE_PROXY`: `TOTAL_SALES / TOTAL_QUANTITY` when total quantity is positive; otherwise missing.
- `ZERO_OR_NEGATIVE_QUANTITY_FLAG`
- `ZERO_SALES_FLAG`
- `MISSING_PRICE_PROXY_FLAG`
- `EXTREME_QUANTITY_FLAG`
- `NONPOSITIVE_PRICE_PROXY_FLAG`

The final engineered table reported 2,370,784 product-store-week rows and zero duplicate keys. The earlier run reported 11,616 rows with non-positive aggregated quantity and 11,616 missing price proxies.

## 3. Candidate causal variables

### Treatment (T): `PRICE_PROXY`
This is a preliminary treatment candidate only. It is calculated as total recorded sales divided by total quantity. It has not been verified as the actual shelf price or price faced by customers.

### Outcome (Y): `TOTAL_QUANTITY`
This is the proposed outcome, measuring quantity purchased for each product-store-week. The transaction dataset may not include combinations with zero purchases, so this table may not fully represent demand opportunities.

### Candidate controls (X)
- `PRODUCT_ID`
- `STORE_ID`
- `WEEK_NO`
- Promotion variables (`display`, `mailer`) only if their coverage and meaning can be handled defensibly.
- Discount fields only after checking their definitions and whether they are appropriate controls for the chosen causal estimand.

These variables are candidates, not a fully finalized causal specification. The final set should be justified by the causal question, timing, and confounding assumptions.

## 4. Promotion mismatch findings

- Transaction weeks: 1–102.
- Promotion weeks: 9–101.
- Unique transaction stores: 582.
- Unique promotion stores: 115.
- Eligible unique transaction keys after restricting to weeks 9–101 and promotion-covered stores: 2,265,861.
- Exact matched keys: 483,320 (21.33%).
- Unmatched eligible keys: 1,782,541 (78.67%).
- 1,571,039 eligible keys had a product and store-week that each appeared in the promotion data, but lacked the exact product-store-week combination.

### Decision
The promotion data was not merged into the final transaction table. An absent key is not assumed to mean no display or no mailer. Preserve the promotion features separately until their coverage and definitions support a defensible integration strategy.

## 5. Data quality and limitations

- The `PRICE_PROXY` definition remains preliminary; confirm the source definitions for sales and discount fields.
- Do not automatically delete extreme quantity or non-positive price records solely because they are unusual. Use the flags for review and document any later filtering.
- The transaction table may contain only observed purchases, so zero-purchase product-store-week combinations may be missing.
- Promotion coverage is incomplete for the exact join keys.
- No DML model has been trained and no causal effect has been estimated.

## 6. Files expected in the output folder

- `transaction_weekly_final.csv`
- `feature_dictionary.csv`
- `feature_engineering_report.json`
- `promotion_features.csv`
- `transactions_preliminary_features.csv`
- `transaction_validation_report.json`
- `causal_variable_selection_checkpoint.md`
- `transaction_validation_report_final.json`

Large CSV files may need to remain in Kaggle/shared storage. Store the code and documentation in GitHub and add a shared data link if required.

## 7. Handoff checklist

- [x] Preliminary transaction feature engineering implemented.
- [x] Product-store-week aggregation created.
- [x] Feature dictionary generated.
- [x] Feature-engineering report generated.
- [x] Promotion matching limitation measured and documented.
- [ ] Verify actual price semantics.
- [ ] Decide handling of zero-purchase periods.
- [ ] Finalize causal controls and promotion integration strategy.
- [ ] Separate DML implementation by the responsible teammate.

## Conclusion

The preliminary feature-engineering outputs and candidate variable plan are ready for handoff. Final causal identification decisions remain open and should be resolved before the data is used for DML estimation.
