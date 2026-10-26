from __future__ import annotations
import csv, math, os, tempfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(os.getenv("ECONOCAUSAL_PROJECT_ROOT", Path(__file__).resolve().parent.parent)).resolve()
DEFAULT = ROOT / "Output" / "causal output" / "Output" / "transaction_weekly_final.csv"
DATA_PATH = Path(os.getenv("ECONOCAUSAL_DATA_PATH", str(DEFAULT))).expanduser()
RESULTS = Path(os.getenv("ECONOCAUSAL_RESULTS_DIR", str(ROOT / "outputs" / "causal_results"))).expanduser()
CHUNK = int(os.getenv("ECONOCAUSAL_CHUNK_SIZE", "50000"))
app = FastAPI(title="EconoCausal API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173","http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])

def clean(v):
    if v is None or pd.isna(v): return None
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, (np.floating, float)):
        v=float(v); return v if math.isfinite(v) else None
    return v.item() if hasattr(v,"item") else v

def analyze(path: Path, name: str):
    if not path.exists(): raise HTTPException(404, f"CSV not found: {path}")
    try: cols=list(pd.read_csv(path,nrows=0,encoding="utf-8-sig").columns)
    except Exception as e: raise HTTPException(400,f"Cannot read CSV header: {e}")
    lookup={str(c).strip().upper():c for c in cols}
    aliases={"TOTAL_SALES":["TOTAL_SALES","SALES_VALUE","SALES"],"TOTAL_QUANTITY":["TOTAL_QUANTITY","QUANTITY","TOTAL_QTY"],"PRODUCT_ID":["PRODUCT_ID"],"STORE_ID":["STORE_ID"],"WEEK_NO":["WEEK_NO","WEEK"],"PRICE_PROXY":["PRICE_PROXY","UNIT_PRICE","PRICE"]}
    m={k:next((lookup[a] for a in vals if a in lookup),None) for k,vals in aliases.items()}
    if not m["TOTAL_SALES"] or not m["TOTAL_QUANTITY"]:
        raise HTTPException(400,"CSV must contain TOTAL_SALES and TOTAL_QUANTITY (or SALES_VALUE and QUANTITY).")
    sales_total=qty_total=0.0; n_sales=n_qty=n=0
    products=set(); stores=set(); weeks=defaultdict(lambda:[0.,0.,0]); ps=Counter(); ss=Counter(); preview=[]; prices=[]; rng=np.random.default_rng(42)
    try:
        for chunk in pd.read_csv(path,chunksize=CHUNK,encoding="utf-8-sig",low_memory=True):
            n+=len(chunk)
            if len(preview)<30: preview.extend(chunk.head(30-len(preview)).to_dict("records"))
            s=pd.to_numeric(chunk[m["TOTAL_SALES"]],errors="coerce"); q=pd.to_numeric(chunk[m["TOTAL_QUANTITY"]],errors="coerce")
            sales_total+=float(s.sum()); qty_total+=float(q.sum()); n_sales+=int(s.notna().sum()); n_qty+=int(q.notna().sum())
            if m["PRODUCT_ID"]:
                ids=chunk[m["PRODUCT_ID"]].dropna().astype(str); products.update(ids.unique())
                g=pd.DataFrame({"id":chunk[m["PRODUCT_ID"]].astype("string"),"v":s}).dropna().groupby("id")["v"].sum()
                for k,v in g.items(): ps[str(k)]+=float(v)
            if m["STORE_ID"]:
                ids=chunk[m["STORE_ID"]].dropna().astype(str); stores.update(ids.unique())
                g=pd.DataFrame({"id":chunk[m["STORE_ID"]].astype("string"),"v":s}).dropna().groupby("id")["v"].sum()
                for k,v in g.items(): ss[str(k)]+=float(v)
            if m["WEEK_NO"]:
                g=pd.DataFrame({"w":chunk[m["WEEK_NO"]].astype("string"),"s":s,"q":q}).dropna(subset=["w"]).groupby("w").agg(s=("s","sum"),q=("q","sum"),n=("w","size"))
                for w,r in g.iterrows():
                    weeks[str(w)][0]+=float(r.s); weeks[str(w)][1]+=float(r.q); weeks[str(w)][2]+=int(r.n)
            if m["PRICE_PROXY"]:
                v=pd.to_numeric(chunk[m["PRICE_PROXY"]],errors="coerce").dropna()
                v=v[np.isfinite(v)&(v>0)].tolist()
                prices.extend(v)
                if len(prices)>50000:
                    idx=rng.choice(len(prices),50000,replace=False); prices=[prices[i] for i in idx]
    except Exception as e: raise HTTPException(400,f"CSV processing failed: {e}")
    def sort_week(x):
        try:return (0,float(x))
        except:return (1,x)
    weekly=[{"week":clean(w),"total_sales":v[0],"total_quantity":v[1],"row_count":v[2]} for w,v in sorted(weeks.items(),key=lambda kv:sort_week(kv[0]))]
    hist={"bins":[],"counts":[]}
    if prices:
        counts,edges=np.histogram(prices,bins=min(20,max(5,int(np.sqrt(len(prices))))))
        hist={"bins":[float((edges[i]+edges[i+1])/2) for i in range(len(counts))],"counts":[int(x) for x in counts]}
    preview=[{str(k):clean(v) for k,v in row.items()} for row in preview]
    warnings=[f"{k} missing; related charts may be unavailable." for k in ["PRODUCT_ID","STORE_ID","WEEK_NO","PRICE_PROXY"] if not m[k]]
    return {"dataset_name":name,"columns":[str(c) for c in cols],"preview":preview,"weekly":weekly,
      "top_products":[{"product_id":k,"total_sales":v} for k,v in ps.most_common(10)],
      "top_stores":[{"store_id":k,"total_sales":v} for k,v in ss.most_common(10)],
      "price_histogram":hist,"kpis":{"total_sales":sales_total,"total_quantity":qty_total,"weighted_price_proxy":sales_total/qty_total if qty_total else None,"unique_products":len(products),"unique_stores":len(stores),"rows_processed":n,"valid_sales_rows":n_sales,"valid_quantity_rows":n_qty},
      "warnings":warnings,"message":f"Processed {n:,} rows in chunks. "+" ".join(warnings)}

@app.get("/api/health")
def health(): return {"status":"ok","chunk_size":CHUNK}

@app.get("/api/analyze-local")
def analyze_local(): return analyze(DATA_PATH,DATA_PATH.name)

@app.post("/api/analyze-upload")
async def analyze_upload(file: UploadFile=File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"): raise HTTPException(400,"Please upload a .csv file.")
    temp=None
    try:
        with tempfile.NamedTemporaryFile(delete=False,suffix=".csv") as f:
            temp=Path(f.name)
            while True:
                block=await file.read(1024*1024)
                if not block: break
                f.write(block)
        return analyze(temp,Path(file.filename).name)
    finally:
        await file.close()
        if temp: temp.unlink(missing_ok=True)

@app.get("/api/causal-results")
def causal_results():
    names=["01_join_validation.csv","02_treatment_balance.csv","03_dowhy_results.csv","04_dowhy_refutation.csv","05_econml_dml_results.csv","06_combined_model_summary.csv","07_promotion_treatment_audit.csv"]
    result=[]
    for name in names:
        p=RESULTS/name
        if not p.exists(): result.append({"file":name,"status":"not found","rows":0,"columns":[]}); continue
        try:
            with p.open(encoding="utf-8-sig",newline="") as f:
                r=csv.reader(f); cols=next(r,[]); count=sum(1 for _ in r)
            result.append({"file":name,"status":"available","rows":count,"columns":cols})
        except Exception as e: result.append({"file":name,"status":"unreadable","rows":0,"columns":[],"error":str(e)})
    return {"results_directory":str(RESULTS),"files":result}
