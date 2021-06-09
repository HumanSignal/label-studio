---
title: Frontend reference
type: guide
order: 905
meta_title: Frontend Library Reference
meta_description: Label Studio Documentation reference for integrating Label Studio in your own application to streamline data labeling and annotation for machine learning and data science projects.
---

Label Studio Frontend (LSF) includes a number of UI options and callbacks that you can use when implementing the frontend with a custom labeling backend, or when customizing the Label Studio interface.

## Updates to LSF in version 1.0.0 
LSF version 1.0.0 is not compatible with earlier versions of Label Studio. If you use LSF with a custom backend, you must make changes to the API callbacks that you use as follows:

| Callback in 0.9.1 and earlier | Renamed callback in 1.0.0 |
| --- | --- |
| onSubmitCompletion | onSubmitAnnotation |
| onUpdateCompletion | onUpdateAnnotation |
| onDeleteCompletion | onDeleteAnnotation | 

If you rely on specific formatting of Label Studio completed tasks, [Label Studio's annotation format](export.html#Raw-JSON-format-of-completed-tasks) has also been updated. 

## Implement the Label Studio Frontend


```javascript
var labelStudio = new LabelStudio('editor', options);
```

The following options are recognized when initializing a Label Studio instance version 1.0.0.

## Options

### config

Default: `null`

Type data: `string`

XML configuration of task. List of formats to allow in the editor.

### interfaces

Default: `null`

Type data: `array`

Collection of UI elements to show:

```javascript
[
    "annotations:add-new",
    "annotations:delete",
    "annotations:menu",
    "controls",
    "panel",
    "predictions:menu",
    "side-column",
    "skip",
    "submit"
    "update",
]
```

- `annotations:add-new` - show add new annotations button
- `annotations:delete` - show delete current annotation button
- `annotations:menu` - show annotations menu
- `controls` - enable panel with controls (submit, update, skip)
- `panel` - navigation panel for current task with buttons: undo, redo and reset
- `predictions:menu` - show predictions menu
- `side-column` - enable panel with entities
- `skip` - show button to skip current task
- `submit` - show button to submit or update current annotation
- `update` - show button to update current task after submitting

### messages

Default: `null`

Type data: `object`

Messaging used for different actions

```javascript
{
  DONE: "Done!",
  NO_COMP_LEFT: "No more annotations",
  NO_NEXT_TASK: "No more data available for labeling",
  NO_ACCESS: "You don't have access to this task"
}
```

- `DONE` - Shown after the task is submitted to the server
- `NO_COMP_LEFT` - Shown if there are no more annotations
- `NO_NEXT_TASK` - No next task to load
- `NO_ACCESS` - Can't access the provided task

### description

Default: `No description`

Type data: `string`

Description of the current task.

### task

Task data

Default: `null`

Type data: `object`

```json
{
  id: 1,
  load: false
  },
  data: {
    text: "Labeling text..."
  },
  annotations: [],
  predictions: [],
}
```

#### id

Type data: `integer`

Default: `null`

#### data

#### annotations

Type data: `array`

Array of annotations. See the [annotation documentation](export.html#Raw-JSON-format-of-completed-tasks) for more information.

#### predictions

Type data: `array`

Array of predictions. Similar structure as completions or annotations. See the [annotation documentation](export.html#Raw-JSON-format-of-completed-tasks) and [guidance for importing predicted labels](predictions.html) for more information.

### user

User data

Type data: `object`

```json
{
  pk: 1,
  firstName: "Stanley",
  lastName: "Kubrick"
}
```

#### pk

Type data: `number`

#### firstName

Type data: `string`

#### lastName

Type data: `string`

## Callbacks

Callbacks can be used to execute actions based on user interaction with the interface. For example, label-studio server uses callbacks to communicate with an API. Pass them along with other options when initiating the instance.

### onSubmitAnnotation

Type data: `function`

Called when the `submit` button is pressed. `ls` is label studio instance, `annotation` is the value of the current annotation.

#### Example

```javascript
onSubmitAnnotation: function(ls, annotation) {
  console.log(annotation)
}
```

### onUpdateAnnotation

Type data: `function`

Called when the `update` button is pressed. `ls` is label studio instance, `annotation` is the value of the current annotation.

#### Example

```javascript
onUpdateAnnotation: function(ls, annotation) {
  console.log(result)
}
```

### onDeleteAnnotation

Type data: `function`

Called when the `delete` button is pressed. `ls` is label studio instance, `annotation` is value of current annotation.

#### Example

```javascript
onDeleteAnnotation: function(ls, annotation) {
  console.log(result)
}
```

### onEntityCreate

Type data: `function`

Called when a new region gets labeled, for example, a new bbox is created. `region` is the object that was created.

#### Example

```javascript
onEntityCreate: function(region) {
  console.log(region)
}
```

### onEntityDelete

Type data: `function`

Called when an existing region gets deleted. `region` is the object itself.

#### Example

```javascript
onEntityDelete: function(region) {
  console.log(region)
}
```

### onSkipTask

Type data: `function`

Called when the `skip` button is pressed. `ls` is label studio instance.

#### Example

```javascript
onSkipTask: function(ls) {
  console.log(result)
}
```

### onLabelStudioLoad

Type data: `function`

Called when Label Studio has fully loaded and is ready for labeling. `ls` is the label studio instance

#### Example

```javascript
onLabelStudioLoad: function(ls) {
  console.log(result)
}
```
