---
title: Frontend
type: guide
order: 105
---

## Quickstart

Instantiate a new Label Studio object with a selector for the div that should become the editor.

```html
<!-- Include Label Studio stylesheet -->
<link href="" rel="stylesheet">

<!-- Create the Label Studio container -->
<div id="editor"></div>

<!-- Include the Label Studio library -->
<script src=""></script>

<!-- Initialize Label Studio -->
<script>
  var labelStudio = new LabelStudio('#editor', {
    config: "", // XML config

    expert: {
      pk: 1, // Personal Key
      firstName: "", // First name
      lastName: "" // Last name
    },

    isLoading: false, // Loading of Label Studio

    project: {
      id: 1
    },

    interfaces: [
      "controls",
      "predictions",
      "completions",
      "completions:menu",
      "predictions:menu",
      "panel",
      "side-column",
      "update",
      "check-empty",
    ],

    explore: true,

    task: {
      id: "",
      data: "",
      completions: [],
      predictions: []
    }
  });
</script>
```

Take a look at the [Label Studio]("https://labelstud.io") website for more documentation, guides and live playground!

## Download

- npm - `npm install label-studio`
- tar - [https://github.com/heartexlabs/label-studio](https://github.com/heartexlabs/label-studio)

## CDN

```html
<!-- Main Label Studio library -->
<script src=""></script>

<!-- Theme included stylesheets -->
<link href="" rel="stylesheet">
```

## Options

To configure Label Studio, pass in an options object:

```javascript
var options = {
  config: `<View>
  <Image name="img" value="$image"></Image>
  <PolygonLabels name="tag" toName="img">
    <Label value="Hello"></Label>
    <Label value="World"></Label>  
  </PolygonLabels>
</View>`,
  interfaces: [
    "controls",
    "completions",
    "completions:menu",
    "panel",
    "side-column",
    "update",
    "check-empty",
  ],
  task: {
    completions: [],
    predictions: [],
    id: 1,
    data: {
      image: "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
    }
  }
};

var editor = new LabelStudio("#editor", options);
```

## The following keys are recognized

### config

Default: `null`

Type data: `string`

XML configuration of task. Whitelist of formats to allow in the editor.

### interfaces

Default: `null`

Type data: `array`

Collection of modules to include and respective options.

### task

Task data

Default: `null`

Type data: `object`

```json
{
  id: 1,
  data: {
    text: "Labeling text..."
  },
  completions: [],
  predictions: [],
}
```

#### id

#### data

#### completions
Type data: `array`

Array of completions. See [Completions Documentation](https://labelstud.io/guide/format.html#Input) for more information.

#### predictions
Type data: `array`

Array of predictions. Every object as completion. See [Completions Documentation](https://labelstud.io/guide/format.html#Input) for more information.


### expert

Collaborator data

Type data: `object`

```json
{
  id: 1,
  firstName: "Stanley",
  lastName: "Kubrick"
}
```

#### id
Type data: `number`

#### firstName
Type data: `string`

#### lastName
Type data: `string`

### project
Default: `null`

Type data: `object`

```json
{
  id: 1
}
```

#### id
Type data: `number`

### isLoading
Type data: `boolean`

### explore
Type data: `boolean`
Default: `false`

Flag fo labeling of tasks, if the flag is true then after submitting the next task will be called. 
