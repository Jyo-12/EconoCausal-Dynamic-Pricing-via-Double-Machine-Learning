
import { useEffect, useState } from "react";
import Papa from "papaparse";
import Plot from "react-plotly.js";
import {
  calculateQiniCurve,
  getGainAtFraction,
  parseUpliftCurve,
  summarizeUpliftCurve,
} from "./uplift.js";
import "./App.css";

const SAMPLE_LIMIT = 2000;
const PREVIEW_LIMIT = 8;
const UPLIFT_CURVE_SPECS = [
  {
    key: "display",
    name: "Display Promotion",
    filename: "display_qini_curve.csv",
    color: "#34785b",
    treatmentColumn: "display_exposed",
    outcomeColumn: "SALES_VALUE",
    effectColumn: "estimated_display_effect",
  },
  {
    key: "mailer",
    name: "Mailer Promotion",
    filename: "mailer_qini_curve.csv",
    color: "#bd7429",
    treatmentColumn: "mailer_exposed",
    outcomeColumn: "SALES_VALUE",
    effectColumn: "estimated_mailer_ite",
  },
];
const UPLIFT_TARGET_FRACTIONS = [0.25, 0.5, 0.75];
const gainFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
const fractionFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});
let upliftLoadPromise;

function loadUpliftCurves() {
  if (!upliftLoadPromise) {
    upliftLoadPromise = Promise.all(
      UPLIFT_CURVE_SPECS.map(async (spec) => {
        const sources = [
          {
            directory: "outputs/Uplift_Curve",
            url: `${import.meta.env.BASE_URL}outputs/Uplift_Curve/${spec.filename}`,
          },
          {
            directory: "outputs/model_training",
            url: `${import.meta.env.BASE_URL}outputs/model_training/${spec.filename}`,
          },
        ];

        const errors = [];
        for (const source of sources) {
          try {
            const response = await fetch(source.url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return {
              key: spec.key,
              curve: {
                ...spec,
                ...parseUpliftCurve(await response.text()),
              },
            };
          } catch (error) {
            errors.push(`${source.directory}: ${error.message}`);
          }
        }

        return {
          key: spec.key,
          message: `${spec.filename} could not be loaded (${errors.join("; ")}).`,
        };
      })
    ).then((results) => {
      const curves = {};
      const messages = [];
      results.forEach((result) => {
        if (result.curve) curves[result.key] = result.curve;
        if (result.message) messages.push(result.message);
      });
      return { curves, messages };
    });
  }

  return upliftLoadPromise;
}

function getUploadedCurveData(columns, rowsByPromotion, source, parseErrors) {
  const columnLookup = new Map(
    columns.map((column) => [column.trim().toLowerCase(), column])
  );
  const curves = {};
  const messages = [];

  UPLIFT_CURVE_SPECS.forEach((spec) => {
    const required = [
      spec.treatmentColumn,
      spec.outcomeColumn,
      spec.effectColumn,
    ];
    const resolved = required.map((column) =>
      columnLookup.get(column.toLowerCase())
    );
    const missing = required.filter(
      (_, index) => !resolved[index]
    );

    if (missing.length > 0) {
      messages.push(
        `${spec.name} needs these CSV columns: ${missing.join(", ")}.`
      );
      return;
    }

    try {
      curves[spec.key] = {
        ...spec,
        ...calculateQiniCurve(rowsByPromotion[spec.key]),
      };
    } catch (error) {
      messages.push(`${spec.name}: ${error.message}`);
    }
  });

  return {
    curves,
    messages,
    warnings:
      parseErrors > 0
        ? [`${parseErrors.toLocaleString()} CSV parsing issue(s) occurred while reading the upload.`]
        : [],
    loading: false,
    source,
  };
}

function UpliftCurveChart({ title, subtitle, curves }) {
  return (
    <div className="chart-panel uplift-chart">
      <h3>{title}</h3>
      <p className="chart-note">{subtitle}</p>
      <Plot
        data={curves.map((curve) => ({
          x: curve.points.map((point) => point.fractionTargeted),
          y: curve.points.map((point) => point.qiniGain),
          type: "scattergl",
          mode: "lines",
          name: curve.name,
          line: { color: curve.color, width: 2 },
          hovertemplate:
            "<b>%{fullData.name}</b><br>" +
            "Fraction of observations: %{x:.1%}<br>" +
            "Cumulative gain: %{y:,.2f} (source units)<extra></extra>",
        }))}
        layout={{
          autosize: true,
          height: 360,
          margin: { l: 80, r: 25, t: 12, b: 65 },
          paper_bgcolor: "#ffffff",
          plot_bgcolor: "#ffffff",
          font: { family: "DM Sans, sans-serif", color: "#344054" },
          hovermode: "x unified",
          xaxis: {
            title: { text: "Fraction of observations targeted" },
            range: [0, 1],
            tickformat: ".0%",
            gridcolor: "#edf0eb",
          },
          yaxis: {
            title: { text: "Cumulative gain (source units)" },
            automargin: true,
            tickformat: ",.0f",
            gridcolor: "#edf0eb",
            zerolinecolor: "#aebcaf",
          },
          showlegend: curves.length > 1,
          legend: { orientation: "h", y: -0.25 },
        }}
        config={{ responsive: true, displaylogo: false }}
        style={{ width: "100%", height: "360px" }}
        useResizeHandler
      />
    </div>
  );
}

function UpliftAnalysis({ uploadedData }) {
  const [curveData, setCurveData] = useState({
    curves: {},
    messages: [],
    loading: true,
  });

  useEffect(() => {
    let active = true;
    loadUpliftCurves()
      .then((loadedData) => {
        if (active) setCurveData({ ...loadedData, loading: false });
      })
      .catch((error) => {
        if (active) {
          setCurveData({
            curves: {},
            messages: [`Could not load promotion curves: ${error.message}`],
            loading: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const activeData = uploadedData || curveData;
  const { curves, messages, loading, source, warnings = [] } = activeData;

  const summaries = Object.values(curves).map((curve) => ({
    ...curve,
    summary: summarizeUpliftCurve(curve.points),
  }));
  const dataWarnings = summaries.flatMap((curve) =>
    curve.warnings.map((warning) => `${curve.name}: ${warning}`)
  );
  const display = curves.display;
  const mailer = curves.mailer;
  const comparisons =
    display && mailer
      ? UPLIFT_TARGET_FRACTIONS.map((fractionTargeted) => {
          const displayGain = getGainAtFraction(
            display.points,
            fractionTargeted
          );
          const mailerGain = getGainAtFraction(
            mailer.points,
            fractionTargeted
          );

          if (displayGain === null || mailerGain === null) {
            return { fractionTargeted, unavailable: true };
          }

          const difference = displayGain - mailerGain;
          return {
            fractionTargeted,
            displayGain,
            mailerGain,
            difference,
            leader:
              difference === 0
                ? "Equal"
                : difference > 0
                  ? "Display Promotion"
                  : "Mailer Promotion",
          };
        })
      : [];
  const higherGainCounts = comparisons.reduce(
    (counts, comparison) => {
      if (comparison.leader === "Display Promotion") counts.display += 1;
      if (comparison.leader === "Mailer Promotion") counts.mailer += 1;
      return counts;
    },
    { display: 0, mailer: 0 }
  );
  const comparableCount = comparisons.filter(
    (comparison) => !comparison.unavailable
  ).length;

  return (
    <section className="results uplift-results">
      <div className="results-heading">
        <div>
          <p className="eyebrow">
            {source ? "CALCULATED FROM UPLOADED DATA" : "SAVED CURVE RESULTS"}
          </p>
          <h2>Promotion Uplift Analysis</h2>
        </div>
        <span className="tag">
          {source ? source : "Exploratory Qini-style analysis"}
        </span>
      </div>

      {loading && (
        <div className="empty" role="status">
          {source
            ? `Calculating promotion curves from ${source}…`
            : "Loading saved promotion curve outputs…"}
        </div>
      )}

      {messages.length > 0 && (
        <div className="uplift-warning" role="status">
          <strong>
            {source
              ? "The uploaded CSV could not produce all promotion curves."
              : "Some promotion curves could not be loaded."}
          </strong>
          <ul>
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          {source ? (
            <p>
              Upload a CSV with the required treatment indicator,{" "}
              <code>SALES_VALUE</code>, and saved ITE column for each
              promotion. The analysis does not estimate ITEs or retrain a
              model.
            </p>
          ) : (
            <p>
              Restore the missing or invalid CSV in either output folder. To
              regenerate it, run <code>notebooks/UpliftCurve.ipynb</code> with
              its saved ITE and outcome inputs; that notebook writes to{" "}
              <code>outputs/model_training</code> and does not retrain the
              model.
            </p>
          )}
        </div>
      )}
      {(dataWarnings.length > 0 || warnings.length > 0) && (
        <div className="uplift-warning" role="status">
          <strong>Some curve data needed cleaning.</strong>
          <ul>
            {[...dataWarnings, ...warnings].map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {summaries.length > 0 && (
        <>
          <div className="uplift-metrics">
            {summaries.flatMap((curve) => [
              {
                key: `${curve.key}-final`,
                title: `${curve.name} final cumulative gain`,
                value: gainFormat.format(curve.summary.finalGain),
                detail: `At ${fractionFormat.format(curve.summary.finalFraction)} targeted · source units`,
              },
              {
                key: `${curve.key}-maximum`,
                title: `${curve.name} maximum observed gain`,
                value: gainFormat.format(curve.summary.maximumGain),
                detail: `At ${fractionFormat.format(curve.summary.maximumFraction)} targeted · source units`,
              },
            ]).map((metric) => (
              <article className="uplift-metric" key={metric.key}>
                <span>{metric.title}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </article>
            ))}
          </div>

          {display && (
            <div className="uplift-chart-grid">
              <UpliftCurveChart
                title="Display Promotion — Cumulative Gain Curve"
                subtitle={
                  source
                    ? `Ranked by ${UPLIFT_CURVE_SPECS[0].effectColumn} in the uploaded data.`
                    : "Ranked by saved estimated display treatment effects."
                }
                curves={[display]}
              />
              {mailer && (
                <UpliftCurveChart
                  title="Mailer Promotion — Cumulative Gain Curve"
                  subtitle={
                    source
                      ? `Ranked by ${UPLIFT_CURVE_SPECS[1].effectColumn} in the uploaded data.`
                      : "Ranked by saved estimated mailer treatment effects."
                  }
                  curves={[mailer]}
                />
              )}
            </div>
          )}
          {!display && mailer && (
            <div className="uplift-chart-grid">
              <UpliftCurveChart
                title="Mailer Promotion — Cumulative Gain Curve"
                subtitle={
                  source
                    ? `Ranked by ${UPLIFT_CURVE_SPECS[1].effectColumn} in the uploaded data.`
                    : "Ranked by saved estimated mailer treatment effects."
                }
                curves={[mailer]}
              />
            </div>
          )}

          {display && mailer && (
            <>
              <UpliftCurveChart
                title="Display vs. Mailer — Cumulative Gain Comparison"
                subtitle="Both promotions use the same target-fraction and cumulative-gain axes."
                curves={[display, mailer]}
              />
              <div className="uplift-comparison">
                <div>
                  <h3>Higher cumulative gain at selected targeting fractions</h3>
                  <p className="chart-note">
                    Interpolated from the loaded curve points; differences are
                    in source units.
                  </p>
                </div>
                <div className="uplift-comparison-list">
                  {comparisons.map((comparison) => (
                    <div
                      className="uplift-comparison-row"
                      key={comparison.fractionTargeted}
                    >
                      <strong>
                        {fractionFormat.format(comparison.fractionTargeted)}{" "}
                        targeted
                      </strong>
                      <span>
                        {comparison.unavailable
                          ? "Not comparable at this fraction"
                          : comparison.leader === "Equal"
                            ? "Equal observed cumulative gain"
                            : `${comparison.leader} higher by ${gainFormat.format(
                                Math.abs(comparison.difference)
                              )}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="chart-note uplift-interpretation">
                  {comparableCount === 0
                    ? "The curves do not overlap any of the selected targeting fractions."
                    : higherGainCounts.mailer > higherGainCounts.display
                      ? "Mailer Promotion has the higher cumulative gain at more of the selected fractions."
                      : higherGainCounts.display > higherGainCounts.mailer
                        ? "Display Promotion has the higher cumulative gain at more of the selected fractions."
                        : "The selected comparable fractions are evenly split, or show equal gain, between the promotions."}{" "}
                  This describes these exploratory curves only; it does not
                  establish production superiority.
                </p>
              </div>
            </>
          )}

          <div className="uplift-caveat">
            <h3>How to read these curves</h3>
            <p>
              Each curve ranks product-store-week observations by the saved
              estimated treatment effect (or the uploaded effect column), then accumulates treated{" "}
              <code>SALES_VALUE</code> less control outcomes adjusted by the
              treatment/control count ratio. Cumulative gain is reported in
              source units; it is not revenue, profit, or an individual
              treatment-effect estimate.
            </p>
            <p>
              These are exploratory Qini-style analyses of observed outcomes
              and saved ITE rankings. The plots do not include held-out or
              off-policy validation or uncertainty intervals, so they are not
              proof of validated causal performance.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [budget, setBudget] = useState("5000");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [uploadedCurveData, setUploadedCurveData] = useState(null);

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setHeaders([]);
      setRows([]);
      setChartData(null);
      setUploadedCurveData(null);
      setMessage("Please select a CSV file.");
      return;
    }

    setFile(selected);
    setHeaders([]);
    setRows([]);
    setChartData(null);
    setSampleCount(0);
    setUploadedCurveData(null);
    setMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(budget);

    if (!file) {
      setMessage("Please choose a CSV file first.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a budget greater than zero.");
      return;
    }

    setLoading(true);
    setMessage("Reading the CSV and calculating promotion curves...");
    setHeaders([]);
    setRows([]);
    setChartData(null);
    setUploadedCurveData({
      curves: {},
      messages: [],
      warnings: [],
      loading: true,
      source: file.name,
    });

    const currentUploadRows = [];
    let currentUploadColumns = [];
    let currentUploadRowCount = 0;
    let currentUploadParseErrors = 0;
    const currentUploadCurveRows = Object.fromEntries(
      UPLIFT_CURVE_SPECS.map((spec) => [spec.key, []])
    );

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      step: (result) => {
        const row = result.data;
        const columnNames = result.meta?.fields || [];
        const columnLookup = new Map(
          columnNames.map((column) => [column.trim().toLowerCase(), column])
        );

        if (columnNames.length > 0) {
          currentUploadColumns = columnNames;
        }

        if (currentUploadRows.length < SAMPLE_LIMIT) {
          currentUploadRows.push(row);
        }
        currentUploadRowCount += 1;
        currentUploadParseErrors += result.errors?.length || 0;

        UPLIFT_CURVE_SPECS.forEach((spec) => {
          const treatmentColumn = columnLookup.get(
            spec.treatmentColumn.toLowerCase()
          );
          const outcomeColumn = columnLookup.get(
            spec.outcomeColumn.toLowerCase()
          );
          const effectColumn = columnLookup.get(
            spec.effectColumn.toLowerCase()
          );

          if (treatmentColumn && outcomeColumn && effectColumn) {
            currentUploadCurveRows[spec.key].push({
              treatment: row[treatmentColumn],
              outcome: row[outcomeColumn],
              effect: row[effectColumn],
            });
          }
        });
      },

      complete: () => {
        const parsedRows = currentUploadRows;
        const columnNames = currentUploadColumns;

        setHeaders(columnNames);
        setRows(parsedRows.slice(0, PREVIEW_LIMIT));
        setSampleCount(parsedRows.length);

        if (!columnNames.length || currentUploadRowCount === 0) {
          setMessage(
            "No usable rows or headers were found. Check the CSV format."
          );
          setUploadedCurveData({
            curves: {},
            messages: ["The uploaded CSV is empty or has no readable rows."],
            warnings: [],
            loading: false,
            source: file.name,
          });
          setLoading(false);
          return;
        }

        const findColumn = (candidate) =>
          columnNames.find(
            (name) => name.trim().toLowerCase() === candidate.toLowerCase()
          );

        const salesCol = findColumn("TOTAL_SALES");
        const quantityCol = findColumn("TOTAL_QUANTITY");
        const priceCol = findColumn("PRICE_PROXY");

        const numericValues = (column) =>
          parsedRows.map((row) => {
            const rawValue = row[column];

            if (
              rawValue === undefined ||
              rawValue === null ||
              String(rawValue).trim() === ""
            ) {
              return null;
            }

            const value = Number(rawValue);
            return Number.isFinite(value) ? value : null;
          });

        const traces = [];

        if (salesCol) {
          const sales = numericValues(salesCol);

          traces.push({
            x: sales.map((_, index) => index + 1),
            y: sales,
            type: "scatter",
            mode: "lines",
            name: "Total sales",
            connectgaps: false,
            yaxis: "y",
            line: { color: "#34785b", width: 2 },
          });
        }

        if (quantityCol) {
          const quantity = numericValues(quantityCol);

          traces.push({
            x: quantity.map((_, index) => index + 1),
            y: quantity,
            type: "scatter",
            mode: "lines",
            name: "Total quantity",
            connectgaps: false,
            yaxis: salesCol ? "y2" : "y",
            line: { color: "#d59a48", width: 2 },
          });
        }

        const priceValues = priceCol
          ? numericValues(priceCol).filter(
              (value) => value !== null && value > 0
            )
          : [];

        setChartData({
          traces,
          priceValues,
          hasPrice: Boolean(priceCol),
          hasSales: Boolean(salesCol),
          hasQuantity: Boolean(quantityCol),
        });

        const missing = [
          "TOTAL_SALES",
          "TOTAL_QUANTITY",
          "PRICE_PROXY",
        ].filter((name) => !findColumn(name));

        const curveResults = getUploadedCurveData(
          columnNames,
          currentUploadCurveRows,
          file.name,
          currentUploadParseErrors
        );
        setUploadedCurveData(curveResults);
        setMessage(
          `Processed ${currentUploadRowCount.toLocaleString()} rows; ` +
            `the data preview uses the first ${parsedRows.length.toLocaleString()}. ` +
            (missing.length
              ? `Preview columns not found: ${missing.join(", ")}.`
              : "All expected chart columns were found.")
        );

        setLoading(false);
      },

      error: (error) => {
        setMessage(`Could not read CSV: ${error.message}`);
        setUploadedCurveData({
          curves: {},
          messages: [`Could not read the uploaded CSV: ${error.message}`],
          warnings: [],
          loading: false,
          source: file.name,
        });
        setLoading(false);
      },
    });
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand-mark">EC</div>

        <div>
          <h1>EconoCausal</h1>
          <p>Dynamic Pricing &amp; Causal Intelligence</p>
        </div>

        <span className="status">Week 1 · Dashboard scaffold</span>
      </header>

      <section className="hero">
        <p className="eyebrow">CAUSAL ML &amp; OPTIMIZATION</p>

        <h2>Make pricing decisions with greater insight.</h2>

        <p className="hero-copy">
          Explore transaction data and prepare inputs for causal analysis.
        </p>
      </section>

      <section className="workspace">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <span className="step">01</span>

            <div>
              <h3>Historical campaign data</h3>
              <p>Select your transaction CSV.</p>
            </div>
          </div>

          <label className="upload-area">
            <span className="upload-icon">↑</span>
            <strong>Choose a CSV file</strong>
            <span>Browse files on your computer</span>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
          </label>

          {file && (
            <p className="file-info">
              Selected: <strong>{file.name}</strong>
              <br />
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}

          <div className="field">
            <label htmlFor="budget">Campaign budget (USD)</label>

            <div className="budget-input">
              <span>$</span>

              <input
                id="budget"
                type="number"
                min="1"
                step="0.01"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
            </div>
          </div>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Processing CSV..." : "Preview data & create charts"}
            <span>→</span>
          </button>

          {message && (
            <p className="feedback" role="status">
              {message}
            </p>
          )}

          <div className="footnote">
            <strong>For promotion uplift analysis</strong>
            <p>Your CSV must include these columns:</p>
            <ul>
              <li>
                <strong>Display:</strong> display_exposed, SALES_VALUE,
                estimated_display_effect
              </li>
              <li>
                <strong>Mailer:</strong> mailer_exposed, SALES_VALUE,
                estimated_mailer_ite
              </li>
            </ul>
            <p>
              The curves use all uploaded rows. Preview charts use at most{" "}
              {SAMPLE_LIMIT.toLocaleString()} rows. Uploading does not train a
              model.
            </p>
          </div>
        </form>

        <aside className="panel overview">
          <p className="eyebrow">WORKFLOW OVERVIEW</p>
          <h3>Your analysis workspace</h3>

          <p className="overview-copy">
            Data preview comes first; causal estimation and optimization follow.
          </p>

          <div className="workflow-item">
            <span className="workflow-number">1</span>

            <div>
              <strong>Data preparation</strong>
              <p>Inspect the selected CSV sample.</p>
            </div>

            <span className="tag">Current</span>
          </div>

          <div className="workflow-item">
            <span className="workflow-number">2</span>

            <div>
              <strong>Causal estimation</strong>
              <p>Connect the DoWhy and EconML workflow.</p>
            </div>

            <span className="tag pending">Planned</span>
          </div>

          <div className="workflow-item">
            <span className="workflow-number">3</span>

            <div>
              <strong>Budget optimization</strong>
              <p>Prepare future allocation analysis.</p>
            </div>

            <span className="tag pending">Planned</span>
          </div>
        </aside>
      </section>

      {headers.length > 0 && (
        <section className="results">
          <div className="results-heading">
            <div>
              <p className="eyebrow">DATA EXPLORER</p>
              <h2>CSV sample preview</h2>
            </div>

            <span className="tag">
              {sampleCount.toLocaleString()} sample rows
            </span>
          </div>

          <div className="table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    {headers.map((header) => (
                      <td key={header}>{row[header] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {chartData && chartData.traces.length > 0 && (
            <div className="chart-panel">
              <h3>Sales and quantity in the sampled rows</h3>

              <p className="chart-note">
                Points follow CSV row order. They represent time trends only if
                the CSV is sorted by time.
              </p>

              <Plot
                data={chartData.traces}
                layout={{
                  autosize: true,
                  height: 390,
                  margin: { l: 65, r: 65, t: 25, b: 65 },
                  paper_bgcolor: "#ffffff",
                  plot_bgcolor: "#ffffff",
                  font: {
                    family: "DM Sans, sans-serif",
                    color: "#344054",
                  },
                  xaxis: { title: "Sample row number" },
                  yaxis: {
                    title: chartData.hasSales
                      ? "Total sales"
                      : "Total quantity",
                  },
                  ...(chartData.hasSales && chartData.hasQuantity
                    ? {
                        yaxis2: {
                          title: "Total quantity",
                          overlaying: "y",
                          side: "right",
                        },
                      }
                    : {}),
                  legend: { orientation: "h", y: -0.25 },
                }}
                config={{ responsive: true, displaylogo: false }}
                style={{ width: "100%" }}
                useResizeHandler
              />
            </div>
          )}

          {chartData?.hasPrice && chartData.priceValues.length > 0 && (
            <div className="chart-panel">
              <h3>Price proxy distribution</h3>

              <p className="chart-note">
                Positive PRICE_PROXY values in the sampled rows only.
              </p>

              <Plot
                data={[
                  {
                    x: chartData.priceValues,
                    type: "histogram",
                    name: "Price proxy",
                    marker: { color: "#34785b" },
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 340,
                  margin: { l: 65, r: 25, t: 25, b: 65 },
                  paper_bgcolor: "#ffffff",
                  plot_bgcolor: "#ffffff",
                  font: {
                    family: "DM Sans, sans-serif",
                    color: "#344054",
                  },
                  xaxis: { title: "PRICE_PROXY" },
                  yaxis: { title: "Number of sampled rows" },
                }}
                config={{ responsive: true, displaylogo: false }}
                style={{ width: "100%" }}
                useResizeHandler
              />
            </div>
          )}
        </section>
      )}

      <UpliftAnalysis uploadedData={uploadedCurveData} />

      <footer>
        EconoCausal · Research prototype · Causal assumptions require validation
      </footer>
    </main>
  );
}

export default App;
