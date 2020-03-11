---
title: Frontend reference
type: guide
order: 905
---

```javascript
var labelStudio = new LabelStudio('editor', options);
```

The following options are recognized when initializing **LabelStudio** instance:

## Options

### config

Default: `null`

Type data: `string`

XML configuration of task. Whitelist of formats to allow in the editor.

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

- `completions:add-new` - show add new completions button
- `completions:delete` - show delete current completion button
- `completions:menu` - show completions menu
- `controls` - enable panel with controls (submit, update, skip)
- `panel` - navigation panel of current task with buttons: undo, redo and reset
- `predictions:menu` - show predictions menu
- `side-column` - enable panel with entities
- `skip` - show button of skip current task
- `submit` - show button of submit or update current completion
- `update` - show button of update current task after submitting

### messages

Default: `null`

Type data: `object`

Messaging used for different actions

```javascript
{
  DONE: "Done!",
  NO_COMP_LEFT: "No more completions",
  NO_NEXT_TASK: "No more data available for labeling",
  NO_ACCESS: "You don't have access to this task"
}
```

- `DONE` - Shown after the task was submitted to the server
- `NO_COMP_LEFT` - Shown if there are no more completions
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
  load: false,
  auth: {
    enable: true,
    to: "text",
    username: "user",
    password: "pass"
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

Array of completions. See [Completions Documentation](format.html#Input) for more information.

#### predictions

Type data: `array`

Array of predictions. Every object as completion. See [Completions Documentation](https://labelstud.io/guide/format.html#Input) for more information.

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

Callbacks can be used to execute actions based on user interaction with the interface. For example label-studio server is using it to communicate with an API. Pass them along with other options when initiating the instance.

### onSubmitCompletion

Type data: `function`

Called when a button `submit` is pressed. `ls` is label studio instance, `completion` is value of current completion.

#### Example

```javascript
onSubmitCompletion: function(ls, completion) {
  console.log(completion)
}
```

### onUpdateCompletion

Type data: `function`

Called when a button `update` is pressed. `ls` is label studio instance, `completion` is value of current completion.

#### Example

```javascript
updateCompletion: function(ls, completion) {
  console.log(result)
}
```

### onDeleteCompletion

Type data: `function`

Called when a button `delete` is pressed. `ls` is label studio instance, `completion` is value of current completion.

#### Example

```javascript
onDeleteCompletion: function(ls, completion) {
  console.log(result)
}
```

### onEntityCreate

Type data: `function`

Called when a new region gets labeled, for example a new bbox is created. `region` is the object that got created

#### Example

```javascript
onEntityCreate: function(region) {
  console.log(region)
}
```

### onEntityDelete

Type data: `function`

Called when an existing region got deleted. `region` is the object itself.

#### Example

```javascript
onEntityDelete: function(region) {
  console.log(region)
}
```

### onSkipTask

Type data: `function`

Called when a button `skip` is pressed. `ls` is label studio instance.

#### Example

```javascript
onSkipTask: function(ls) {
  console.log(result)
}
```

### onLabelStudioLoad

Type data: `function`

Called when label studio has fully loaded and is ready, `ls` is the label studio instance

#### Example

```javascript
onLabelStudioLoad: function(ls) {
  console.log(result)
}
```
