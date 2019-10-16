---
title: Frontend
type: guide
order: 105
---

## Quickstart

Instantiate a new Label Studio object with a selector for the div that should become the editor.

```xhtml
<!-- Include Label Studio stylesheet -->
<link href="" rel="stylesheet">

<!-- Create the Label Studio container -->
<div id="editor"></div>

<!-- Include the Label Studio library -->
<script src=""></script>

<!-- Initialize Label Studio -->
<script>
  var labelStudio = new LabelStudio('#editor', {
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

    expert: {
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
    }
  });
</script>
```

Take a look at the [Label Studio]("https://labelstud.io") website for more documentation, guides and live playground!

## Download

- npm - `npm install label-studio`
- tar - [https://github.com/heartexlabs/label-studio](https://github.com/heartexlabs/label-studio)

## CDN

```xhtml
<!-- Main Label Studio library -->
<script src="https://unpkg.com/label-studio@0.2.1/build/static/js/main.0000e798.js"></script>

<!-- Theme included stylesheets -->
<link href="https://unpkg.com/label-studio@0.2.1/build/static/css/main.05fec320.css" rel="stylesheet">
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

Default: `null`

Type data: `number`

### isLoading

Default: `false`

Type data: `boolean`

### explore

Type data: `boolean`

Default: `false`

Flag fo labeling of tasks, if the flag is true then after submitting the next task will be called. 
