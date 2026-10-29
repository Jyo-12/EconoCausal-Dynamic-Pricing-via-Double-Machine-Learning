# EconoCausal: Dynamic Pricing & Individual Treatment Effect (ITE) Dashboard

## 1. Project Overview

EconoCausal is a prototype analytics workflow for exploring estimated
effects associated with two promotional treatments:

-   **Display exposure**
-   **Mailer exposure**

The project combines prepared model-estimate CSV files with an
interactive React dashboard. The dashboard allows a user to upload ITE
results, filter records, inspect summary metrics and visualizations, and
export the filtered data.

**Important:** The dashboard summarizes model-estimated effects.
Dashboard results alone do not establish that a treatment caused a
change in sales or that a promotion is profitable.

------------------------------------------------------------------------

## 2. Project Workflow

The work completed so far can be understood in the following stages.

### Stage 1 --- Prepare the transaction and promotion data

The underlying project used the Dunnhumby -- The Complete Journey retail
dataset.

The broader data-preparation workflow included:

1.  Loading transaction and promotion-related data.
2.  Preparing product, store, and week identifiers for analysis.
3.  Constructing display and mailer exposure indicators from the
    promotion fields.
4.  Aggregating and joining data to prepare analysis features.
5.  Creating historical sales and quantity features, including lagged
    and rolling sales features.
6.  Preparing a sample for treatment-effect analysis.

**Data-quality caveat:** During the workflow, the
transaction-to-promotion join had a low match rate (about 20.39%
overall, and about 21.01% for weeks 9--101). The key coverage and
treatment construction therefore require further validation before
treating downstream estimates as definitive causal results.

### Stage 2 --- Estimate treatment effects

Saved CSV files were created for the two treatment analyses:

-   `day1_ite_estimates.csv` --- display-related estimates
-   `day2_mailer_ite_estimates.csv` --- mailer-related estimates

The dashboard expects the following effect columns:

  --------------------------------------------------------------------------------------
  File                              Required effect column       Other fields observed
  --------------------------------- ---------------------------- -----------------------
  `day1_ite_estimates.csv`          `estimated_display_effect`   `WEEK_NO`,
                                                                 `display_exposed`,
                                                                 `SALES_VALUE`

  `day2_mailer_ite_estimates.csv`   `estimated_mailer_ite`       `PRODUCT_ID`,
                                                                 `STORE_ID`, `WEEK_NO`,
                                                                 `mailer_exposed`
  --------------------------------------------------------------------------------------

The dashboard validates that the relevant effect column exists and
contains numeric values. It ignores rows where the effect value cannot
be parsed as a number.

### Stage 3 --- Build the interactive dashboard

The dashboard was built with React and Vite. It uses Papa Parse to read
uploaded CSV files in the browser.

The dashboard includes:

-   Separate upload controls for display and mailer ITE files
-   A treatment selector
-   A week filter
-   Product and store filters when viewing mailer estimates and those
    columns are available
-   A search field
-   Positive, negative, zero, and all-effect filters
-   KPI cards for observation count, mean, median, and positive/negative
    estimate counts
-   An estimated-effect distribution chart
-   A weekly mean estimated-effect chart
-   A paginated results table
-   CSV export for the currently filtered records

CSV uploads are processed locally in the browser by this feature; the
upload handler does not send the CSV contents to the backend.

------------------------------------------------------------------------

## 3. How to Run the Dashboard

From a terminal, navigate to the dashboard directory (the directory
containing `package.json`):

``` powershell
cd "D:\Econocausal Double machine learning project\EconoCausal-Dynamic-Pricing-via-Double-Machine-Learning\dashboard"
```

Install dependencies if needed:

``` powershell
npm install
```

Start the development server:

``` powershell
npm run dev
```

Open the local address printed by Vite in the terminal, usually:

``` text
http://localhost:5173/
```

Keep the terminal running while using the dashboard. To stop the
development server, press `Ctrl+C` in that terminal.

### Upload the ITE files

1.  Open the dashboard in the browser.
2.  Select **Upload Display ITE CSV** and choose
    `day1_ite_estimates.csv`.
3.  Select **Upload Mailer ITE CSV** and choose
    `day2_mailer_ite_estimates.csv`.
4.  Select the treatment to explore.
5.  Apply filters and inspect the KPI cards, charts, and table.
6.  Use **Export filtered CSV** or **Download results** to save the
    currently filtered rows.

Each treatment file is loaded separately. When switching between
treatments, select the relevant treatment in the dashboard to view the
corresponding loaded data.

------------------------------------------------------------------------

## 4. Results Observed in the Dashboard

The screenshots from the current dashboard session showed the following
values:

  -----------------------------------------------------------------------
  Metric                      Display estimates          Mailer estimates
  ------------------- ------------------------- -------------------------
  Rows loaded                           100,000                   100,000

  Mean estimated                         -0.292                    -0.072
  effect                                        

  Median estimated                       -0.237                    -0.064
  effect                                        

  Positive estimates              22.0% (21,969             41.5% (41,491
                            observations shown)       observations shown)

  Negative estimates              78.0% (78,031             58.5% (58,509
                            observations shown)       observations shown)
  -----------------------------------------------------------------------

These are the values visible in the dashboard screenshots. They should
be rechecked against the exact uploaded CSV files before being treated
as final report figures.

### Display estimates

The display file shows a mean estimated effect of **-0.292** and a
median of **-0.237**. About **78%** of the estimates shown are negative,
while about **22%** are positive.

This indicates that the saved model estimates are predominantly negative
in the uploaded sample. It does not, on its own, prove that display
promotions reduce sales.

### Mailer estimates

The mailer file shows a mean estimated effect of **-0.072** and a median
of **-0.064**. About **58.5%** of the estimates shown are negative,
while about **41.5%** are positive.

The mean estimate is closer to zero than the display mean. The uploaded
estimates also contain a higher share of positive values than the
display estimates. This is a descriptive comparison, not proof that
mailer promotions perform better.

### Difference between the displayed means

The difference between the two reported means is:

``` text
Display mean − Mailer mean
= -0.292 − (-0.072)
= -0.220 outcome units
```

This means the display mean is 0.220 outcome units lower than the mailer
mean in the displayed samples. It should not be interpreted as a
validated causal advantage for mailers unless the two sets of estimates
are confirmed to be comparable in outcome, population, treatment
definition, and estimation method.

------------------------------------------------------------------------

## 5. How to Interpret the Visualizations

### KPI cards

-   **Filtered observations:** Number of records remaining after the
    current filters.
-   **Mean estimated effect:** Arithmetic average of the effect values
    in the filtered records.
-   **Median estimated effect:** Middle effect value after sorting the
    filtered records.
-   **Positive estimates:** Count and percentage of estimates greater
    than zero.
-   **Negative estimates:** Count and percentage of estimates below
    zero.

These are descriptive summaries of the uploaded estimates. They do not
provide statistical significance or confidence intervals.

### Estimated-effect distribution

The histogram groups estimates into bins to show how frequently values
occur across the range. It helps identify concentration, spread, and
potential asymmetry in the saved estimates. The chart does not identify
the cause of that distribution.

### Weekly mean estimated effect

This chart shows the average uploaded estimate for each week represented
in the filtered data. Variation may be useful for identifying weeks for
follow-up investigation. Changes over time do not automatically imply
changes in true promotional effectiveness; they may also reflect
product/store composition, seasonality, data quality, or model
behaviour.

### Filtered results table

The table displays the available row-level identifiers and estimate
fields. The fields shown depend on which treatment file is selected and
which columns exist in that file.

------------------------------------------------------------------------

## 6. Interpretation and Conclusion

The current dashboard provides an interactive way to inspect and compare
the saved model-estimated effects for display and mailer promotions. In
the uploaded samples, the display estimates are more negative on average
than the mailer estimates. The display sample has a larger proportion of
negative estimates, while the mailer sample has a higher proportion of
positive estimates.

These results are **exploratory**, not conclusive evidence of causal
impact. They do not establish that display promotions decrease sales,
that mailer promotions are superior, or that either strategy is
profitable. Such conclusions require validation of the data joins and
treatment definitions, comparable analysis populations, suitable causal
identification assumptions, and uncertainty estimates.

The dashboard demonstrates the reporting and visualization component of
the project. Before using the findings to make business decisions, the
following checks should be completed.

------------------------------------------------------------------------

## 7. Limitations and Recommended Next Steps

1.  **Investigate transaction--promotion join coverage.** The earlier
    workflow reported a match rate of approximately 20.39% overall and
    approximately 21.01% for weeks 9--101. Resolve the key mismatch and
    verify that the analysis sample represents the intended population.
2.  **Validate treatment definitions and comparison groups.** Confirm
    how display and mailer exposure are coded and whether a valid
    untreated or alternative-treatment comparison exists.
3.  **Check estimate comparability.** Confirm that display and mailer
    estimates use compatible outcomes, units, populations, feature
    timing, and estimation procedures before comparing their means.
4.  **Validate the causal model.** Review confounding,
    overlap/positivity, treatment timing, and the assumptions behind the
    estimator.
5.  **Quantify uncertainty.** Add appropriate confidence intervals or
    uncertainty estimates, using an inference method suited to the data
    structure.
6.  **Check sample sizes.** The dashboard screenshots showed 100,000
    rows per file. Confirm whether these files are intentionally sampled
    or truncated and document the sampling process.
7.  **Connect estimates to business outcomes.** Evaluate sales, margins,
    promotional costs, and other business objectives before making
    budget-allocation recommendations.
8.  **Test the dashboard.** Verify week and treatment filters, row
    counts, and exported CSV contents against the selected source data.

------------------------------------------------------------------------

## 8. Project Status

**Completed in the current dashboard workflow**

-   Redesigned the ITE dashboard layout.
-   Added browser-based upload controls for display and mailer ITE CSV
    files.
-   Added summary metrics, distribution and weekly charts, filtering, a
    results table, and filtered CSV export.

**Still requiring validation**

-   Root cause of the low transaction-to-promotion join coverage.
-   Validity and comparability of the treatment estimates.
-   Causal identification assumptions and statistical uncertainty.
-   Whether the 100,000-row files represent the intended analysis
    samples.

**Overall conclusion:** EconoCausal currently provides a working
interface for exploring saved ITE estimates. The observed patterns are
useful for hypothesis generation and further analysis, but causal and
business conclusions should wait until the underlying data and
estimation workflow are validated.
