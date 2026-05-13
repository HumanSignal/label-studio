# Biowork Product Workflow

Biowork is managed as separate repos with one shared integration discipline:

- `biowork`: frontend/product app and Label Studio workflows.
- `biowork-ml-backend`: ML backend services, active training, MLflow tracking, and model APIs.
- `rustfs_yolo_sam2_inference`: Kedro full-dataset inference using RustFS data and a selected MLflow model.

## Coordination

- Use the GitHub Project `Biowork Product Integration` for shared planning.
- Create a development branch for each issue or feature.
- For cross-repo changes, use matching branch names where practical and link paired PRs.
- Record progress on GitHub: investigation notes, run IDs, commit hashes, test results, and remaining risks.
- Keep API, data, and model-selection assumptions explicit in docs, parameters, or tests.

## Data And Model Flow

1. Biowork owns projects, annotations, label configs, dataset selection, and user-facing training/inference controls.
2. The ML backend receives prediction/training events, trains asynchronously where possible, and logs MLflow runs.
3. MLflow stores model lineage, metrics, artifacts, failures, and promotion state.
4. RustFS stores Biowork datasets and MLflow artifacts, scoped by purpose/project/dataset rather than by one dataset name.
5. The Kedro inference pipeline reads a selected Biowork dataset from RustFS and uses the user-selected active MLflow model for full-dataset inference.

## Service Boundaries

- MLflow is shared product infrastructure and should stay outside dataset-specific folders.
- MLflow should stay tailnet-only unless explicitly changed.
- Docker dev and prod networks must stay separated. When changing ML backend networking, follow the local `biowork-ml-topology` skill.
- Verify service behavior from the caller container or network, not only from the host.

## Verification

- Run focused tests for changed code.
- Add integration checks when a change affects frontend/backend contracts or model lifecycle.
- For training issues, inspect event receipt, job enqueueing, backend logs, MLflow run status, metrics, artifacts, and promotion state.
