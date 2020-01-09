---
title: Embed
type: guide
order: 905
---

## Quickstart

Instantiate a new Label Studio object with a selector for the div that should become the editor.

```xhtml
<!-- Include Label Studio stylesheet -->
<link href="https://unpkg.com/browse/label-studio@0.3.0-beta/build/static/css/main.334c1172.css" rel="stylesheet">

<!-- Create the Label Studio container -->
<div id="editor"></div>

<!-- Include the Label Studio library -->
<script src="https://unpkg.com/browse/label-studio@0.3.0-beta/build/static/js/main.3cf2578f.js"></script>

<!-- Initialize Label Studio -->
<script>
  var labelStudio = new LabelStudio('editor', {
    config: `
      <View>
        <Image name="img" value="$image"></Image>
        <RectangleLabels name="tag" toName="img">
          <Label value="Hello"></Label>
          <Label value="World"></Label>  
        </RectangleLabels>
      </View>
    `,

    interfaces: [
      "controls",
      "completions",
      "completions:menu",
      "panel",
      "side-column",
      "update",
      "check-empty",
    ],

    user: {
      pk: 1,
      firstName: "James",
      lastName: "Dean"
    },

    task: {
      completions: [],
      predictions: [],
      id: 1,
      data: {
        image: "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
      }
    },
    
    onLabelStudioLoad: function(LS) {
      var c = LS.completionStore.addCompletion({
        userGenerate: true
      });
      LS.completionStore.selectCompletion(c.id);
    }
  });
</script>
```

Take a look at the [Label Studio]("https://labelstud.io") website for more documentation, guides and live playground!

## Download

- npm - `npm install label-studio`
- tar - [https://github.com/heartexlabs/label-studio-frontend](https://github.com/heartexlabs/label-studio-frontend)

## CDN

```xhtml
<!-- Main Label Studio library -->
<script src="https://unpkg.com/label-studio@0.2.1/build/static/js/main.0000e798.js"></script>

<!-- Theme included stylesheets -->
<link href="https://unpkg.com/label-studio@0.2.1/build/static/css/main.05fec320.css" rel="stylesheet">
```

## Options

The following keys are recognized

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
  "controls",
  "side-column",
  "panel",
  "submit",
  "skip",
  "update",
  "predictions:menu",
  "completions:add-new"
  "completions:delete"
  "completions:set-groundtruth"
  "completions:menu",
]
```

- `controls` - enable panel with controls (submit, update, skip)
- `side-column` - enable panel with entities
- `panel` - navigation panel of current task with buttons: undo, redo and reset
- `submit` - show button of submit or update current completion
- `skip` - show button of skip current task
- `update` - show button of update current task after submitting
- `check-empty` - enable validation of submit empty task
- `predictions:menu` - show predictions menu
- `completions:menu` - show completions menu
- `completions:add-new` - show add new completions button
- `completions:delete` - show delete current completion button
- `completions:set-groundtruth` - show set as a ground truth button

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

Array of completions. See [Completions Documentation](https://labelstud.io/guide/format.html#Input) for more information.

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

Called when a button `submit` is pressed. `result` is value of current completion.

#### Example

```javascript
onSubmitCompletion: function(result) {
  console.log(result)
}
```

### onUpdateCompletion

Type data: `function`

Called when a button `update` is pressed. `result` is value of current completion.

#### Example

```javascript
updateCompletion: function(result) {
  console.log(result)
}
```

### onDeleteCompletion

Type data: `function`

Called when a button `delete` is pressed. `result` is value of current completion.

#### Example

```javascript
deleteCompletion: function(result) {
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

Called when a button `skip` is pressed. `result` is value of current completion.

#### Example

```javascript
onSkipTask: function(result) {
  console.log(result)
}
```

### onTaskLoad

Type data: `function`

Called when a task gets loaded. `result` is the value of the task

#### Example

```javascript
onTaskLoad: function(result) {
  console.log(result)
}
```

### onLabelStudioLoad

Type data: `function`

Called when label studio has fully loaded and is ready, `result` is the label studio instance

#### Example

```javascript
onLabelStudioLoad: function(result) {
  console.log(result)
}
```
