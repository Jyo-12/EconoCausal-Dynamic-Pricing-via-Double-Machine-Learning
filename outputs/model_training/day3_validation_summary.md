# Day 3: Model Comparison and Validation

## Data sources
- Display: day1_ite_estimates.csv
- Mailer: day2_mailer_ite_estimates.csv

## Results

       treatment   rows  valid_effects  missing_or_non_numeric  non_finite  mean_ite  std_ite  min_ite  q25_ite  median_ite  q75_ite  max_ite  positive_effect_pct  negative_effect_pct  zero_effect_pct
Display exposure 100000         100000                       0           0   -0.2925   0.4088  -1.2288  -0.5904     -0.2370  -0.0769   0.8924               21.969               78.031              0.0
 Mailer exposure 100000         100000                       0           0   -0.0722   0.3655  -4.2345  -0.2763     -0.0642   0.1416   4.4618               41.491               58.509              0.0

## Validation checks
- Verified the expected treatment-effect columns exist.
- Counted missing and non-finite estimates.
- Calculated descriptive statistics and effect sign proportions.
- Saved separate distribution plots for both treatments.

## Interpretation and limitations
- ITE values are model-estimated individual treatment effects.
- Positive and negative values indicate the estimated direction
  of the treatment effect on the outcome scale used by each model.
- A negative mean alone does not establish that a promotion harms sales.
- Display and mailer estimates concern different treatments and may
  use different observations or model specifications.
- Their means should not be treated as a direct causal ranking.
- These descriptive checks do not establish statistical significance
  or prove causal identification.
- Further checks should confirm consistent outcome units, treatment
  definitions, confounder adjustment, model assumptions and uncertainty.

## Output files
- day3_model_comparison.csv
- day3_model_comparison.png
- day3_validation_summary.md
