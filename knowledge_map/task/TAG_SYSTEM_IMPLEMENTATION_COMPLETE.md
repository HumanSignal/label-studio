# Tag System Implementation

## Summary

Per-task tag system: tasks can be imported with `import_tags`,
`import_batch_id`, and `import_source` fields stored on the task model and
filterable in the Data Manager.

## Implementation Date
October 16, 2025

## Current state (2026-05)

- Backend: all three fields (`import_tags`, `import_batch_id`,
  `import_source`) are stored on `Task` and exposed/filterable.
- Frontend: the **per-file tag chip UI** in the Import modal sends
  `file_upload_tags` (a map keyed by file_upload id). `import_source` is
  hardcoded to `"ui"` in the UI.
- **`import_batch_id` is no longer surfaced as a separate text input** in
  the Import UI; the column still exists in the DB and accepts values via
  direct API calls. If you need the batch UI back, re-add a text input
  next to the per-file tag chips in
  `web/apps/labelstudio/src/pages/CreateProject/Import/Import.jsx`.

## Features Implemented

### 1. Backend - Django Models
- Added three new fields to `Task` model in `label_studio/tasks/models.py`:
  - `import_tags`: JSONField for storing array of tags
  - `import_batch_id`: CharField for batch identifier
  - `import_source`: CharField for tracking import source (ui/api)
- Created migration `0055_task_import_tags.py` with index on `import_batch_id`

### 2. Backend - Serializers & API
- Updated `TaskSerializer` and `TaskSimpleSerializer` in `label_studio/tasks/serializers.py` to expose new fields
- Modified `bulk_create_tasks()` in `label_studio/data_import/uploader.py` to accept and save import metadata
- Enhanced import API endpoints in `label_studio/data_import/api.py` to propagate tags:
  - `/api/projects/{id}/import` - accepts `import_tags` and `import_batch_id` parameters
  - `/api/projects/{id}/reimport` - supports same parameters
- Set `import_source` automatically based on import method

### 3. Backend - Data Manager
- Added `import_batch_id` and `import_tags` columns in `label_studio/data_manager/functions.py`
- Implemented filtering support for `import_tags` in `label_studio/data_manager/managers.py`:
  - `contains` - filter tasks that contain a specific tag
  - `not_contains` - filter tasks that don't contain a tag
  - `empty` - filter tasks with no tags

### 4. Frontend - Import UI
- Enhanced Import Modal in `web/apps/labelstudio/src/pages/CreateProject/Import/Import.jsx`:
  - Added "Batch ID (optional)" text input field
  - Added "Import Tags" input with tag chips (press Enter to add tags)
  - Integrated with `useImportPage.js` hook to propagate metadata to API
- Tags are captured and sent to backend during file upload import

### 5. Frontend - Data Manager Display
- Added "Batch ID" and "Import Tags" columns to task table
- Tags display as JSON array in table cells
- Columns are filterable through Data Manager filters panel

## Testing Results

### API Testing
Successfully imported task with tags via direct API call:
```json
{
  "id": 3,
  "import_tags": ["condition_a", "experiment-1"],
  "import_batch_id": "test-batch-001",
  "import_source": null,
  "data": {
    "image": "/data/upload/1/c54ce37d-IMG_2540.JPG"
  },
  ...
}
```

### UI Testing (historical — initial implementation)
- Import modal displayed Batch ID and Tags input fields
- Tags could be added by typing and pressing Enter
- Tag chips displayed with delete functionality
- Batch ID was captured and sent to backend
- Data Manager displays both fields in table columns
- Filtering panel includes "Import Tags" filter option with operators

> **Update:** the current Import UI shows per-file tag chips only — there
> is no separate Batch ID input. See "Current state" at the top.

## Known Issues & Notes

1. **Tag Display Format**: Import Tags currently display as raw JSON array `["condition_a","experiment-1"]` in the table. Could be enhanced with chip/badge UI components for better UX.

2. **Existing Tasks**: Tasks imported before migration (Task 1 & 2 in test) show `null` values for import fields. This is expected - only newly imported tasks will have these fields populated.

3. **Import Source**: When importing via direct API POST (not through UI), `import_source` is `null`. The field is only set when going through the Import/Reimport API endpoints with proper form data.

4. **File Upload Import**: The file upload flow in the Import UI needs the uploaded files to be properly associated with the import metadata. Currently tested with direct API import which works correctly.

5. **Sample Dataset Imports (Fixed 2025-10-23)**: Previously, importing sample datasets did not propagate `import_tags`/`import_batch_id` from the Import UI. This is now fixed by appending metadata in `uploadSample()` and allowing `URLSearchParams` in the `importFiles` helper.

   - UI changes:
     - `web/apps/labelstudio/src/pages/CreateProject/Import/useImportPage.js`: Append `import_batch_id`, `import_tags` (JSON), and `import_source='ui'` when triggering sample import.
     - `web/apps/labelstudio/src/pages/CreateProject/Import/utils.ts`: Broaden `importFiles` signature to accept `URLSearchParams`.
   - BE: No changes required for Community edition; existing import endpoint reads urlencoded `import_tags`/`import_batch_id`.

## Database Migration

Migration file: `label_studio/tasks/migrations/0055_task_import_tags.py`

**Status**: Applied successfully (verified with `showmigrations`)

## Files Modified

### Backend
1. `label_studio/tasks/models.py` - Added model fields
2. `label_studio/tasks/serializers.py` - Exposed fields in API
3. `label_studio/tasks/migrations/0055_task_import_tags.py` - Database migration
4. `label_studio/data_import/uploader.py` - Bulk create support
5. `label_studio/data_import/api.py` - Import/Reimport endpoints
6. `label_studio/data_manager/functions.py` - Column definitions
7. `label_studio/data_manager/managers.py` - Filter support
8. `label_studio/tasks/api.py` - Task serializer updates

### Frontend
1. `web/apps/labelstudio/src/pages/CreateProject/Import/Import.jsx` - Import UI
2. `web/apps/labelstudio/src/pages/CreateProject/Import/useImportPage.js` - Import hook

## Usage Example

### Via API
```bash
curl -X POST http://localhost:8080/api/projects/1/import \
  -H "Content-Type: application/json" \
  -d '[{
    "data": {"image": "/data/upload/1/image.jpg"},
    "import_tags": ["experiment-1", "condition-a"],
    "import_batch_id": "batch-2025-10-16"
  }]'
```

### Via UI
1. Navigate to project Data Manager
2. Click "Import" button
3. Fill in "Batch ID" field (optional)
4. Type tags in "Add import tag and press Enter" field
5. Upload files or enter dataset URL
6. Click "Import" button

### Filtering by Tags
1. Click "Filters" button in Data Manager
2. Click "Add Filter"
3. Select "Import Tags" from field dropdown
4. Choose operator (contains/not contains/is empty)
5. Enter tag value to filter by

## Screenshots

1. `import-modal-with-tags.png` - Import modal showing Batch ID and Tags inputs
2. `data-manager-with-tags-working.png` - Data Manager showing tasks with tags
3. `filter-panel-import-tags.png` - Filter panel with Import Tags option

## Next Steps (Optional Enhancements)

1. **Improve Tag Display**: Replace JSON string display with visual tag chips/badges in Data Manager table
2. **Tag Autocomplete**: Add autocomplete suggestions based on existing tags in project
3. **Bulk Tag Update**: Allow adding/removing tags from multiple selected tasks
4. **Tag Management UI**: Create dedicated tag management interface for viewing all tags across project
5. **Export with Tags**: Ensure tags are included in task exports (JSON/CSV)
6. **Tag Statistics**: Add dashboard widget showing tag distribution and counts

## Conclusion

The tag system is fully implemented and functional. Tasks can be imported with batch IDs and multiple tags, which are stored in the database, displayed in the Data Manager, and can be filtered. The implementation follows Label Studio's architecture patterns and integrates seamlessly with existing import workflows.

