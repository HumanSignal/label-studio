# Biowork Template as Project Entrypoint

This guide explains how Biowork templates are used as an orchestration
entrypoint, not just as XML UI presets.

Use this when you need to:
- spin up a Biowork-ready project with correct defaults,
- understand why ML backends were auto-connected,
- pass backend startup args (`extra_params`) from template config,
- avoid duplicate/competing backend attachments.

---

## Why this matters

In this fork, selecting a Biowork template drives multiple layers:

1. **Labeling interface** (`label_config` XML)
2. **Default Create Project behavior** (forced template shortlist + default pick)
3. **ML backend bootstrap** (template-declared `ml_backends` attached post-save)
4. **Interactive UX defaults** (`is_interactive`, reveal preannotations behavior)
5. **Backend setup args** (`extra_params` pushed to `/setup` on ML backend)

Treat template selection as a project bootstrap pipeline, not just UI cosmetics.

---

## Files to know

### Template definitions
- `label_studio/annotation_templates/biowork/fastsam-interactive-segmentation/config.yml`
- `label_studio/annotation_templates/biowork/sam2-interactive-segmentation/config.yml`
- `label_studio/annotation_templates/groups.txt`

### Template loading API
- `label_studio/projects/api.py`:
  - `read_templates_and_groups()`
  - `TemplateListAPI`
- `label_studio/projects/urls.py`:
  - `/api/templates/`

### Project creation flow (frontend)
- `web/apps/labelstudio/src/pages/CreateProject/utils/useDraftProject.js`
- `web/apps/labelstudio/src/pages/CreateProject/CreateProject.jsx`
- `web/apps/labelstudio/src/config/ApiConfig.js`

### ML backend creation/setup flow (backend)
- `label_studio/ml/api.py` (`MLBackendListAPI.perform_create`)
- `label_studio/ml/models.py` (`MLBackend.update_state`, `MLBackend.setup`)
- `label_studio/ml/api_connector.py` (`MLApi.setup`)
- `label_studio/ml/serializers.py` (URL/auth/setup validation)

### Global default ML auto-attach (non-template path)
- `label_studio/core/settings/label_studio.py`
- `label_studio/projects/api.py` (`ProjectListAPI.perform_create`)
- `label_studio/server.py` (`_create_project` in CLI flow)

---

## End-to-end lifecycle

### 1) Template catalog is exposed from YAML

`TemplateListAPI` returns all templates + groups from `annotation_templates`.
`read_templates_and_groups()` parses every `**/*.yml` under that directory.

Important:
- `groups.txt` drives group ordering and includes `Biowork`.
- YAML can include:
  - `config` (XML label interface)
  - `ml_backends` (one or more backend declarations)
  - metadata (`title`, `group`, `order`, `image`).

---

### 2) Create Project screen enforces Biowork entrypoint

In `CreateProject.jsx`:
- it calls `configTemplates` (`GET /api/templates`);
- filters templates to:
  - `"Full Auto Detection"` (FastSAM),
  - `"Semi Auto Detection"` (SAM2);
- defaults to `"Full Auto Detection"` when no recipe is selected.

It also writes the selected template `config` into draft project
`label_config` early, so users start from Biowork-compatible tags.

Implication:
- Biowork template selection is a product decision embedded in project creation,
  not just optional browsing in the generic template gallery.

---

### 3) Save attaches template-defined ML backends

During final save in `CreateProject.jsx`:
- project is updated via `PATCH /api/projects/:pk`,
- then `selectedRecipe.ml_backends` are attached via `POST /api/ml`,
- URLs are deduplicated against existing project backends.

For each template backend:
- `url`, `title`, `is_interactive` are sent;
- `extra_params` are always sent as a string
  (`JSON.stringify` when source is object).

This keeps compatibility with older ML backends while still carrying setup
arguments through the same path (often as JSON-string payloads).

---

### 4) ML backend setup receives project schema + extra params

`POST /api/ml` creates `MLBackend`, then `update_state()` runs:
- health check (`/health`),
- setup call (`/setup`) with:
  - project UID,
  - project labeling schema (`project.label_config`),
  - creator token,
  - `extra_params`.

That means template-declared `extra_params` become runtime setup inputs for
FastSAM/SAM2 backends (for example, SAM preannotation mode toggles).

---

## The two auto-attach mechanisms (easy to confuse)

There are two separate ways ML backends get attached:

1. **Template-driven attachment (frontend save flow)**
   - source: `selectedRecipe.ml_backends`
   - attached after final project save in `CreateProject.jsx`
   - dedupe by URL in UI logic

2. **Global default backend (backend setting)**
   - source: `ADD_DEFAULT_ML_BACKENDS` + `DEFAULT_ML_BACKEND_URL`
   - executed in `ProjectListAPI.perform_create` (API) and `_create_project` (CLI)
   - happens on every project create request when enabled

Operationally, both can run for the same project.

If default URL differs from template URL, you may end up with multiple
connected backends. If same URL, UI-side dedupe prevents re-adding on save.

---

## Hidden sequence detail: draft creation can pre-attach default backend

The Create Project wizard first creates a draft project in
`useDraftProject.js` via `POST /api/projects`.

If global default ML auto-attach is enabled, that draft creation already
creates an ML backend before the user clicks Save.

Then Save may add template ML backend(s) again (dedupe by URL).

When debugging "unexpected backend already present", check this order first.

---

## Template-specific backend contracts

### Full Auto Detection (FastSAM)
- template: `fastsam-interactive-segmentation/config.yml`
- backend URL: `http://fastsam-backend:9090`
- `is_interactive: true`
- `extra_params`: currently present as commented example only.

### Semi Auto Detection (SAM2)
- template: `sam2-interactive-segmentation/config.yml`
- backend URL: `http://sam2-backend:9090`
- `is_interactive: true`
- `extra_params` includes `SAM_PREANNOTATE: 0`.

`SAM_PREANNOTATE` is carried through to ML setup as `extra_params`.

---

## Agent playbook: recommended usage

When implementing new Biowork project bootstrapping behavior:

1. **Prefer template-level config first**
   - Put per-template backend args under `ml_backends[].extra_params`.
2. **Only use global default ML settings for broad fallback**
   - They apply to all project creation paths, including draft creation and CLI.
3. **Keep URL dedupe in mind**
   - Dedupe happens in frontend save logic by backend URL.
4. **Preserve interactive defaults**
   - `is_interactive` should stay true for interactive segmentation.
5. **Validate setup payload effects**
   - Confirm backend receives desired `extra_params` in `/setup`.

---

## Common pitfalls

- **Assuming templates only affect XML**:
  they also drive backend attachment and setup arguments.
- **Forgetting draft-project create side effects**:
  default ML attachment may already have happened before Save.
- **Mixing template and global defaults unintentionally**:
  can produce extra backends and ambiguous model selection.
- **Passing non-serializable extra params**:
  frontend intentionally stringifies object params for compatibility.

---

## Quick validation checklist

For a newly created project from each Biowork template:

- [ ] `label_config` matches selected template XML.
- [ ] expected ML backend URL exists on project.
- [ ] backend is connected (`state=Connected`).
- [ ] `is_interactive=true`.
- [ ] `reveal_preannotations_interactively` is enabled when default auto-attach path is used.
- [ ] template `extra_params` reached ML backend `/setup`.
- [ ] no unexpected duplicate backend URLs.

---

## Related docs

- `knowledge_map/BIOWORK_FORK_OVERVIEW.md` (§1, §11, §14)
- `knowledge_map/features/toolbar_auto_annotation_toggle.md`
- `knowledge_map/ENV_TEMPLATE_REFERENCE.md`
