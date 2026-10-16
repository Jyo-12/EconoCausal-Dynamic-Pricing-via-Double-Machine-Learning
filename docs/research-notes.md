# EconoCausal —Research Notes

## 1. Project Overview

**Project:** Dynamic Pricing via Double Machine Learning

**Objective:** To estimate how changes in product prices affect the quantity sold and use these estimates to recommend prices that maximize profit.

## 2. Problem Statement

Traditional machine learning models predict sales using historical data. However, a relationship between price and sales does not necessarily mean that price caused the change in sales.

For example, a store may reduce prices during a clearance sale, when customer demand is already changing. A simple predictive model may confuse the effect of the discount with the effect of the season.

This project aims to use Double Machine Learning (DML) to estimate the causal effect of price on demand while accounting for relevant observed factors.

## 3.  Dataset Investigation

The dataset should ideally contain:

- Product price
- Quantity sold
- Date or time period
- Product and store identifiers
- Promotions and discounts
- Seasonal information
- Historical demand information

## 4. Candidate Datasets

### Dunnhumby — The Complete Journey

- Contains retail transaction data and information about promotions and customers.
- Requires investigation of the available tables and whether suitable price, quantity, and time variables can be constructed.

### Dominick's Finer Foods Scanner Data

- An alternative retail dataset used in demand-estimation research.
- May provide useful price and sales variation over time.
- Requires assessment of data accessibility and preprocessing effort.

### Kaggle Retail Price Optimization Dataset

- A possible backup for initial pipeline development.
- Its suitability for causal analysis must be checked against the availability of relevant confounding variables.

## 5. Dataset Selection Criteria

The selected dataset should provide:

1. Sufficient variation in prices.
2. A measurable sales or demand outcome.
3. Observations across products and time.
4. Relevant factors that influence both pricing and demand.
5. Sufficient data quality and volume for analysis.
-
