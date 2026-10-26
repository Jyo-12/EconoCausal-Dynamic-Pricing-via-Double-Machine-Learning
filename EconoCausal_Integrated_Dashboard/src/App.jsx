
import { useState } from "react";
import Papa from "papaparse";
import Plot from "react-plotly.js";
import "./App.css";

const SAMPLE_LIMIT = 2000;
const PREVIEW_LIMIT = 8;

function App() {
  const [file, setFile] = useState(null);
  const [budget, setBudget] = useState("5000");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [chartData, setChartData] = useState(null);

  function handleFileChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setHeaders([]);
      setRows([]);
      setChartData(null);
      setMessage("Please select a CSV file.");
      return;
    }

    setFile(selected);
    setHeaders([]);
    setRows([]);
    setChartData(null);
    setSampleCount(0);
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
    setMessage("Reading a small sample of the CSV...");
    setHeaders([]);
    setRows([]);
    setChartData(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: SAMPLE_LIMIT,

      complete: (results) => {
        const parsedRows = results.data || [];
        const columnNames = results.meta?.fields || [];

        setHeaders(columnNames);
        setRows(parsedRows.slice(0, PREVIEW_LIMIT));
        setSampleCount(parsedRows.length);

        if (results.errors?.length) {
          console.warn("CSV parsing warnings:", results.errors);
        }

        if (!columnNames.length || !parsedRows.length) {
          setMessage(
            "No usable rows or headers were found. Check the CSV format."
          );
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

        setMessage(
          `Loaded ${parsedRows.length.toLocaleString()} sample rows. ` +
            (missing.length
              ? `Columns not found: ${missing.join(", ")}.`
              : "All expected chart columns were found.")
        );

        setLoading(false);
      },

      error: (error) => {
        setMessage(`Could not read CSV: ${error.message}`);
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
            {loading ? "Reading sample..." : "Preview data & create charts"}
            <span>→</span>
          </button>

          {message && (
            <p className="feedback" role="status">
              {message}
            </p>
          )}

          <p className="footnote">
            The browser reads at most {SAMPLE_LIMIT.toLocaleString()} data rows
            for this preview. This is not a full-dataset analysis or causal
            estimate.
          </p>
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

      <footer>
        EconoCausal · Research prototype · Causal assumptions require validation
      </footer>
    </main>
  );
}

export default App;
