# DoWhy – Causal Inference

## 1. Project Overview

This folder contains the causal inference work for the EconoCausal project, 
which explores the use of Double Machine Learning (DML) for dynamic pricing.

The objective of this stage is to understand the relationships between 
pricing, promotional activities, and customer purchasing behaviour using 
causal inference techniques.

## 2. Objectives

- Understand the fundamentals of causal inference.
- Define the treatment, outcome, and potential confounding variables.
- Represent assumed causal relationships using a Directed Acyclic Graph (DAG).
- Identify the causal effect using Microsoft's DoWhy-compatible causal 
  inference framework.
- Estimate and evaluate causal effects.
- Prepare the causal analysis for a later Double Machine Learning stage.

## 3. Dataset

The project uses the Dunnhumby – The Complete Journey retail dataset.

The dataset contains transaction, product, household, coupon, campaign, 
and promotional information.

Dataset source:
https://www.kaggle.com/datasets/frtgnn/dunnhumby-the-complete-journey

The relevant tables and variables will be selected after data profiling 
and validation.

## 4. Planned Causal Variables

The following variables are preliminary candidates and require validation 
against the processed dataset.

| Role | Candidate variable | Purpose |
|---|---|---|
| Treatment | PRICE_PROXY | Candidate measure of price |
| Outcome | TOTAL_QUANTITY | Candidate measure of quantity purchased |
| Control | PRODUCT_ID | Product-level differences |
| Control | STORE_ID | Store-level differences |
| Control | WEEK_NO | Time-related differences |
| Additional control | display | Promotional display information |
| Additional control | mailer | Promotional mailer information |

**Important:** These variables are provisional. PRICE_PROXY must be 
validated before being treated as a causal treatment. Discount variables 
must also be evaluated carefully before inclusion as controls.

## 5. Planned Workflow

1. Inspect and validate the processed dataset.
2. Define the causal question and unit of analysis.
3. Identify the treatment, outcome, and potential confounders.
4. Construct a causal DAG based on domain assumptions.
5. Identify the estimand using DoWhy.
6. Estimate the causal effect using an appropriate method.
7. Perform refutation and robustness checks.
8. Document findings, assumptions, and limitations.

## 6. Tools and Libraries

- Python
- Pandas
- DoWhy
- Jupyter Notebook
- EconML (planned for the Double Machine Learning stage)

## 7. Current Status

**Stage:** Causal inference setup and variable validation.

The causal variables are preliminary candidates. The causal graph, 
identification assumptions, and estimation method will be finalized 
after the dataset and treatment definition have been validated.

## 8. Important Considerations

- A price proxy may not represent the actual shelf price.
- Missing product-store-week observations may affect quantity analysis.
- Promotional variables and discounts require careful causal reasoning.
- Refutation tests assess robustness but do not prove that causal 
  assumptions are correct.

All conclusions must be supported by the data and clearly documented 
assumptions.