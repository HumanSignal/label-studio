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
