# @humansignal/editor-draft

Framework-agnostic draft autosave policy shared by **editor-shell**, **custom-interface hosts**, and the classic LSO editor (`Annotation.js`).

## Exports

| Function | Use |
|----------|-----|
| `shouldAutosave` | Debounced save in editor-shell (requires `hasUnsavedEdits` + `viewMode === "draft"`) |
| `shouldPersistBeforeLeave` | Navigation / `needsDraftSave` parity |
| `canWriteDraftSnapshot` | Classic `saveDraft()` FIT-1685 guard (no `hasUnsavedEdits` check) |
| `draftViewModeFromClassic` | Map `versions.draft` + `draftSelected` → `DraftViewMode` |
| `reviewHasChanges` | Review Fix+Accept vs Accept |
| `DebouncedSaveScheduler` | Generation-bump cancels in-flight debounced saves |

## TDD examples

Write table-driven tests in `draft-policy.test.ts` first, then wire consumers:

```bash
cd services/lso/web && bun test --timeout 30000 libs/editor-draft/src
```

### `shouldAutosave` (hydrate must not save)

| hasUnsavedEdits | viewMode | expect |
|-----------------|----------|--------|
| false | draft | false |
| true | draft | true |
| true | submitted | false (FIT-1685) |

### `reviewHasChanges` (BROS-1172)

| canUndo | hasUnsavedEdits | expect |
|---------|-----------------|--------|
| false | false | false |
| false | true | true |

## Related tickets

- BROS-1117 — Quick View selection / phantom draft POST
- BROS-1172 — Review stream phantom draft UI
- BROS-1196 — Flush draft on annotation switch
- BROS-1235 — History panel draft indicator layout

## Progress 0% spike (BROS-1172 secondary)

Interface project cards use `finished_task_number / task_number` in `OverviewPage.tsx`. Custom-interface completion may not increment `finished_task_number` until BE metrics align — track separately; do not block draft policy PRs.
