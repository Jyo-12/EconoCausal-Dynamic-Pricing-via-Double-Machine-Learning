# EconoCausal Integrated Dashboard

## Copy files into your existing repository
- Copy `dashboard/src/App.jsx` to your repository's `dashboard/src/App.jsx`.
- Copy `dashboard/src/App.css` to `dashboard/src/App.css`.
- Copy the `api` folder to your repository root.
Keep your existing `dashboard/package.json`, `src/main.jsx`, and Vite config.

## Configure and run backend (PowerShell)
Open a second VS Code terminal at the repository root. If your environment is the one used for your notebooks:

```powershell
& "D:\EconoCausal_Env\env\python.exe" -m pip install -r api\requirements.txt
$env:ECONOCAUSAL_DATA_PATH = "D:\Econocausal Double machine learning project\EconoCausal-Dynamic-Pricing-via-Double-Machine-Learning\Output\causal output\Output\transaction_weekly_final.csv"
$env:ECONOCAUSAL_PROJECT_ROOT = "D:\Econocausal Double machine learning project\EconoCausal-Dynamic-Pricing-via-Double-Machine-Learning"
& "D:\EconoCausal_Env\env\python.exe" -m uvicorn main:app --app-dir api --host 127.0.0.1 --port 8000 --reload
```

Adjust the paths to match the folders that actually exist on your computer. Visit `http://127.0.0.1:8000/api/health` to confirm the API is running.

## Run frontend
In a separate terminal:
```powershell
cd dashboard
npm run dev
```
Open the URL Vite prints, usually `http://localhost:5173`.

## Analytical caveats
- Metrics and charts are descriptive summaries of the processed CSV.
- The backend reads the CSV in chunks. Uploading a huge file still requires transferring it through the browser; prefer "Analyze configured local CSV" for large local data.
- `weighted_price_proxy` is total sales / total quantity, not an independent causal treatment.
- Budget allocations use observed sales shares only. They are illustrative, not causal uplift or profit optimization.
- Causal page lists existing output files and their dimensions. A file being present does not mean an effect was successfully estimated.
- Exact unique product/store counts use sets and can consume memory for extremely high-cardinality data. If this is a problem, switch to DuckDB-based aggregation.
