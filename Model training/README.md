\# EconoCausal: Dynamic Pricing via Double Machine Learning



\## 1. Overview



EconoCausal is a data-driven pricing and promotion-analysis project that applies Double Machine Learning (DML) and causal inference to estimate the effects of promotional activities on retail sales.



The objective is to understand how promotional exposures, such as in-store displays and mailer promotions, are associated with sales outcomes while accounting for relevant observed characteristics.



Unlike conventional predictive models that focus on forecasting sales, causal machine learning aims to estimate treatment effects, subject to appropriate assumptions about confounding, treatment assignment, and model specification.



\## 2. Objectives



\- Prepare transaction and promotion data for causal analysis.

\- Aggregate promotional exposure data at the product-store-week level.

\- Develop causal models for display and mailer exposures.

\- Estimate Individual Treatment Effects (ITEs).

\- Analyze the distribution and variability of treatment-effect estimates.

\- Compare the estimated effects of different promotional treatments.

\- Generate visualizations, descriptive summaries, and validation documentation.

\- Maintain reproducible, version-controlled project outputs.



\## 3. Technology Stack



| Component | Technology |

|---|---|

| Programming language | Python |

| Data processing | Pandas, NumPy |

| Causal inference | EconML |

| Causal estimation model | `CausalForestDML` |

| Nuisance estimators | Random Forest regressors |

| Visualization | Matplotlib |

| Development environment | Jupyter Notebook |

| Version control | Git and GitHub |



The implementation uses Random Forest-based nuisance estimators within the DML workflow. LightGBM is not part of the currently completed model runs.



`CausalForestDML` performs the causal treatment-effect estimation, while the nuisance estimators model the outcome and treatment-related components required by the DML procedure.



\## 4. Dataset Description



The project uses the Dunnhumby \*The Complete Journey\* retail dataset, which contains transaction-level purchase information and promotional data.



The primary data sources include:



\- \*\*Transaction data:\*\* Product purchases, sales value, quantity, store, household, and week information.

\- \*\*Promotion data:\*\* Product-store-week promotional information, including display and mailer indicators.



\### Data preprocessing



The preprocessing workflow includes:



1\. Loading cleaned transaction and promotion datasets.

2\. Aggregating promotion records by `PRODUCT\_ID`, `STORE\_ID`, and `WEEK\_NO`.

3\. Creating binary treatment variables:

&#x20;  - `display\_exposed`

&#x20;  - `mailer\_exposed`

4\. Aggregating transaction-level sales to the product-store-week level.

5\. Merging sales outcomes with promotional exposure data.

6\. Preparing treatment variables, outcome variables, and observed covariates for causal estimation.



The outcome variable used in the completed model runs is `SALES\_VALUE`.



A sample of 100,000 observations was used for each treatment-effect estimation run.



\## 5. Methodology



The project uses EconML's `CausalForestDML` to estimate heterogeneous treatment effects.



Double Machine Learning combines machine learning-based nuisance estimation with an orthogonalized estimation procedure. The causal forest component allows estimated treatment effects to vary across observations rather than assuming a single constant effect for all observations.



\### Workflow



1\. Define the outcome \\(Y\\), treatment \\(T\\), and observed covariates \\(X\\).

2\. Estimate the required nuisance functions using the configured Random Forest estimators.

3\. Apply the DML procedure to account for the estimated nuisance components.

4\. Fit the causal forest to estimate heterogeneous treatment effects.

5\. Generate Individual Treatment Effect estimates for the observations.

6\. Calculate descriptive statistics and inspect the effect distributions.

7\. Compare the results across promotional treatments.

8\. Save the results and documentation for further analysis.



\### Treatment models



\*\*Display exposure\*\*



\- Treatment variable: `display\_exposed`

\- Outcome variable: `SALES\_VALUE`

\- Estimated effect column: `estimated\_display\_effect`



This model estimates observation-level treatment effects associated with display exposure.



\*\*Mailer exposure\*\*



\- Treatment variable: `mailer\_exposed`

\- Outcome variable: `SALES\_VALUE`

\- Estimated effect column: `estimated\_mailer\_ite`



This model estimates observation-level treatment effects associated with mailer exposure.



The two treatment models are fitted separately. Direct comparisons require consideration of differences in observation populations, covariates, treatment definitions, and model specifications.



\## 6. Model Results



The following descriptive statistics were calculated from the saved treatment-effect estimates.



| Metric | Display exposure | Mailer exposure |

|---|---:|---:|

| Number of estimates | 100,000 | 100,000 |

| Valid estimates | 100,000 | 100,000 |

| Missing or non-numeric effects | 0 | 0 |

| Non-finite effects | 0 | 0 |

| Mean ITE | -0.292494 | -0.072170 |

| Standard deviation | 0.408826 | 0.365495 |

| Minimum ITE | -1.228784 | -4.234475 |

| 25th percentile | -0.590450 | -0.276312 |

| Median ITE | -0.237045 | -0.064240 |

| 75th percentile | -0.076892 | 0.141629 |

| Maximum ITE | 0.892401 | 4.461781 |

| Positive estimates | 21.969% | 41.491% |

| Negative estimates | 78.031% | 58.509% |

| Zero estimates | 0.000% | 0.000% |



\### Interpretation



The display model produced a mean estimated treatment effect of approximately -0.2925, whereas the mailer model produced a mean of approximately -0.0722.



The display estimates had a larger proportion of negative values. The mailer estimates had a larger proportion of positive values and a wider observed range.



These statistics describe the model-generated estimates. They do not independently establish that display promotions reduce sales or that mailer promotions are more effective. The observed differences may reflect treatment definitions, observation populations, covariates, or model behavior.



Further causal validation is required before translating these estimates into business decisions.



\## 7. Generated Outputs



All model-training artifacts are stored in:



`outputs/model\_training/`



| File | Description |

|---|---|

| `day1\_ite\_estimates.csv` | Observation-level display treatment-effect estimates |

| `day1\_ite\_summary.csv` | Descriptive statistics for display effects |

| `day1\_ite\_distribution.png` | Display treatment-effect distribution |

| `day1\_model\_summary.json` | Saved model-run summary |

| `day2\_mailer\_ite\_estimates.csv` | Observation-level mailer treatment-effect estimates |

| `day2\_mailer\_ite\_summary.csv` | Descriptive statistics for mailer effects |

| `day2\_mailer\_ite\_distribution.png` | Mailer treatment-effect distribution |

| `day3\_model\_comparison.csv` | Descriptive comparison of both treatments |

| `day3\_model\_comparison.png` | Side-by-side treatment-effect distributions |

| `day3\_validation\_summary.md` | Validation checks and interpretation limitations |



The directory also contains `Model\_comparison.csv`, `Model\_comparison.png`, and `Validation\_summary.md`, which duplicate the corresponding comparison artifacts and may be consolidated during repository cleanup.



\## 8. Validation and Limitations



The generated outputs were checked for missing, non-numeric, and non-finite treatment-effect estimates. Both treatment models produced 100,000 valid estimates.



These checks establish basic data integrity but do not demonstrate that the causal estimates are statistically significant or unbiased.



Further validation should examine:



\- Treatment assignment and covariate balance.

\- Potential confounding and omitted variables.

\- Alignment of treatment and outcome observations at the product-store-week level.

\- Nuisance-estimator configuration and performance.

\- Sensitivity to model settings and sample selection.

\- Confidence intervals or other appropriate uncertainty estimates.

\- Robustness across relevant products, stores, and time periods.

\- Comparability of the populations used for display and mailer estimation.



The estimates should not be interpreted as definitive causal effects without appropriate supporting evidence.



\## 9. Reproducibility



The saved CSV files and visualizations allow the results to be inspected without rerunning the models.



For reproducibility, the model-training notebook should document the dataset versions, Python dependencies, random seeds, treatment and outcome definitions, covariates, sampling procedure, and estimator parameters.



The notebook is the authoritative source for the exact configuration used in the completed model runs.



\## 10. Version Control



The model-training deliverables are maintained in the project's GitHub repository.



\- \*\*Branch:\*\* `sasi-deepika`

\- \*\*Latest relevant commit:\*\* `c0e2287`

\- \*\*Commit message:\*\* `Complete model training and treatment effect comparison`

\- \*\*Repository:\*\* \[EconoCausal-Dynamic-Pricing-via-Double-Machine-Learning](https://github.com/Jyo-12/EconoCausal-Dynamic-Pricing-via-Double-Machine-Learning)

\- \*\*Output directory:\*\* `outputs/model\_training/`



The commit contains the generated comparison outputs, validation summaries, and updated model result files.



\## 11. Conclusion



The model-training workflow applies Random Forest-based nuisance estimation and EconML's `CausalForestDML` to estimate heterogeneous treatment effects for display and mailer promotional exposure.



The completed workflow generated 200,000 treatment-effect estimates across the two separate model runs, along with descriptive summaries, distribution plots, comparison outputs, and validation documentation.



The artifacts are saved in the repository and version-controlled. Further causal validation and uncertainty analysis are recommended before using the estimates to guide dynamic pricing or promotional decisions.



