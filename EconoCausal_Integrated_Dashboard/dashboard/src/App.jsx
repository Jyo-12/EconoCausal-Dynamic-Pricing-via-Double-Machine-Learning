import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import "./App.css";

const API = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const fmt = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n || 0));
const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(n || 0));
const layout = (extra = {}) => ({ autosize: true, height: 340, margin: { l: 60, r: 55, t: 15, b: 55 }, paper_bgcolor: "#fff", plot_bgcolor: "#fff", font: { family: "DM Sans", color: "#52665a", size: 11 }, legend: { orientation: "h", y: -0.22 }, ...extra });

function PlotCard({ title, subtitle, children }) { return <article className="card plot-card"><h3>{title}</h3><p className="muted">{subtitle}</p>{children}</article>; }
function Empty({ children = "Load a CSV to see this visualization." }) { return <div className="empty">{children}</div>; }
function Dag() {
  const nodes = [
    {x:90,y:55,t:"Product context",c:"#e6f0e8",s:"#5d9775"},
    {x:90,y:145,t:"Store context",c:"#e6f0e8",s:"#5d9775"},
    {x:90,y:235,t:"Time / seasonality",c:"#e6f0e8",s:"#5d9775"},
    {x:90,y:325,t:"Historical demand",c:"#e6f0e8",s:"#5d9775"},
    {x:455,y:190,t:"Treatment (T)",c:"#d9efe2",s:"#32815a"},
    {x:790,y:190,t:"Outcome (Y)",c:"#fff0dc",s:"#d38a38"}
  ];
  const edges = [[162,55,383,166],[162,145,383,180],[162,235,383,200],[162,325,383,214],[527,190,718,190],[162,55,718,160],[162,235,718,215],[162,325,718,230]];
  return <svg viewBox="0 0 880 380" className="dag" role="img" aria-label="Proposed causal DAG"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#80998a"/></marker></defs>{edges.map((e,i)=><line key={i} x1={e[0]} y1={e[1]} x2={e[2]} y2={e[3]} stroke="#9aac9f" strokeWidth="1.6" markerEnd="url(#arrow)"/>)}{nodes.map(n=><g key={n.t}><rect x={n.x-72} y={n.y-23} width="144" height="46" rx="12" fill={n.c} stroke={n.s} strokeWidth="1.4"/><text x={n.x} y={n.y+4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#284438">{n.t}</text></g>)}</svg>;
}

export default function App() {
  const [tab, setTab] = useState("Overview");
  const [status, setStatus] = useState("Checking backend…");
  const [data, setData] = useState(null);
  const [causal, setCausal] = useState([]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [budget, setBudget] = useState("5000");
  const [search, setSearch] = useState("");
  const [week, setWeek] = useState("all");

  useEffect(() => {
    fetch(`${API}/api/health`).then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(() => setStatus("Backend connected")).catch(() => setStatus("Backend not connected"));
    fetch(`${API}/api/causal-results`).then(r => r.json()).then(d => setCausal(d.files || [])).catch(() => {});
  }, []);

  async function analyzeLocal() {
    setBusy(true); setMsg("Processing local CSV in chunks…");
    try {
      const r = await fetch(`${API}/api/analyze-local`); const d = await r.json();
      if (!r.ok) throw Error(d.detail || "Could not analyze local CSV");
      setData(d); setMsg(d.message || "Analysis complete"); setTab("Overview");
    } catch (e) { setMsg(`${e.message}. Configure ECONOCAUSAL_DATA_PATH for the backend.`); }
    finally { setBusy(false); }
  }
  async function upload(e) {
    e.preventDefault(); if (!file) { setMsg("Choose a CSV first."); return; }
    setBusy(true); setMsg("Uploading and processing CSV in chunks…");
    try {
      const form = new FormData(); form.append("file", file);
      const r = await fetch(`${API}/api/analyze-upload`, { method: "POST", body: form });
      const d = await r.json(); if (!r.ok) throw Error(d.detail || "Upload failed");
      setData(d); setMsg(d.message || "Analysis complete"); setTab("Overview");
    } catch (err) { setMsg(err.message); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => (data?.preview || []).filter(row => {
    const q = search.trim().toLowerCase();
    return (!q || Object.values(row).some(v => String(v ?? "").toLowerCase().includes(q))) &&
      (week === "all" || String(row.WEEK_NO ?? "") === week);
  }), [data, search, week]);

  function exportSummary() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "econocausal-summary.json"; a.click(); URL.revokeObjectURL(url);
  }

  const weekly = data?.weekly || [];
  const price = data?.price_histogram || { bins: [], counts: [] };
  const topP = data?.top_products || [], topS = data?.top_stores || [];

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="logo">EC</span><div><b>EconoCausal</b><small>Dynamic Pricing Intelligence</small></div></div>
      <p className="side-label">WORKSPACE</p>
      {["Overview","Analytics","Causal Analysis","Optimization","Data Management"].map(t =>
        <button key={t} className={`nav ${tab===t?"selected":""}`} onClick={()=>setTab(t)}>{t}</button>)}
      <div className="backend"><i className={status==="Backend connected"?"online":""}/><div><b>Backend status</b><small>{status}</small></div></div>
    </aside>
    <main className="main">
      <header className="header"><div><p className="eyebrow">CAUSAL ML &amp; OPTIMIZATION</p><h1>{tab}</h1></div><span className="pill">Week 1 · Research prototype</span></header>
      {!data && <section className="welcome"><p className="eyebrow">PRICING DECISIONS, GROUNDED IN DATA</p><h2>Make pricing decisions with greater insight.</h2><p className="muted">Analyze transaction data, inspect patterns, and import validated causal results in one workspace.</p><button className="primary" onClick={analyzeLocal} disabled={busy}>{busy?"Processing…":"Analyze configured local CSV"}</button><small>Uses the file path configured in the Python backend.</small></section>}
      {msg && <div className="message">{msg}</div>}

      {tab==="Overview" && <section className="content">
        <div className="section-head"><div><h2>Executive overview</h2><p className="muted">{data?.dataset_name || "Load a CSV to calculate metrics from actual data."}</p></div><button className="secondary" disabled={!data} onClick={exportSummary}>Export summary ↓</button></div>
        <div className="kpis">
          {[["Total sales",data?usd(data.kpis.total_sales):"—","Sum of TOTAL_SALES"],["Quantity sold",data?fmt(data.kpis.total_quantity):"—","Sum of TOTAL_QUANTITY"],["Weighted price proxy",data?usd(data.kpis.weighted_price_proxy):"—","Sales divided by quantity"],["Unique products",data?fmt(data.kpis.unique_products):"—","Distinct product IDs"],["Unique stores",data?fmt(data.kpis.unique_stores):"—","Distinct store IDs"],["Rows processed",data?fmt(data.kpis.rows_processed):"—","Rows read by backend"]].map(k=><article className="kpi" key={k[0]}><span>{k[0]}</span><strong>{k[1]}</strong><small>{k[2]}</small></article>)}
        </div>
        <div className="grid2">
          <PlotCard title="Weekly sales & quantity" subtitle="Aggregated by WEEK_NO."><>{weekly.length?<Plot data={[{x:weekly.map(x=>x.week),y:weekly.map(x=>x.total_sales),type:"scatter",mode:"lines+markers",name:"Sales",line:{color:"#276749",width:3}},{x:weekly.map(x=>x.week),y:weekly.map(x=>x.total_quantity),type:"scatter",mode:"lines+markers",name:"Quantity",yaxis:"y2",line:{color:"#d99a45",width:2}}]} layout={layout({xaxis:{title:"Week"},yaxis:{title:"Sales"},yaxis2:{title:"Quantity",overlaying:"y",side:"right"}})} config={{responsive:true,displaylogo:false}} style={{width:"100%"}} useResizeHandler/>:<Empty/>}</></PlotCard>
          <PlotCard title="Price proxy distribution" subtitle="Bounded sample of positive PRICE_PROXY values.">{price.counts?.length?<Plot data={[{x:price.bins,y:price.counts,type:"bar",marker:{color:"#34785b"}}]} layout={layout({xaxis:{title:"Price proxy bin midpoint"},yaxis:{title:"Sample count"}})} config={{responsive:true,displaylogo:false}} style={{width:"100%"}} useResizeHandler/>:<Empty>PRICE_PROXY is required for this chart.</Empty>}</PlotCard>
        </div>
      </section>}

      {tab==="Analytics" && <section className="content"><h2>Analytics</h2><p className="muted">Dataset-wide summaries generated by the backend.</p><div className="grid2">
        <PlotCard title="Top products by sales" subtitle="Top 10 products.">{topP.length?<Plot data={[{x:topP.map(x=>x.total_sales),y:topP.map(x=>String(x.product_id)),type:"bar",orientation:"h",marker:{color:"#34785b"}}]} layout={layout({height:420,margin:{l:100,r:25,t:15,b:55},xaxis:{title:"Sales"},yaxis:{autorange:"reversed"}})} config={{responsive:true,displaylogo:false}} style={{width:"100%"}} useResizeHandler/>:<Empty/>}</PlotCard>
        <PlotCard title="Top stores by sales" subtitle="Top 10 stores.">{topS.length?<Plot data={[{x:topS.map(x=>x.total_sales),y:topS.map(x=>String(x.store_id)),type:"bar",orientation:"h",marker:{color:"#d99a45"}}]} layout={layout({height:420,margin:{l:100,r:25,t:15,b:55},xaxis:{title:"Sales"},yaxis:{autorange:"reversed"}})} config={{responsive:true,displaylogo:false}} style={{width:"100%"}} useResizeHandler/>:<Empty/>}</PlotCard>
      </div></section>}

      {tab==="Causal Analysis" && <section className="content"><h2>Causal analysis workspace</h2><p className="muted">Conceptual DAG and status of existing DoWhy/EconML result files.</p><div className="warning">The DAG is a proposed causal structure, not evidence of causation. No effect is invented by this dashboard.</div><article className="card"><Dag/><p className="muted">Potential confounders → treatment → outcome. Validate each edge and define treatment using source semantics.</p></article><div className="grid2"><article className="card"><h3>Variable definitions</h3><div className="table-scroll"><table><thead><tr><th>Role</th><th>Variable</th><th>Caveat</th></tr></thead><tbody><tr><td>Outcome</td><td>TOTAL_QUANTITY</td><td>Inspect extreme values.</td></tr><tr><td>Treatment</td><td>Verified promotion/price intervention</td><td>PRICE_PROXY is derived from sales and quantity; not automatically a valid treatment.</td></tr><tr><td>Confounders</td><td>Product, store, week, historical demand</td><td>Use defensible observed variables.</td></tr></tbody></table></div></article><article className="card"><h3>Imported result files</h3>{causal.map(x=><div className="result" key={x.file}><div><b>{x.file}</b><small>{x.rows} row(s) · {(x.columns||[]).join(", ")}</small></div><span className={`tag ${x.status!=="available"?"pending":""}`}>{x.status}</span></div>)}<p className="muted">File presence does not mean an effect was estimated. Inspect each result's status and diagnostics.</p></article></div></section>}

      {tab==="Optimization" && <section className="content"><h2>Budget &amp; pricing scenarios</h2><p className="muted">Illustrative allocation only; not a causal uplift or profit-maximizing recommendation.</p><div className="warning">Allocation is proportional to observed sales among the top products. Use only as a baseline until credible effects, margins, and constraints are available.</div><article className="card"><label className="field-label" htmlFor="budget">Scenario budget (USD)</label><div className="budget-row"><input id="budget" type="number" min="1" value={budget} onChange={e=>setBudget(e.target.value)}/><button className="secondary" onClick={()=>setMsg("Budget updated. Allocation remains based on observed sales share only.")}>Update scenario</button></div>{topP.length&&Number(budget)>0?topP.slice(0,8).map(p=>{const total=topP.reduce((s,x)=>s+Number(x.total_sales||0),0);const share=total?Number(p.total_sales)/total:0;return <div className="allocation" key={p.product_id}><div><b>Product {p.product_id}</b><span>{(share*100).toFixed(1)}% share · {usd(Number(budget)*share)}</span></div><div className="track"><span style={{width:`${share*100}%`}}/></div></div>}):<Empty/>}</article></section>}

      {tab==="Data Management" && <section className="content"><h2>Data management</h2><p className="muted">Upload a CSV or analyze the local dataset configured on the backend.</p><div className="grid2"><form className="card" onSubmit={upload}><h3>Upload CSV</h3><p className="muted">The API processes rows in chunks. Uploading a huge file may still take time.</p><label className="drop"><b>Choose a CSV file</b><input type="file" accept=".csv,text/csv" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>{file&&<p className="muted">{file.name} · {(file.size/1048576).toFixed(2)} MB</p>}<button className="primary full" disabled={busy}>{busy?"Processing…":"Upload & analyze"}</button><button type="button" className="secondary full" onClick={analyzeLocal} disabled={busy}>Analyze configured local CSV</button></form><article className="card"><h3>Data checks</h3>{[["TOTAL_SALES",data?.columns.includes("TOTAL_SALES")],["TOTAL_QUANTITY",data?.columns.includes("TOTAL_QUANTITY")],["WEEK_NO",data?.columns.includes("WEEK_NO")],["PRICE_PROXY",data?.columns.includes("PRICE_PROXY")],["Rows processed",data?.kpis.rows_processed]].map(([k,v])=><div className="quality" key={k}><span>{k}</span><b>{v===undefined?"Not checked":typeof v==="boolean"?(v?"Present":"Missing"):fmt(v)}</b></div>)}</article></div>{data&&<article className="card preview"><div className="section-head"><h3>Data preview</h3><button className="secondary" onClick={exportSummary}>Download summary JSON</button></div><div className="filters"><input placeholder="Search preview…" value={search} onChange={e=>setSearch(e.target.value)}/><select value={week} onChange={e=>setWeek(e.target.value)}><option value="all">All weeks</option>{[...new Set((data.preview||[]).map(r=>r.WEEK_NO).filter(v=>v!==undefined&&v!==""))].sort((a,b)=>Number(a)-Number(b)).map(w=><option key={w} value={w}>{w}</option>)}</select></div><div className="table-scroll"><table><thead><tr>{data.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{filtered.map((r,i)=><tr key={i}>{data.columns.map(c=><td key={c}>{r[c]??""}</td>)}</tr>)}</tbody></table></div></article>}</section>}
      <footer>EconoCausal · Research prototype · Descriptive patterns are not causal effects.</footer>
    </main>
  </div>;
}
