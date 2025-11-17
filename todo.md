# TODO: ML Backend Config UI (Hot-Reload) Feature (Current Backend)

## Objective
Allow users to dynamically adjust ML backend parameters (model path, conf/threshold, version, labels) from the Label Studio UI (Settings → Model page), send updates to the backend, and rely on your **existing hot-reload mechanism** to update the ML model without restarting the server.

> Note: Your ML backend is already functional and implements hot-reload via `HOT_RELOAD_CONFIG_FILE`. This task only adds a frontend interface + API endpoints to interact with it. Here is the path to my ml backend label-studio-ml-backend\defv2

---

## 0. Optional: Organize Backend for Agent / Automation
- [ ] Place your ML backend folder in a visible location inside the Label Studio project (e.g., `label-studio-ml-backend/`)  
- [ ] Make sure the agent / automation tool can reference this folder if generating code or scaffolding UI  

---

## 1. Backend API
- [ ] Create GET endpoint `/api/ml-config` to return current config from `HOT_RELOAD_CONFIG_FILE`  
- [ ] Create POST endpoint `/api/ml-config` to update config:
    - Update `model_path`, `conf`, `version`, `labels`
    - Validate inputs (file exists, conf between 0-1)
    - Write updated config to `HOT_RELOAD_CONFIG_FILE`
- [ ] Optional: return success / error messages
- [ ] Optional: log timestamp + user + change

---

## 2. Frontend UI
- [ ] Create `MLConfigPanel` React component
    - Fields:
        - Model Path (input / file picker)
        - Model Version (text / dropdown)
        - Confidence Threshold (number / slider)
        - Labels (multi-select / textarea)
    - Buttons:
        - Apply → POST updated config to backend
        - Optional Reset → reload current config from GET
- [ ] Placement:
    - Option A: Inline on Settings → Model page
    - Option B: Button on Settings → Model page opens modal with `MLConfigPanel`

---

## 3. Integration
- [ ] On Apply:
    - POST new config
    - Backend writes JSON
    - Existing hot-reload automatically updates the model
- [ ] Show feedback: success / fail
- [ ] Optional: display current model version from backend
- [ ] Optional: disable fields while update in progress

---

## 4. Testing
- [ ] Update model_path → confirm hot-reload triggers
- [ ] Update conf → model reloads
- [ ] Update labels → prediction labels update
- [ ] Invalid inputs rejected
- [ ] Logging shows config versions

---

## 5. Git Workflow
- [ ] Feature branch: `feature/ml-config-ui`
- [ ] Commit backend + frontend changes there
- [ ] Merge upstream periodically
- [ ] Merge to main once stable

---

## 6. Optional Enhancements
- Show GPU usage / memory during hot-reload
- Live metrics panel after config applied
- Save frequently used configs as presets
- Tooltip explaining each field
