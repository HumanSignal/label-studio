CI container helpers

Usage (from repo root):

1) Build frontend and run build inside container:

```powershell
docker compose -f docker/ci/docker-compose.test.yml build frontend-build
docker compose -f docker/ci/docker-compose.test.yml run --rm frontend-build
```

2) Run backend tests (will install dependencies via poetry inside container):

```powershell
docker compose -f docker/ci/docker-compose.test.yml build backend-test
docker compose -f docker/ci/docker-compose.test.yml run --rm backend-test
```

Notes:
- The backend Dockerfile uses `poetry` and will install dependencies declared in `pyproject.toml`, including the `test` extras.
- First run may take time to download and build dependencies. Use a CI runner with sufficient memory.
- If you prefer pip-based install, edit `docker/ci/backend.Dockerfile` to `pip install -r requirements.txt` (project uses poetry by default).
