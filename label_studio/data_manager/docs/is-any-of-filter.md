# Data Manager filter: `is any of` / `is none of`

Design doc for adding a list-membership filter operator to Data Manager (DM) so users can filter tasks by a pasted list of IDs / values without creating dozens of OR clauses.

> **Status:** draft / proposal
> **Author:** product request from field experience
> **Audience:** LSO + LSE backend, Data Manager frontend, SDK
> **Related ticket:** TBD
> **Related screenshots:** `screenshot 1` (operator UI), `screenshot 2` (later workflow: "Create tab from list")

---

## 1. TL;DR

- Add two DM filter operators: **`is any of`** and **`is none of`**.
- They accept a **pasted multiline / comma / semicolon / whitespace-separated** list of values (IDs, internal object IDs, etc.).
- MVP support is intentionally narrow: **Task ID**, **Inner ID**, and **`task.data.*` fields** only.
- Backend operator engine already has a generic list-membership primitive (`in_list` / `not_in_list` map to Django `__in`), but it is currently too permissive and under-validated for public use. The feature should add a clear support contract, validation, and UI exposure.
- No DB migration required. `Filter.value` is a `JSONField` and already accepts lists.
- Existing `annotations_ids` "smart contains" behaviour is useful evidence that list filtering is already needed, but it should stay a legacy special case and **not** be part of the MVP support surface.

---

## 2. Goals & non-goals

### Goals

- One operator that lets a user filter a DM tab by a list of values: 100 task IDs, 500 `data.object_id` values, etc.
- Works for the most common cases users currently solve via spreadsheets:
  - "Open these 250 task IDs."
  - "Show me only tasks where `data.object_id` ∈ this list of QA findings."
  - "Exclude these N already-paid task IDs from the next batch."
- First release supports only:
  - `filter:tasks:id`
  - `filter:tasks:inner_id`
  - `filter:tasks:data.<field>`
- First-class in UI, OpenAPI schema, and SDK.
- Persists into a saved DM tab (`View`) so it can be shared, re-used, and pre-applied for assignments / next-task / actions.
- Predictable AND/OR composition with other filters.

### Non-goals (explicitly out of scope for this doc)

- "Create tab from list" modal (paste → preview → save tab). That is a separate, follow-up doc; this operator is its prerequisite.
- Inline editing of `task.data` cells in DM.
- Adding ad-hoc columns to DM.
- Datetime list membership ("any of these 50 timestamps").
- Direct deep links of the form `…/tasks/?data.object_id=123` (related but separate; see the user request item 2.3.1).
- Dataset / vector DB filtering: datasets module already has its own filter engine.
- Annotation / prediction / review / assignment derived fields, including `annotations_ids`, `annotations_results`, `predictions_results`, `annotators`, `reviewers`, `updated_by`, `agreement`, `state`, counters, and payment fields. Some may already work by accident or via special logic, but they are not part of the MVP contract.

---

## 3. Naming

| Surface | Name |
|---|---|
| UI operator label | **`is any of`** / **`is none of`** |
| UI input | multiline textarea + parsed-count badge |
| Backend operator key (wire format) | `in_list` / `not_in_list` |
| Public `Operator` enum (`prepare_params.py`) | `IS_ANY_OF = 'in_list'`, `IS_NONE_OF = 'not_in_list'` |
| SDK constants | already present: `Operator.IN_LIST`, `Operator.NOT_IN_LIST` |

### Why keep `in_list` as the wire format

- It is **already** implemented in `services/lso/label_studio/data_manager/managers.py` (`_Operator.IN_LIST`, `_Operator.NOT_IN_LIST` → `Q(field__in=value)` / `~Q(field__in=value)`).
- It is **already** present in the published Python SDK (`label_studio_sdk/data_manager.py`: `Operator.IN_LIST`, `Operator.NOT_IN_LIST`).
- Renaming the wire key would silently break:
  - any saved `View` already created via the SDK,
  - any user script using the SDK constants,
  - the existing `annotations_ids` "contains-then-rewrite-to-in_list" hack.

### Why **not** call it `in` in UI

The wire key `in` is **already used for "is between"** (Number / Datetime ranges). Reusing the word would be ambiguous to both engineers and users. Keep UI labels distinct (`is between` vs `is any of`) even though the wire keys (`in` vs `in_list`) are different.

---

## 4. Current state of the code

### 4.1. Operator engine (LSO backend)

`services/lso/label_studio/data_manager/managers.py`:

- `_Operator.IN_LIST = 'in_list'`, `_Operator.NOT_IN_LIST = 'not_in_list'` are defined in the internal operator table.
- `apply_filters()` already handles them:

  ```python
  # in list
  elif _filter.operator == 'in_list':
      filter_expressions.append(
          Q(**{f'{field_name}__in': _filter.value}),
      )

  # not in list
  elif _filter.operator == 'not_in_list':
      filter_expressions.append(
          ~Q(**{f'{field_name}__in': _filter.value}),
      )
  ```

- For `task.data.*` Number fields, `apply_filters()` annotates the queryset with `Cast(KeyTextTransform(json_field, 'data'), output_field=FloatField())` and routes the operator against the cast field. This already works for `in_list` because the operator simply uses `__in`.

- A hidden "list-membership-via-contains" hack exists for the `annotations_ids` column:

  ```python
  if field_name == 'annotations_ids':
      field_name = 'annotations__id'
      if 'contains' in _filter.operator:
          # convert string like "1 2,3" => [1,2,3]
          _filter.value = [
              int(value) for value in re.split(',|;| ', _filter.value) if value and value.isdigit()
          ]
          _filter.operator = 'in_list' if _filter.operator == 'contains' else 'not_in_list'
  ```

  This is essentially the same idea, but only for one column, with no UI affordance, no validation, and no error reporting. It is evidence that users already need list filtering, but it should not define the public MVP behaviour.

#### How `in_list` / `not_in_list` actually work today

The existing backend behaviour is very small and generic:

1. `apply_filters()` preprocesses the requested filter column:
   - `filter:tasks:id` → `id`
   - `filter:tasks:inner_id` → `inner_id`
   - `filter:tasks:data.object_id` → `data__object_id`
2. LSE or field-specific custom filter hooks may intercept some fields before the generic path.
3. For `type == 'Number'` and `field_name.startswith('data__')`, the code annotates a temporary numeric field using `Cast(KeyTextTransform(...), FloatField())`.
4. For `operator == 'in_list'`, the code adds `Q(field__in=value)`.
5. For `operator == 'not_in_list'`, the code adds `~Q(field__in=value)`.

Important implications:

- There is **no field compatibility check** today. If a caller sends `in_list` for a field that reaches the generic branch, the backend will try to build a Django `__in` lookup.
- There is **no value-shape validation** today. If a caller sends a string instead of a list, Django may interpret it badly or fail late.
- There is **no list element casting** today. Unlike `equal`, `greater`, or range `in`, the `in_list` branch does not call `cast_value()`. The caller must already send correctly typed list values.
- Some fields may appear to work by accident:
  - direct `Task` model fields like `id` / `inner_id` if the value list is numeric,
  - `task.data.*` if Django's JSONField lookup semantics match the supplied list values,
  - `annotations_ids` because it is explicitly remapped to `annotations__id`.
- Some fields can be wrong, slow, or error-prone:
  - virtual / annotated fields that require `get_fields_for_evaluation()` setup,
  - LSE custom fields intercepted by `lse_custom_filter_expressions()`,
  - relation-backed fields (`annotators`, `reviewers`, `updated_by`),
  - JSON result fields (`annotations_results`, `predictions_results`, `*_results_json.*`).

So the current implementation is a useful primitive, not a finished feature. The MVP should wrap it with a narrow support contract.

#### MVP support contract

The first supported release should allow `in_list` / `not_in_list` only for these fields:

| User-facing column | API filter | Type handling | Why support it |
|---|---|---|---|
| Task ID | `filter:tasks:id` | Number list | Primary spreadsheet-to-DM workflow; indexed and fast. |
| Inner ID | `filter:tasks:inner_id` | Number list | Useful when users refer to project-local task numbers. In multi-project queries it is ambiguous unless the queryset is already project-scoped. |
| Task data field | `filter:tasks:data.<field>` | String / Unknown / Number list | Main customer workflow: external object IDs, batch IDs, internal IDs, QA findings. |

Everything else should be rejected by the API for these operators in the first release with a clear error:

```json
{
  "detail": "`is any of` and `is none of` support only Task ID, Inner ID, and task.data.* fields in this release."
}
```

This keeps the product promise small and makes performance/testing tractable.

### 4.2. Public schema (`prepare_params.py`)

`services/lso/label_studio/data_manager/prepare_params.py`:

```python
class Operator(CustomEnum):
    EQUAL = 'equal', 'Equal to'
    ...
    IS_BETWEEN = 'in', 'Is between min and max values, ... `{"min": 1, "max": 7}`'
    NOT_BETWEEN = 'not_in', '...'
```

`in_list` / `not_in_list` are **NOT** in this enum. That means:
- They are not documented in the API.
- They are not part of the OpenAPI / Fern schema.
- They are not generated into the (auto-generated portion of the) SDK.
- The DM frontend has no operator entry that uses them.

The `value` schema in `filters_schema` already permits a list (`{"type": "object", "title": "List", "description": "List of strings or integers"}` and `Filter.value: Union[..., list]` in the Pydantic model). So the wire format already accepts the right shape.

### 4.3. LSE overrides

`services/lse/label_studio_enterprise/lse_data_manager/managers.py` defines `lse_custom_filter_expressions()` which intercepts a small set of fields (`payment_status`, `annotations_results`, `annotators`, `reviewers`, `comments`, `comment_authors`, `annotations_results_json.*`, `predictions_results_json.*`). It does **not** override list-membership behaviour for arbitrary fields — generic LSO logic still applies.

### 4.4. Frontend filter type definitions

`services/lso/web/libs/datamanager/src/components/Filters/types/`:

- `String.jsx`: operators `contains`, `not_contains`, `regex`, `equal`, `not_equal`. All single-value text inputs.
- `Number.jsx`: operators `equal`, `not_equal`, `less`, `greater`, `less_or_equal`, `greater_or_equal`, `in` (= "is between"), `not_in` (= "not between"). Range uses `valueType: 'range'` + `RangeInput`.
- `Date.jsx` / `Datetime`: same range pattern.
- `List.jsx`: `contains`, `not_contains` over a **predefined** `schema.items` enum (annotators, reviewers, model versions). Multi-select dropdown — **not** a paste-list-of-arbitrary-values input.
- `Boolean.jsx`: `equal` only.
- `Common.jsx`: `empty`.

`FilterLine/FilterOperation.jsx` chooses which input to render based on `selected.input` and passes `value` from the MST store. The `value` itself is already JSON-serialized into `Filter.value` (`JSONField`) on save.

There is currently **no `valueType: 'list'`** input component. We need to add one.

### 4.5. View / Filter persistence

`services/lso/label_studio/data_manager/models.py`:

- `Filter.value = JSONField(default=dict, null=True)` — accepts list as-is. **No migration required.**
- `Filter.operator` is a free `CharField(max_length=1024)`. No enum constraint at the DB level.
- `View.data` JSON contains the filter dicts as the frontend receives them (`{"filter": "filter:tasks:id", "operator": "in_list", "type": "Number", "value": [1, 2, 3]}`).

### 4.6. Security

`services/lso/label_studio/data_manager/serializers.py::FilterSerializer.validate_column()` enforces:
- column must start with `filter:tasks:`,
- `__` (FK traversal) is rejected unless allowlisted via `DATA_MANAGER_FILTER_ALLOWLIST`.

This is **column-side** validation. The operator value is JSON, parametrised by Django ORM, so list-of-values does not introduce SQL injection.

### 4.7. Existing tests

- No tests for `in_list` / `not_in_list` (excluding the implicit `annotations_ids` smart-contains path).
- The Tavern suite tests `DATA_MANAGER_FILTER_ALLOWLIST` validation.

---

## 5. Implementation options

Three viable approaches; ordered from cheapest to most disruptive.

### Option A — "Expose the existing primitive with a narrow support contract" (recommended MVP)

**Idea:** add `in_list` / `not_in_list` to the public `Operator` enum, add backend validation that only allows Task ID / Inner ID / `task.data.*`, add frontend operator entries only for those columns, and ship behind a feature flag.

- **Pros**
  - Reuses the existing backend query primitive while avoiding unsupported fields.
  - Smallest implementation that matches the real user problem.
  - Clear API error for unsupported fields instead of accidental `FieldError` / wrong results.
  - Wire format unchanged (`in_list`), so the SDK keeps working and any prior power-user scripts remain valid.
  - Easy to gate with a feature flag in the UI while keeping backend validation deterministic.
- **Cons**
  - Does **not** rationalise the `in` (between) vs `in_list` (membership) overlap in the wire vocabulary; relies on UX wording to make them distinct.
  - Does **not** support potentially useful secondary fields (`annotations_ids`, `updated_by`, counters, etc.) until we explicitly test and opt them in.

### Option B — "Replace `in` with `between`, free up `in` for membership"

**Idea:** rename wire keys to clearly separate concepts: `between` for ranges, `in` for membership.

- **Pros**
  - Reads more naturally.
- **Cons**
  - Breaks every saved `View` and every SDK script that uses `Operator.IN`.
  - Requires a one-shot DB migration to rewrite `Filter.operator` values.
  - High risk for low semantic gain. **Strongly not recommended.**

### Option C — "Smart `equal` that accepts a list"

**Idea:** keep `equal` / `not_equal`, detect when `value` is a list, switch to `__in` automatically.

- **Pros**
  - No new operator, no schema change.
- **Cons**
  - Type-overloaded operator — UI cannot tell the user what input to render.
  - Implicit behaviour is hostile to API consumers who set `value` to a string that happens to look list-y.
  - SDK already has explicit `IN_LIST` constants — implicit overload would conflict.
  - **Not recommended.**

### Option D — "Server-only operator, no UI"

**Idea:** publish in OpenAPI/SDK only; do not add a UI affordance. Users get it via the SDK.

- **Pros**
  - Zero frontend work.
- **Cons**
  - Does not solve the actual user pain — the original ask is explicitly UI-driven (paste a column from a spreadsheet into DM). API-only is the status quo (the operator already works server-side; nobody knows).
  - **Not recommended as the primary deliverable**, but Phase 0 (just exposing it in the schema and SDK, then shipping UI in Phase 1) is a reasonable stepping stone.

### Recommendation

Ship **Option A**. Do not present this as a general-purpose list membership operator for every DM column yet. Product copy should say:

> Filter Task ID, Inner ID, or a `task.data` field by a pasted list of values.

---

## 6. Backend changes (recommended path)

### 6.1. Public `Operator` enum

`services/lso/label_studio/data_manager/prepare_params.py`:

```python
class Operator(CustomEnum):
    EQUAL = 'equal', 'Equal to'
    NOT_EQUAL = 'not_equal', 'Not equal to'
    GREATER = 'greater', 'Greater than'
    GREATER_OR_EQUAL = 'greater_or_equal', 'Greater than or equal to'
    LESS = 'less', 'Less than'
    LESS_OR_EQUAL = 'less_or_equal', 'Less than or equal to'
    CONTAINS = 'contains', 'Contains'
    NOT_CONTAINS = 'not_contains', 'Does not contain'
    EXISTS = 'exists', 'Exists'
    NOT_EXISTS = 'not_exists', 'Does not exist'
    STARTS_WITH = 'starts_with', 'Starts with'
    ENDS_WITH = 'ends_with', 'Ends with'
    IS_BETWEEN = 'in', 'Is between min and max values, e.g. `{"min": 1, "max": 7}`'
    NOT_BETWEEN = 'not_in', 'Is not between min and max values, e.g. `{"min": 1, "max": 7}`'

    # NEW
    IS_ANY_OF = 'in_list', (
        'Field value is one of the items in the supplied list. '
        'Value must be a JSON array of strings or numbers, e.g. `[1, 2, 3]` or `["a", "b"]`.'
    )
    IS_NONE_OF = 'not_in_list', (
        'Field value is NOT in the supplied list. '
        'Value must be a JSON array of strings or numbers.'
    )
```

The `value` schema description in `filters_schema` should be updated so that the "List" entry mentions the new operators explicitly.

### 6.2. Server-side validation

Add a thin validation layer for `in_list` / `not_in_list` values, ideally in `data_manager/managers.py::apply_filters()` (right next to the existing operator handling) or in a small `preprocess_filter()` extension:

- Reject unsupported fields before building a Django lookup. For MVP, only allow:
  - `id`
  - `inner_id`
  - fields that start with `data__` after `preprocess_field_name()`
- `value` must be a `list`.
- Reject `len(value) > settings.DATA_MANAGER_LIST_FILTER_MAX_VALUES` (default `5000`, env-overridable, see §10).
- Reject `len(value) == 0` semantics:
  - For `in_list`: return `queryset.none()` (the result is empty by definition; do not raise).
  - For `not_in_list`: skip the constraint (semantically "exclude none of these"). This avoids accidental "I emptied the input and now my tab is empty" UX.
- For `_filter.type == 'Number'`: coerce each item to `int` or `float`; drop non-numeric tokens (or, with strict mode, raise `ValidationError`); see §11 for the lenient/strict tradeoff.
- Strip surrounding whitespace and quotes for `String`.
- Drop empty strings.

The validation should live before the generic `Q(**{f'{field_name}__in': value})` branch. The existing `annotations_ids` hack should remain bug-compatible for old `contains` filters, but direct API calls using `operator: in_list` on `annotations_ids` should return `400` in the MVP unless we explicitly decide to opt that field in.

Suggested helper shape:

```python
SUPPORTED_IN_LIST_FIELDS = {'id', 'inner_id'}

def validate_in_list_filter(_filter, field_name):
    if _filter.operator not in {Operator.IN_LIST, Operator.NOT_IN_LIST}:
        return

    if field_name not in SUPPORTED_IN_LIST_FIELDS and not field_name.startswith('data__'):
        raise ValidationError(
            '`is any of` and `is none of` support only Task ID, Inner ID, and task.data.* fields in this release.'
        )

    if not isinstance(_filter.value, list):
        raise ValidationError('Filter value must be a list for `is any of` / `is none of`.')

    # normalize size, empty-list semantics, dedupe, and type coercion here
```

### 6.3. Existing `annotations_ids` hack: keep but do not expand

- Behaviour stays the same to preserve old views.
- Add a code comment explaining that this is a legacy field-specific workaround.
- Do **not** add the new UI operator to `annotations_ids` in the MVP. It is relation-backed (`annotations__id`) and can introduce duplicate rows / join semantics that are unrelated to the core spreadsheet workflow.
- If the team later wants `Annotation IDs is any of`, treat it as a separate opt-in with dedicated tests.

### 6.4. `task.data.*` casting

Already handled by `apply_filters()`. Confirm via tests that:
- `Number is any of [1, 2, 3]` against `data.object_id` works using the Cast(...,FloatField) annotation path.
- `String is any of ["a", "b"]` against `data.object_id` works through the existing JSONField key lookup (`data__object_id__in=[...]`).

If `data.object_id` contains mixed types in JSON (`"1"` vs `1`) — which happens often when projects ingest from heterogeneous sources — document that the user must choose the operator's `type` consistently with how they want to compare. We do not silently coerce both sides.

### 6.5. LSE side

`services/lse/label_studio_enterprise/lse_data_manager/managers.py::lse_custom_filter_expressions()` does not need changes for generic columns. Verify that LSE-specific overrides (`payment_status`, `annotators`, `reviewers`, etc.) either:
- pass the operator through to LSO (preferred), or
- ignore `in_list` / `not_in_list` gracefully (do nothing, return `None`, let LSO handle it).

`reviewers` and `annotators` should stay on the existing multi-select dropdown for now (they already let users pick a list); see §11.

---

## 7. Frontend changes

### 7.1. New `ListInput` component

Location: `services/lso/web/libs/datamanager/src/components/Filters/types/ListInput.jsx` (new file).

Behaviour:
- Renders a multiline textarea (`<textarea>` or a chip-style input).
- Parses input on each change (debounced) into an array of trimmed, deduped tokens, splitting on `\n`, `,`, `;`, `\t`, and one or more spaces.
- For `Number` typed filters, also coerces tokens; shows two badges: `N values · M skipped`.
- Empty array → render placeholder, do not save the filter.
- Calls `onChange(parsedArray)`. The MST `Filter.value` is set directly to the array; serialization to backend already supports arrays.

Suggested signature, mirroring the existing inputs:

```jsx
export const ListInput = observer(({ value, onChange, schema, placeholder, type = "string" }) => {
  // ... parse, dedupe, coerce
});
```

### 7.2. Operator entries

The UI should not expose these operators just because a column is `String` or `Number`. It should expose them only when the selected filter column is eligible:

- `filter:tasks:id`
- `filter:tasks:inner_id`
- `filter:tasks:data.<field>`

This probably means adding a small filter-column predicate near `FilterOperation.jsx` or in the filter type model:

```js
function supportsListMembership(filter) {
  const id = filter?.filter?.id ?? filter?.filter?.field?.id;
  return id === "filter:tasks:id" || id === "filter:tasks:inner_id" || id?.startsWith("filter:tasks:data.");
}
```

Then filter out `in_list` / `not_in_list` unless `supportsListMembership(filter)` is true.

`services/lso/web/libs/datamanager/src/components/Filters/types/String.jsx`:

```jsx
export const StringFilter = [
  { key: "contains", label: "contains", valueType: "single", input: BaseInput },
  { key: "not_contains", label: "not contains", valueType: "single", input: BaseInput },
  { key: "regex", label: "regex", valueType: "single", input: BaseInput },
  { key: "equal", label: "equal", valueType: "single", input: BaseInput },
  { key: "not_equal", label: "not equal", valueType: "single", input: BaseInput },

  // NEW (gated by feature flag at registration time)
  { key: "in_list", label: "is any of", valueType: "list",
    input: (props) => <ListInput {...props} type="string" /> },
  { key: "not_in_list", label: "is none of", valueType: "list",
    input: (props) => <ListInput {...props} type="string" /> },
];
```

`Number.jsx`: same idea, with `type="number"`.

`Unknown` `task.data.*` columns currently fall back to `String` filter operators in the frontend. That is acceptable for MVP as long as the column is under `task.data.*`.

`Date.jsx`: **do NOT add** in MVP. Pasting datetimes is a poor UX and rarely requested.

`List.jsx`: **do NOT add** — that filter type is for fixed-enum dropdowns (annotators / reviewers / model versions) and already has a usable multi-select.

`Boolean.jsx`: not applicable.

### 7.3. Operator → input wiring

`FilterLine/FilterOperation.jsx` already routes by `selected.input`. The new `valueType: 'list'` does not require changes — the engine just renders whatever `input` the operator entry declares.

### 7.4. Switching operators

When the user switches from `equal` (single string) to `is any of` (list):
- If the previous value is a non-empty string, **seed** the textarea with it (one line). The user can append more lines.
- If the previous value is a number, seed it as a one-element list.
- When switching back, take the first element. (Existing operator-switch logic already nukes the value if its shape doesn't fit; we should harden this transition specifically.)

### 7.5. Counter & validation UI

- Show an inline badge like "247 values" (or "247 values · 3 invalid skipped" for Number).
- If the parsed list exceeds the configured client-side limit (e.g. 1000), show a warning: "Only the first 1,000 values will be applied. Adjust limit in `DATA_MANAGER_LIST_FILTER_MAX_VALUES` for larger queries."
- If parsed list is empty, do not auto-save the filter (avoid spamming the backend).

### 7.6. Save / load round-trip

- Saved view → reopen → list reappears in textarea (re-join with `\n`).
- Tab is shareable across users (existing `View` semantics).

---

## 8. SDK & API schema

### 8.1. Python SDK

Already has `Operator.IN_LIST` and `Operator.NOT_IN_LIST` (see `libs/lso-client-generator/fern/.preview/fern-python-sdk/src/label_studio_sdk/data_manager.py`). Just update the docstring to mention these are the canonical "list membership" operators.

Add an example to the doc page:

```python
from label_studio_sdk.data_manager import Filters, Column, Operator, Type

f = Filters.create(
    Filters.OR,
    [Filters.item(Column.id, Operator.IN_LIST, Type.Number, [101, 202, 303])],
)
tasks = project.get_tasks(filters=f)
```

### 8.2. OpenAPI / Fern

After the `Operator` enum update in `prepare_params.py`, regenerate the SDK (Fern). The auto-generated portion of the SDK will reflect the new operators in OpenAPI descriptions.

`AGENTS.md` describes the auto-regen flow:
> Push your BE changes to an open PR against `hs-platform` and wait for an autogenerated commit from user "robot-ci-heartex" with message "chore: regenerate SDK preview".

### 8.3. SDK CLI smoke test

```bash
uv run --directory services/lse label-studio-sdk tasks list \
  --param "project=$PROJECT_ID" \
  --param 'query={"filters":{"conjunction":"and","items":[{"filter":"filter:tasks:id","operator":"in_list","type":"Number","value":[101,202,303]}]}}'
```

---

## 9. Type compatibility matrix

| Field / column | Operator available in MVP? | Backend behaviour | Notes |
|---|---|---|
| `Task ID` (`filter:tasks:id`) | ✅ | `id__in=[...]` | Indexed and fast. This is the safest path. |
| `Inner ID` (`filter:tasks:inner_id`) | ✅ | `inner_id__in=[...]` | Project-local IDs. Confirm index/perf in tests; be careful with multi-project queries. |
| `task.data.*` as String / Unknown | ✅ | `data__key__in=[...]` | Main customer workflow. Exact JSONField semantics must be tested for string vs numeric JSON values. |
| `task.data.*` as Number | ✅ | Annotates `Cast(KeyTextTransform(key, 'data'), FloatField())`, then `filter_key__in=[...]` | Slower than indexed columns; values must be numeric. |
| `annotations_ids` | ❌ MVP | Legacy `contains` path rewrites to `annotations__id__in=[...]`; direct `in_list` should be rejected for now. | Relation-backed; can duplicate rows and is outside the core ask. |
| `annotations_results`, `predictions_results`, `*_results_json.*` | ❌ | Custom JSON/result filtering paths do not handle `in_list`. | Needs separate semantics and tests. |
| `annotators`, `reviewers`, `updated_by`, `predictions_model_versions` | ❌ | These use custom dropdown / relation logic. | Existing multi-select or custom filter behaviour is the right UX. |
| `total_annotations`, `total_predictions`, counters, scores, agreement | ❌ MVP | Some may work through generic `__in` or annotations, but not guaranteed. | Avoid expanding the contract until there is a concrete use case. |
| `Datetime` (`created_at`, `updated_at`, `completed_at`) | ❌ | Range operators already exist. | Pasted timestamp list is not a clear MVP workflow. |
| `Boolean`, `TaskState` | ❌ | Existing dedicated operators are enough. | Not useful for arbitrary pasted lists. |

---

## 10. Limits & performance

### 10.1. List size

- **Frontend cap:** 1,000 items. Show a soft warning above. Truncate before save.
- **Backend cap:** `DATA_MANAGER_LIST_FILTER_MAX_VALUES` (env-driven), default `5,000`. Reject larger payloads with a clear `400` and a hint to use the SDK with chunking. Above 5,000 the JSONField storage starts being measurable in request latency and the `IN (...)` parser memory grows.

### 10.2. Postgres `IN (...)` plan stability

- For indexed PK columns (`Task.id`), `__in` uses the index and should stay fast for the proposed size envelope.
- For `Task.inner_id`, confirm actual indexing/performance before claiming the same guarantees as `Task.id`.
- For `task.data.*` (JSONB without index), the planner may fall back to a sequential scan. This is the most likely surprise.
  - If a customer regularly filters by `data.<field>` with a list of 1k+ values, recommend a partial expression index: `CREATE INDEX ON task ((data->>'object_id')) WHERE project_id = N;`.
  - This is **out of MVP**; document as a follow-up perf knob.

### 10.3. Storage

- `Filter.value` is JSONB. 1,000 IDs × ~10 chars each ≈ 10 KB per saved view filter. Acceptable.
- 100,000 IDs ≈ ~1 MB per filter. Don't allow this at all (above the 5,000 cap).

### 10.4. Activity log truncation

- `ActivityLog.extra_data` truncates payload to ~10 KB.
- Filter values larger than that will be truncated in audit logs. Acceptable; debugging is still possible via the `View` model.

### 10.5. Optimisation we are NOT doing in MVP

- `WHERE field IN (VALUES (1), (2), …)` rewrites that the planner sometimes prefers over a long `IN (...)` list. Plain `__in` is fine for the size envelope above.
- `unnest($1::int[]) JOIN` style — only needed if we relax the 5k cap.

---

## 11. Edge cases & semantics

### 11.1. Empty list

| Operator | Empty list semantics | Behaviour |
|---|---|---|
| `is any of []` | No item can match an empty set | Return `queryset.none()` |
| `is none of []` | Excluding nothing | Drop the filter (no constraint) |

Be explicit in code; users will hit both cases.

### 11.2. Duplicates and whitespace

- Trim each token; drop empty tokens; dedupe on the frontend before save.
- Backend should also dedupe defensively (don't trust the client).

### 11.3. Quoted values

- If users paste from a spreadsheet, values may come quoted (`"abc"` or `'abc'`). Strip surrounding matching quotes.

### 11.4. Mixed types and JSONField semantics in `task.data.*`

- A single `data.object_id` may be `"123"` in some tasks and `123` in others (heterogeneous ingest).
- The operator's `type` field is authoritative:
  - `type: Number`, value `[1, 2, 3]` → numeric comparison via the `FloatField` cast.
  - `type: String` / `Unknown`, value `["1", "2", "3"]` → existing Django JSONField key lookup (`data__object_id__in=[...]`).
- Do **not** assume String matching behaves like `KeyTextTransform` until tests confirm it. The current code only uses `KeyTextTransform` explicitly for Number casts and ordering. Add tests for:
  - JSON string `"1"` vs list `["1"]`
  - JSON number `1` vs list `["1"]`
  - JSON number `1` vs list `[1]`
- Document the final tested behaviour. We will not silently coerce both sides beyond the selected filter type.

### 11.5. Coercion failures (`Number`)

Two reasonable policies:

| Policy | UX |
|---|---|
| **Lenient** (recommended) | Drop bad tokens, show "X invalid values skipped" badge. User sees results immediately. |
| **Strict** | Refuse to apply; show all bad tokens. |

Pick lenient for MVP — it matches how spreadsheet pasting actually works (stray header rows, blank lines, etc.).

### 11.6. AND / OR composition

- `is any of` combines naturally with other filters using existing AND / OR logic in `apply_filters()`. No special handling.
- Example: `(data.object_id is any of [...]) AND (annotators contains alice) AND (state == in_progress)` is a single Q chain.

### 11.7. Child filters (one-level nesting)

- Already supported by `Filter.parent` and `apply_filters()` (combines child Q with parent in the same expression). Add at least one test for `parent_filter is any of [...] AND child_filter is any of [...]`.

### 11.8. Case sensitivity

- Default to **case-sensitive** comparison (`equal` / `__in` is case-sensitive in Postgres).
- Mirrors the existing `equal` operator for Strings.
- A future "case-insensitive" toggle is a separate request.

### 11.9. Saved view crash safety

- Backend validation should be safe even when the UI flag is off. Otherwise a power-user can create a saved view via API that the old DM frontend cannot render well.
- As a safety net, the operator dropdown in the FE should fall back to a read-only summary ("is any of: 247 values") if it does not recognise the operator.

### 11.10. Permissions / column allowlist

- Column-side validation in `FilterSerializer.validate_column()` is unchanged. List-of-values is value-side; there is no new attack surface.
- For `task.data.*` the `data.` prefix is explicitly allowlisted; for FK-traversed columns the user still needs `DATA_MANAGER_FILTER_ALLOWLIST` membership.

### 11.11. Telemetry & logging

- Log `operator=in_list size=N field=…` (no values) at filter-apply time — useful to monitor pathological queries without leaking PII.
- Add a metric `data_manager.filter.in_list.size` (histogram) and `data_manager.filter.in_list.applied` (counter, tagged by field).

---

## 12. Persistence & migrations

- **No DB migration.** `Filter.value` is `JSONField`, accepts list as-is.
- View shape unchanged: `{"filter": "filter:tasks:id", "operator": "in_list", "type": "Number", "value": [1,2,3]}`.
- Old views remain compatible.

---

## 13. Backwards compatibility

- `in` (between) and `not_in` (not between) are untouched. No saved view changes.
- `annotations_ids contains "1 2,3"` smart-contains hack remains functional. Tests must continue to pass.
- Python SDK's `Operator.IN_LIST` constant was already public; this proposal documents it, does not redefine it.

---

## 14. Feature flag & rollout

- **Flag name:** `fflag_feat_dia_xxxx_dm_is_any_of_filter_short` (LSO + LSE). Replace `xxxx` with the Jira ticket number.
- **Scope:** controls the FE operator-dropdown visibility. Backend validation should be deterministic regardless of the flag: supported MVP fields work, unsupported fields return a clear validation error.
- **Phasing:**
  1. Phase 0 — schema + SDK doc + backend validation. `Operator` enum exposes the new keys, SDK example is updated, supported fields work through API, unsupported fields return 400.
  2. Phase 1 — UI input + operator entries behind FF; on for internal orgs; metrics observed.
  3. Phase 2 — FF on by default; "Create tab from list" workflow proposal kicks off (separate doc).
  4. Phase 3 — flag removal (followup ticket).

---

## 15. Testing plan

### 15.1. Backend unit / integration tests

`services/lso/label_studio/data_manager/tests/test_managers.py` (extend):

- `Task.id` `in_list` returns matching tasks.
- `Task.id` `not_in_list` excludes correctly.
- `Task.inner_id` `in_list` / `not_in_list` works and stays project-scoped.
- `task.data.object_id` (String) `in_list` works on heterogeneous JSON.
- `task.data.object_id` (Number) `in_list` matches numeric JSON.
- Unsupported fields return a clear validation error:
  - `annotations_ids`
  - `annotations_results`
  - `annotators`
  - `reviewers`
  - `total_annotations`
  - `created_at`
- Empty list:
  - `in_list` → no tasks.
  - `not_in_list` → all tasks.
- `len(value) > DATA_MANAGER_LIST_FILTER_MAX_VALUES` → `ValidationError` (400 in API).
- AND / OR combination with another operator.
- Child filter combination.
- Existing `annotations_ids` smart-contains hack still works.

### 15.2. API / Tavern

Add to `services/lso/label_studio/tests/data_manager/api_tasks.tavern.yml`:

- Create a view with `in_list` + list value for `filter:tasks:id`; assert `GET /api/tasks?view=…` returns the right tasks.
- Create a view with `in_list` for `filter:tasks:data.object_id`; assert correct rows.
- Update the view to `not_in_list`; assert correct result.
- Create a view with `in_list` for `filter:tasks:annotations_ids`; assert 400 with the MVP unsupported-field message.
- Create with empty list → 200, no tasks.
- Create with oversized list → 400 with the right error.

### 15.3. LSE backend

`services/lse/label_studio_enterprise/lse_data_manager/tests/test_api.py` (or a new file):

- Confirm `lse_custom_filter_expressions()` does not interfere with generic `in_list` for non-LSE-special fields.
- Confirm reviewers/annotators columns still use their own multi-select path.

### 15.4. Frontend unit tests

`services/lso/web/libs/datamanager/src/components/Filters/types/__tests__/ListInput.test.tsx`:

- Parse splits on `\n`, `,`, `;`, tab, multiple spaces.
- Trimming and dedupe.
- Number coercion: integers, floats, garbage → counted as invalid.
- Counter renders correctly.
- Empty input → does not call `onChange` with an empty array (or calls it with a sentinel).

### 15.5. Cypress E2E

`services/lse/web/apps/labelstudio-e2e`:

- Create a view, add `is any of` filter on `Task ID`, paste 5 known IDs, save view, assert correct rows visible.
- Same for `data.<custom>` field.
- Switch to `is none of`, assert exclusion.
- Confirm the operator is **not shown** for non-MVP columns such as `Annotation IDs`, `Created at`, `Annotators`, and `Total annotations`.

### 15.6. Performance smoke test

- 100k-task project, 1k IDs in `is any of` on `Task.id` → measure latency. Should stay well under 1s.
- Same with 1k values in `data.object_id` (no index) → measure; if >2s, document as expected and add the perf knob suggestion.

---

## 16. Open questions

1. **Backend strictness**: should unsupported fields return 400 immediately, or should the backend continue accepting the old generic `in_list` for power users? Recommend 400 for the public API once the operator is documented; it is safer and clearer.
2. **String `task.data.*` semantics**: what exactly does `data__key__in=[...]` match for JSON strings vs numbers? Do not finalize docs until tests capture the behaviour.
3. **Default operator for the new feature flag**: do we ship the FF on by default for all orgs, or per-org rollout? Recommend per-org for the first week, then default-on.
4. **`task.data.*` indexing**: do we want to ship a tooling story (admin UI to add JSONB expression indexes for hot keys) alongside this filter, or wait until pain shows up in support? Recommend wait.
5. **Should "Inner ID" allow `is any of`?** Yes for single-project DM views, but confirm project-scoping, multi-project semantics, and performance in tests.

---

## 17. Pitfalls (consolidated checklist)

- [ ] Naming overlap: `in` (between) vs `in_list` (membership). Mitigate via UI labels (`is between` vs `is any of`).
- [ ] Old saved views must keep working. No DB migration. No rename of existing operators.
- [ ] The MVP must not accidentally become "works on every column." Add frontend and backend allowlists.
- [ ] `annotations_ids` smart-contains hack must remain green in tests, but direct `in_list` on `annotations_ids` should be rejected unless intentionally opted in later.
- [ ] Empty-list semantics are easy to get wrong; pick and document explicitly (`in_list` → none, `not_in_list` → drop).
- [ ] Frontend must seed value sensibly when switching operators between `single` and `list`.
- [ ] Mixed JSON types in `task.data.*` will surprise users; test and document type=String vs type=Number behaviour.
- [ ] Don't add the new operator to `List`-typed columns (annotators / reviewers / model versions). Their dropdown already handles multiselect.
- [ ] Don't add it to Boolean / Datetime in MVP.
- [ ] Backend must enforce a hard size cap; client must enforce a soft one.
- [ ] Activity log will truncate large filter payloads; debugging via `View` model is the fallback.
- [ ] Backend must be safe when the frontend flag is off; frontend must gracefully render an existing `in_list` filter if created through API.
- [ ] Telemetry: emit list-size histograms so we can spot abuse before it becomes a perf incident.
- [ ] SDK regen via "robot-ci-heartex" autogen commit; verify the generated docs surface the new operator.
- [ ] Frontend should fall back to a read-only summary if it sees an unknown operator from the backend.
- [ ] Confirm `lse_custom_filter_expressions()` does not swallow the operator for any LSE-specific field.

---

## 18. References

- LSO operator engine: `services/lso/label_studio/data_manager/managers.py` (`_Operator`, `apply_filters()`).
- Public schema: `services/lso/label_studio/data_manager/prepare_params.py` (`Operator`, `filters_schema`).
- Filter persistence: `services/lso/label_studio/data_manager/models.py` (`Filter.value` is `JSONField`).
- Filter security: `services/lso/label_studio/data_manager/serializers.py::FilterSerializer.validate_column()`.
- LSE overrides: `services/lse/label_studio_enterprise/lse_data_manager/managers.py::lse_custom_filter_expressions()`.
- Frontend filter types: `services/lso/web/libs/datamanager/src/components/Filters/types/`.
- Frontend filter routing: `services/lso/web/libs/datamanager/src/components/Filters/FilterLine/FilterOperation.jsx`.
- SDK: `libs/lso-client-generator/fern/.preview/fern-python-sdk/src/label_studio_sdk/data_manager.py`.
- Existing field-specific list filter evidence: the `annotations_ids` smart-contains path in `apply_filters()`.
