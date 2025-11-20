**Manual: Starting Frontend and Backend (PowerShell)**

This manual describes how to start the Label Studio frontend (NX/Yarn) and Django backend in a Windows PowerShell environment, how to test the ML hot-reload config and GPU resource endpoints, and common troubleshooting steps.

Prerequisites
- Node.js and Yarn installed (recommended Node 18+). Verify with `node -v` and `yarn -v`.
- Python 3.8+ and a virtual environment for the backend. Verify with `python --version`.
- (Optional) `nvidia-smi` available on the server if you want GPU/resource monitoring.

Paths used in examples
- Repository root: `%CD%` when you open a PowerShell session at the project root (e.g., `C:\Users\1003380\label-studio-WIP`).
- Frontend folder: `web`.
- Django backend manage script: `label_studio\manage.py`.
- ML backend config file (example): `label-studio-ml-backend\defv2\config.json`.

1) Start the frontend (development HMR)

Open PowerShell in the repository root and run:

```powershell
cd .\web
# install dependencies (only if not already installed)
yarn install

# Start dev server (NX/Yarn). These env vars are PowerShell-friendly examples used during development.
$env:NODE_ENV = 'development'; $env:BUILD_NO_SERVER = 'true'; yarn ls:dev
```

Notes:
- The dev server typically serves assets on `http://localhost:8010` (check the console output for the exact port).
- If you see `X-Content-Type-Options: nosniff` and a static file returning `text/html`, open DevTools Network tab and inspect the response body — the dev server often returns an HTML error page which helps diagnose the root cause.

2) Start the Django backend

Open a new PowerShell session (or use the existing one after setting up the Python venv) and run:

```powershell
# Optional: activate your virtualenv, e.g.:
# .\venv\Scripts\Activate.ps1

# Set HOT_RELOAD_CONFIG_FILE so the backend knows which ML config file to use.
# Adjust the path below to your workspace location.
$env:HOT_RELOAD_CONFIG_FILE = 'C:\Users\1003380\label-studio-WIP\label-studio-ml-backend\defv2\config.json'
$env:LOCAL_FILES_SERVING_ENABLED="true"
# Run Django development server bound to all interfaces on port 8080
python .\label_studio\manage.py runserver 0.0.0.0:8080

python _wsgi.py --host 0.0.0.0 --port 9090 
```

Notes:
- Setting `HOT_RELOAD_CONFIG_FILE` in PowerShell before starting Django is the easiest way to make `/api/ml/config` work during local development when the ML backend constant points to a different path (e.g., a Linux path inside the ML backend package).
- If you prefer to set this permanently, add `HOT_RELOAD_CONFIG_FILE` to your system environment variables or into Django settings (not recommended for temporary dev work).

3) Test the API endpoints

With both servers running, you can test the endpoints from PowerShell or the browser.

# GET current ML config
```powershell
Invoke-RestMethod http://localhost:8080/api/ml/config
```

# POST update ML config (example payload saved to a file then POSTed)
```powershell
$json = @'
{
  "model_path": "C:\\\\path\\\\to\\\\model",
  "conf": 0.35,
  "version": "v1.2",
  "labels": { "LabelA": 0, "LabelB": 1 }
}
'@
$json | Out-File -Encoding utf8 .\payload.json
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body (Get-Content .\payload.json -Raw) http://localhost:8080/api/ml/config
```

# GET GPU resources (requires `nvidia-smi` on the server)
```powershell
Invoke-RestMethod http://localhost:8080/api/ml/resources
```

4) Troubleshooting

- `{"error":"HOT_RELOAD_CONFIG_FILE not found"}`:
  - Ensure you set `HOT_RELOAD_CONFIG_FILE` environment variable to the correct absolute path and restart Django.
  - Or, install the ML backend package such that importing `label_studio_ml.defv2.model` works and points to the config path inside the ML package.

- `Uncaught ReferenceError: jQuery is not defined` in the frontend dev build:
  - Temporary fix: `web/apps/labelstudio/src/index.html` may include a CDN script tag for jQuery during development. Long-term, remove legacy jQuery usage or bundle the dependency properly.

- MIME type nosniff/static returns `text/html` for JS/CSS:
  - Inspect the response body in DevTools — often the dev server returned an HTML error (stack trace or 404 page). Fix the underlying build or path issue instead of disabling `nosniff`.

- CORS / Mixed-origin errors when calling `http://localhost:8080` from the dev server at another port:
  - The dev server usually proxies API requests to the backend. If you fetch with absolute URLs, ensure the backend has appropriate CORS settings enabled or use the dev server's proxy configuration.

5) Next steps and tips

- If you want the frontend to call the backend without CORS headaches during development, run the frontend dev server with the default proxy setup so relative fetches to `/api/*` are forwarded to `localhost:8080`.
- After changing `HOT_RELOAD_CONFIG_FILE`, confirm the file exists and that the Django process has permission to read/write it.
- To observe hot-reload behavior for the ML backend, run the ML backend process (if separate) and trigger a model usage (prediction) — the ML backend logs show reloads when the config file changes.

If anything in this manual doesn't work on your machine, paste the terminal output and any browser console logs and I'll help diagnose.