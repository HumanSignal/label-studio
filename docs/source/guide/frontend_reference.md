---
title: Frontend reference
short: Frontend
type: guide
tier: all
order: 416 
order_enterprise: 416
meta_title: Frontend Library Reference
meta_description: Reference documentation for implementing the Label Studio frontend into your own machine learning or data science application workflows.
section: "Integrate & Extend"
---

Label Studio frontend (LSF) includes several UI options and callbacks that you can use when implementing the frontend with a custom labeling backend, or when customizing the Label Studio interface.

!!! attention
    As of [Label Studio 1.11.0](https://github.com/HumanSignal/label-studio/releases/tag/1.11.0), the Label Studio frontend has been deprecated as a separate library and is no longer supported as a standalone distribution. For information about using the frontend library within Label Studio, see [the README](https://github.com/HumanSignal/label-studio/blob/develop/web/libs/editor/README.md). 

## Updates to LSF in version 1.0.0

!!! warning
    LSF version 1.0.0 is not compatible with earlier versions of Label Studio.

If you use LSF with a custom backend, you must make changes to the API callbacks that you use as follows:

| Callback in 0.9.1 and earlier | Renamed callback in 1.0.0 |
| ----------------------------- | ------------------------- |
| onSubmitCompletion            | onSubmitAnnotation        |
| onUpdateCompletion            | onUpdateAnnotation        |
| onDeleteCompletion            | onDeleteAnnotation        |

If you rely on specific formatting of Label Studio completed tasks, [Label Studio's annotation format](export.html#Raw-JSON-format-of-completed-tasks) has also been updated.

## Implement the Label Studio Frontend

```javascript
var labelStudio = new LabelStudio("editor", options);
```

The following options are recognized when initializing a Label Studio instance version 1.0.0.

## Options

### config

Default: `null`

Type data: `string`

XML-based configuration of the labeling interface. This configuration relies on the `data` field of the task.
See [Customizable Tags](/tags) for more information.

### interfaces

Default: `null`

Type data: `array`

Collection of UI elements to show. Available interfaces:

- `panel` - Enable navigaion panel for the current task with buttons: undo, redo and reset.
- `update` - Show a button to update the current task after submitting.
- `submit` - Show a button to submit or update the current annotation.
- `skip` - Show a button to skip the current task.
- `controls` - Enable panel with controls (`submit`, `update`, `skip`).
- `infobar` - A show button for information.
- `topbar` - A labeling interface that lists the top-level items in the Label Studio UI.
- `instruction` - A button for the [instructions](#description).
- `side-column` - Show a column on the left or right side of the Label Studio UI.
- `annotations:history` - A show button for annotation history.
- `annotations:tabs` - A show button for annotation tabs.
- `annotations:menu` - A show button for the annotation menu.
- `annotations:current` - A show button for the current annotation.
- `annotations:add-new` - A show button to add new annotations.
- `annotations:delete` - A show button to delete the current annotation.
- `annotations:view-all` - A show button to view all annotations.
- `predictions:tabs` - Show predictions tabs.
- `predictions:menu` - Show predictions menu.
- `auto-annotation` - Show auto annotations.
- `edit-history` - Show edit history.

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
  "pk": 1,
  "firstName": "Stanley",
  "lastName": "Kubrick"
}
```

#### pk

Type data: `number`

#### firstName

Type data: `string`

#### lastName

Type data: `string`

## Event system

LSF has a built-in event system that allows you to listen to events and trigger custom actions. You can subscribe to or unsubscribe from event at any time after the Label Studio instance is initialized.

### Using events

#### Subscribe to an event

```javascript
const callback = () => {
  console.log("Event triggered");
};
labelStudio.on("event", callback);
```

#### Unsubscribe from an event

```javascript
const callback = () => {
  console.log("Event triggered");
};
labelStudio.off("event", callback);
```

!!! note
    To be able to unsubscribe from an event, you must pass the same callback function reference to the `off` method.

## Available events

#### Top-level events

This events group contains top-level events. Those events are not related to any internal entities of the LSF.

### `labelStudioLoad`

Label Studio instance is loaded.

**Event handler arguments**

| Argument      | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `labelStudio` | `Object` | Instance of Label Studio |

### `storageInitialized`

The internal storage is initialized.

**Event handler arguments**

| Argument      | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `labelStudio` | `Object` | Instance of Label Studio |

#### Task events

This events group contains events related to the task.

### `skipTask`

User clicked the "Skip" button.

**Event handler arguments**

| Argument      | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| `labelStudio` | `Object` | Instance of Label Studio                    |
| `payload`     | `Object` | Additional data sent during the skip action |

### `unskipTask`

User clicked the "Cancel Skip" button.

| Argument      | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `labelStudio` | `Object` | Instance of Label Studio |

### `nextTask`

User clicked the "Next" (chevron right) button.

| Argument       | Type      | Description                                    |
| -------------- | --------- | ---------------------------------------------- |
| `labelStudio`  | `Object`  | Instance of Label Studio                       |
| `taskId`       | `Number?` | ID of the next task in history                 |
| `annotationId` | `Number?` | ID of the annotation to select within the task |

### `prevTask`

User clicked the "Previous" (chevron left) button.

| Argument       | Type      | Description                                    |
| -------------- | --------- | ---------------------------------------------- |
| `labelStudio`  | `Object`  | Instance of Label Studio                       |
| `taskId`       | `Number?` | ID of the previous task in history             |
| `annotationId` | `Number?` | ID of the annotation to select within the task |

### `submitDraft`

Draft is sent to the server.

| Argument      | Type      | Description                      |
| ------------- | --------- | -------------------------------- |
| `labelStudio` | `Object`  | Instance of Label Studio         |
| `annotation`  | `Object`  | Current annotation               |
| `params`      | `Object?` | Extra params sent with the draft |

#### Annotation events

This events group contains events related to the annotation.

### `beforeSaveAnnotation`
Annotation is going to be saved as the result of the `submit` or `update` action. 
Returning `false` from this event will prevent saving the annotation.

| Argument         | Type     | Description                                                                                  |
|------------------|----------|----------------------------------------------------------------------------------------------|
| `labelStudio`    | `Object` | Instance of Label Studio                                                                     |
| `annotation`     | `Object` | Current annotation                                                                           |
| `payload`        | `Object` | Additional information                                                                       |
| `payload.event`  | `string` | Indicates which event is about to be executed (`submitAnnotation`, `updateAnnotation`, etc.) |


### `submitAnnotation`

Annotation is submitted.

| Argument      | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `labelStudio` | `Object` | Instance of Label Studio |
| `annotation`  | `Object` | Current annotation       |

### `updateAnnotation`

Annotation is updated.

| Argument      | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `labelStudio` | `Object` | Instance of Label Studio |
| `annotation`  | `Object` | Current annotation       |

### `selectAnnotation`

Annotation is selected.

| Argument              | Type      | Description                                   |
|-----------------------|-----------|-----------------------------------------------|
| `annotation`          | `Object`  | Current annotation                            |
| `previousAnnotation`  | `Object`  | Previous annotation                           |
| `payload`             | `Object?` | Additional information                        |
| `payload.fromViewAll` | `boolean` | `true` if ViewAll has just been switched off  |


### `deleteAnnotation`

Annotation is deleted.

| Argument      | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `labelStudio` | `Object` | Instance of Label Studio |
| `annotation`  | `Object` | Current annotation       |

### `groundTruth`

Annotation is set as Ground Truth (the star button clicked).

| Argument         | Type      | Description                      |
| ---------------- | --------- | -------------------------------- |
| `store`          | `Object`  | Instance of Label Studio         |
| `labelStudio`    | `Object`  | Instance of Label Studio         |
| `params`         | `Object`  |                                  |
| `params.isDirty` | `Boolean` | `true` if annotation was changed |
| `params.entity`  | `Object`  | Current annotation               |

### `selectHistory`
Step in the annotation history is selected.

| Argument      | Type     | Description                 |
|---------------|----------|-----------------------------|
| `labelStudio` | `Object` | Instance of Label Studio    |
| `annotation`  | `Object` | Current annotation          |
| `historyItem` | `Object` | Current history item        |

#### Region events

This events group contains events related to the regions. Regions are the special entities used in segmentation tasks like image segmentation, audio segmentation, etc.

### `entityCreate`

Region is created.

| Argument | Type     | Description          |
| -------- | -------- | -------------------- |
| `region` | `Object` | Newly created region |

### `entityDelete`

Region is deleted.

| Argument | Type     | Description          |
| -------- | -------- | -------------------- |
| `region` | `Object` | Newly created region |

{% collapse "Callbacks (deprecated)" %}

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

{% endcollapse %}
