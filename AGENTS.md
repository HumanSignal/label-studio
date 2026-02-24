# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Label Studio is an open-source data labeling tool. It consists of a **Django backend** (`label_studio/`) and a **React/NX frontend** (`web/`). See `README.md` for full details.

### Environment setup
- Python dependencies are managed with **Poetry** and installed into a virtualenv at `.venv`. Always activate it before running Python commands: `source /workspace/.venv/bin/activate`.
- Frontend dependencies are managed with **Yarn** (`web/`). Node 22 and Yarn 1.22 are required.
- The dev database is **SQLite** (no external DB needed). Set `DJANGO_DB=sqlite`.
- `python3.12-venv` apt package is required for creating the virtualenv.
- Poetry must be installed inside the virtualenv (not system-level) to avoid permission errors with system packages.

### Running services

**Backend (Django dev server):**
```
source /workspace/.venv/bin/activate
make run-dev
```
This runs at `http://localhost:8080` with SQLite. Equivalent to:
```
DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py runserver
```

**Frontend (HMR dev server):**
```
cd web && yarn dev
```
Runs at `http://localhost:8010`. For this to work with the Django backend, create a `.env` file in the repo root with `FRONTEND_HMR=true`.

**Frontend (production build, served by Django):**
```
cd web && yarn build
```
Then `collectstatic`: `DJANGO_DB=sqlite DJANGO_SETTINGS_MODULE=core.settings.label_studio python label_studio/manage.py collectstatic --noinput`

### Migrations
Before first run: `make migrate-dev` (or see Makefile for the full env-var command).

### Linting
- **Backend:** `ruff check label_studio/` (ruff must be pip-installed in the venv; it's not a Poetry dependency)
- **Frontend:** `cd web && yarn lint` (biome) and `cd web && yarn lint-scss` (stylelint)
- See also `make fmt-check` / `make fmt` for pre-commit hook-based linting.

### Testing
- **Backend:** `cd label_studio && DJANGO_DB=sqlite DJANGO_SETTINGS_MODULE=core.settings.label_studio pytest -v -m "not integration_tests"`
  - Install test deps: `poetry install --with test`
  - `pytest-timeout` is not installed; do not use `--timeout` flag.
- **Frontend unit tests:** `cd web && yarn test:unit`
- **Frontend integration (Cypress):** `cd web && yarn lsf:integration`

### Gotchas
- The `requests` library version in the lockfile (2.32.4) triggers a warning about `HEADER_VALIDATORS` being unsupported; this is benign.
- Sass `@import` deprecation warnings during frontend build are expected and do not affect functionality.
- Redis is disabled in OSS mode (`REDIS_ENABLED=False`). Tests use `fakeredis`.
- The first backend startup makes an HTTPS call to PyPI to check for updates; this is normal.
