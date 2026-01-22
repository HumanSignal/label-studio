# Task Source Viewer

This directory contains the Task Source Viewer components for the Data Manager.

## Components

### `TaskSourceViewer` (`TaskSourceViewer.tsx`)
Main component that displays task source data. It loads task data and uses a feature flag to determine which view to show.

**Feature Flag**: `FF_INTERACTIVE_JSON_VIEWER` (`fflag_feat_front_interactive_json_viewer_short`)

**When enabled**:
- Toggle between Code and Interactive views
- localStorage persistence for view preference
- Search functionality in interactive view
- Custom filters (Annotations, Predictions)
- Copy to clipboard in both views

**When disabled**:
- Simple code-only view with copy functionality

**Usage**:
```tsx
<TaskSourceViewer
  content={taskContent}
  onTaskLoad={loadTaskData}
  sdkType="DM"
/>
```

### `CodeView`
Simple code-only view (fallback when feature flag is disabled).

**Features**:
- Displays JSON as formatted code
- Copy to clipboard

**Usage**:
```tsx
<CodeView data={taskData} />
```

## Architecture

```
TaskSourceViewer (main component)
├── Loads task data via onTaskLoad()
├── Feature Flag Check (FF_INTERACTIVE_JSON_VIEWER)
│
├── [Enabled] → Full Interactive Experience
│   ├── Toggle (Code/Interactive)
│   ├── Code View (formatted text with copy)
│   └── JsonViewer (@humansignal/ui)
│       ├── Search with icon
│       ├── Filters (Annotations, Predictions)
│       ├── Copy button
│       └── Interactive tree view
│
└── [Disabled] → CodeView (fallback)
    └── Simple code display with copy
```

## Feature Flag

To enable the interactive JSON viewer in your environment:

1. **Development**: Add to `window.APP_SETTINGS.feature_flags`:
   ```javascript
   window.APP_SETTINGS = {
     feature_flags: {
       fflag_feat_front_interactive_json_viewer_short: true
     }
   };
   ```

2. **Production**: Configure in LaunchDarkly (flag to be created)

## Migration Path

1. **Phase 1** (Current): Feature flag disabled by default
   - Users see the legacy code-only view
   - New interactive viewer available behind feature flag

2. **Phase 2**: Enable feature flag for testing
   - Gradual rollout to users
   - Collect feedback

3. **Phase 3**: Feature flag enabled by default
   - All users see the new interactive viewer
   - Legacy code view still available via toggle

4. **Phase 4**: Remove feature flag
   - Clean up `CodeView` component (no longer needed)
   - Remove feature flag check from `TaskSourceViewer`
   - Interactive viewer becomes the standard

## Dependencies

- `@humansignal/ui` - JsonViewer, ToggleItems, Button, Tooltip
- `@humansignal/icons` - IconCopy, IconSearch
- `json-edit-react` - Interactive JSON tree component
