# AGENTS.md

## Biowork product workflow

This repo is one part of the Biowork product system:

- `biowork`: product app, user workflows, annotation UI, projects, data import/export, ML backend connections.
- `biowork-ml-backend`: SAM2/FastSAM/YOLO services, active training, MLflow logging, model APIs.
- `rustfs_yolo_sam2_inference`: Kedro batch inference over Biowork datasets with a user-selected MLflow model.

Keep the repos separate and coordinate with explicit contracts, linked PRs/issues, and the GitHub Project `Biowork Product Integration`.

Default habit:

- Check branch and dirty worktree before editing.
- Create a purpose-named development branch from `origin/main` for new work.
- Do not mix unrelated issue work into an existing feature branch.
- Link paired backend/inference PRs when frontend changes depend on them.
- Update the related GitHub issue/project with investigation notes, commit hashes, run IDs, and remaining risks.
- Treat backend API/data/model behavior as a contract; document parameter, endpoint, and schema assumptions.

See `knowledge_map/features/biowork_product_workflow.md` for the cross-repo workflow notes.

## Cursor Cloud specific instructions

### Product overview

Label Studio is an open-source data labeling/annotation tool. The backend is Django + DRF, the frontend is a React/Nx monorepo under `web/`.

### Services for local development

| Service | How to run | Notes |
|---------|-----------|-------|
| **Django backend** | `make run-dev` (or see below) | Runs on port 8080, uses SQLite by default |
| **Frontend HMR** | `cd web && yarn dev` | Optional; only needed when actively editing frontend code. Without HMR, the pre-built frontend from `yarn build` is served by Django directly. |

### Running the backend

```
DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.label_studio \
  poetry run python label_studio/manage.py runserver 0.0.0.0:8080
```

Or simply: `make run-dev` (runs on localhost:8080).

Before first run, apply migrations: `make migrate-dev`.

### Building the frontend

The frontend must be built before the Django backend can serve the UI:

```
cd web && yarn install --frozen-lockfile && yarn build
```

After building, run `poetry run python label_studio/manage.py collectstatic --noinput` from the repo root to copy assets.

### Linting

- **Python**: `ruff check label_studio/` -- pre-existing warnings exist in the codebase.
- **Frontend JS/TS**: `cd web && yarn lint` (runs Biome).
- **Frontend SCSS**: `cd web && yarn lint-scss` (runs Stylelint).
- Full pre-commit checks: `make fmt-check` (requires `pre-commit` installed).

### Testing

- **Backend (pytest)**: `cd label_studio && DJANGO_DB=sqlite DJANGO_SETTINGS_MODULE=core.settings.label_studio poetry run pytest -v -m "not integration_tests"` or simply `make test`.
- **Frontend unit tests**: `cd web && yarn test:unit`.

### Gotchas

- `pyproject.toml` and `poetry.lock` may drift. If `poetry install` fails with "pyproject.toml changed significantly", run `poetry lock` first then retry.
- The frontend `editor:unit` test suite has a pre-existing failure in `DetailsPanel.test.tsx`. This is not environment-related.
- Node.js 18.x is required for the frontend build (Nx 17 compatibility).
- `ruff` is not bundled in the Poetry virtualenv; install it globally with `pip install ruff` or use `pre-commit`.
