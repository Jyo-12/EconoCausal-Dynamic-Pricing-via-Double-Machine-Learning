# Causal Variable Candidates

## Project
EconoCausal: Dynamic Pricing via Double Machine Learning (DML)

## Overview
This file documents the preliminary candidate variables identified
for the causal analysis of retail pricing and purchasing behaviour
using the Dunnhumby — The Complete Journey dataset.

The objective is to identify potential treatment, outcome, and
control variables for the subsequent causal modelling stage.

## Variables Summary

### 1. Treatment Candidate
- **PRICE_PROXY**
- Proposed proxy calculated as TOTAL_SALES / TOTAL_QUANTITY
  when quantity is positive.
- Limitation: This has not been verified as the actual shelf price.

### 2. Outcome Candidate
- **TOTAL_QUANTITY**
- Represents quantity purchased at the product-store-week level.
- Limitation: Zero-purchase periods may be absent from the data.

### 3. Control Candidates
- **PRODUCT_ID:** Represents product-level differences.
- **STORE_ID:** Represents store-level differences.
- **WEEK_NO:** Represents time-related differences.

The final encoding and representation of these variables
will depend on the model design.

### 4. Additional Control Candidates
- **display:** Promotional display information.
- **mailer:** Promotional mailer information.
- **TOTAL_RETAIL_DISC:** Retail discount amount.
- **TOTAL_COUPON_DISC:** Coupon discount amount.
- **TOTAL_COUPON_MATCH_DISC:** Coupon-match discount amount.

These variables remain pending further investigation because
of incomplete promotional-data coverage and potential overlap
between discount measures.

## Current Status
All variables are preliminary candidates.

The treatment, outcome, and control variables have not yet
been finalized for Double Machine Learning.

## Next Steps
1. Validate the PRICE_PROXY calculation.
2. Investigate missing zero-purchase periods.
3. Examine promotional variable coverage.
4. Investigate relationships between discount measures.
5. Finalize the variables and justify their inclusion.
6. Document the causal assumptions before model estimation.

## Important Note
This document records candidate selection, not validated
causal effects or final model results.
