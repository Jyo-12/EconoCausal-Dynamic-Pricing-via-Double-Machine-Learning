EconoCausal — Dataset Selection, EDA Plan, and Causal DAG
1. Project Overview
EconoCausal: Dynamic Pricing via Double Machine Learning (DML) aims to estimate how product prices affect demand and use those estimates to support profit-aware pricing recommendations.
Ordinary prediction estimates expected sales under observed conditions. Causal inference instead asks how sales would change if the price were changed, while accounting for other relevant factors that may affect both price and demand.
2. Dataset Selection
Selected primary candidate: Dunnhumby — The Complete Journey
Dunnhumby — The Complete Journey is the provisional primary dataset recommended in the project research document. It contains retail transaction data and is a promising candidate for examining sales patterns, prices, promotions, and other factors relevant to demand.
The dataset must still be inspected before implementation. In particular, we need to confirm which files and columns are available and how to construct a consistent product-and-time-level analysis table.
Alternative candidates
- Dominick’s Finer Foods Scanner Data: An alternative retail dataset used in demand-estimation research. It may support analysis of price variation over time, but organizing the data may require additional work.
- Kaggle Retail Price Optimization dataset: A backup candidate. Its suitability should be checked by verifying that it provides adequate price variation, sales or quantity information, time-related information, and useful covariates for causal analysis.
Selection criteria
The final dataset should be assessed for:
1. Price variation: Prices must vary enough to study how demand responds to price changes.
2. Outcome availability: We need a usable measure of quantity sold or demand.
3. Temporal information: Dates or periods help us study changes over time and account for seasonality.
4. Potential confounders: Variables such as promotions, store or product characteristics, and historical sales may help account for factors related to both pricing and demand.
5. Data quality and preparation effort: Missing values, duplicates, file relationships, and the effort required to combine tables must be assessed.
Decision status: Proceed with Dunnhumby as the primary candidate, subject to verification of its actual files, columns, and suitability. Do not assume every required variable is present in a single file.
3. Exploratory Data Analysis (EDA) Plan
EDA will help us understand the dataset’s structure, quality, distributions, and relationships before building causal models.
Step 1 — Inspect the files and structure
- List the available data files and identify their formats.
- Load relevant files using Python and pandas.
- Check the number of rows and columns, column names, data types, and sample records.
- Determine how tables relate to one another and which keys can be used to join them.
Step 2 — Assess data quality
- Count missing values in each column.
- Check for duplicate rows and duplicate keys.
- Check invalid or implausible values, such as non-positive prices or negative quantities, where applicable.
- Record any assumptions and cleaning decisions.
Step 3 — Identify analysis variables
We need to identify or construct:
- Price (treatment): the product price for an observation.
- Quantity sold (outcome): the number of units sold.
- Time: the date or period of the observation.
- Covariates: observed variables that may influence pricing and demand, such as promotions, product/store information, seasonality indicators, and historical sales.
These are conceptual variable roles; their exact column names and availability must be confirmed from the dataset.
Step 4 — Explore distributions and relationships
- Summarize prices and quantities sold using descriptive statistics.
- Plot price and quantity distributions.
- Examine sales trends over time.
- Compare sales and prices across products, categories, or stores where the data supports this.
- Explore how promotions relate to prices and sales.
- Inspect relationships between candidate covariates, price, and quantity sold.
Step 5 — Prepare an analysis-ready table
- Join the necessary tables carefully.
- Define a consistent observation unit, such as a product in a given time period.
- Aggregate transactions into quantity sold at the selected time resolution.
- Create or verify the price measure.
- Check the resulting table for missingness, duplicates, and consistent units.
- Document the final treatment, outcome, and covariates.
Expected EDA outputs
- Dataset/file inventory and column summary.
- Data-quality report.
- Visualizations of price distributions and sales trends.
- A documented list of candidate confounders.
- A cleaned, analysis-ready table suitable for the next stage.
4. Causal DAG Concepts
A Directed Acyclic Graph (DAG) represents hypothesized causal relationships between variables.
- Directed: An arrow indicates an assumed direction of influence.
- Acyclic: Following the arrows cannot lead back to the same variable in a directed cycle.
- Graph: Variables are nodes connected by arrows.
For EconoCausal, the main variables are:
- Treatment (T): Price — the variable whose causal effect we want to estimate.
- Outcome (Y): Quantity sold — the demand measure we want to explain.
- Covariates (X): Observed factors that may influence price and/or demand.
Illustrative causal relationships
For example, seasonality may influence both pricing decisions and customer demand. Promotions may also affect price and quantity sold. Price itself may influence quantity sold.
Seasonality ─────► Price ─────► Quantity sold
      │                              ▲
      └──────────────────────────────┘

Promotion ───────► Price
    │
    └──────────────────────────────► Quantity sold
This diagram is illustrative: it records hypotheses to examine, not causal relationships already proven by the dataset. The final DAG should be reviewed after inspecting the available columns and understanding the data-generating context.
Why the DAG matters
If a factor influences both price and quantity sold, it may confound the estimated price-demand relationship. For example, sales may rise during hot weather because demand for cold drinks increases, while the retailer may also change prices during that period. Ignoring seasonality could lead us to attribute a seasonal change in demand incorrectly to price.
The DAG helps us:
1. State our causal assumptions explicitly.
2. Identify potential confounders to investigate.
3. Decide which observed variables may need to be included in the causal analysis.
4. Communicate the limits of our conclusions.
Double Machine Learning can adjust for relevant observed confounders when the assumptions and data support it. It does not automatically eliminate bias from important unobserved confounders.
