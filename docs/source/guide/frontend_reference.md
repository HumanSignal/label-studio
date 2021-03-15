---
title: Frontend reference
type: guide
order: 905
---

```javascript
var labelStudio = new LabelStudio('editor', options);
```

The following options are recognized when initializing a **Label Studio** instance version earlier than 1.0.0. 

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
    "completions:add-new",
    "completions:delete",
    "completions:menu",
    "controls",
    "panel",
    "predictions:menu",
    "side-column",
    "skip",
    "submit"
    "update",
]
```

- `completions:add-new` - show add new annotations button
- `completions:delete` - show delete current annotation button
- `completions:menu` - show annotations menu
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
  completions: [],
  predictions: [],
}
```

#### id

Type data: `integer`

Default: `null`

#### data

#### completions

Type data: `array`

Array of annotations. See the [annotation documentation](/guide/export.html#Raw-JSON-format-of-completed-tasks) for more information.

#### predictions

Type data: `array`

Array of predictions. Similar structure as completions or annotations. See the [annotation documentation](/guide/export.html#Raw-JSON-format-of-completed-tasks) for more information.

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

Callbacks can be used to execute actions based on user interaction with the interface. For example, label-studio server uses it to communicate with an API. Pass them along with other options when initiating the instance.

### onSubmitAnnotation

Type data: `function`

Called when a button `submit` is pressed. `ls` is label studio instance, `annotation` is value of current annotation.

#### Example

```javascript
onSubmitAnnotation: function(ls, annotation) {
  console.log(annotation)
}
```

### onUpdateAnnotation

Type data: `function`

Called when the `update` button is pressed. `ls` is label studio instance, `annotation` is value of current annotation.

#### Example

```javascript
updateAnnotation: function(ls, annotation) {
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
