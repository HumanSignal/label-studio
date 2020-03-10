---
title: Frontend library
type: guide
order: 705
---

Frontend, as its name suggests, is the frontend library based on React and mobx-state-tree, distributed as an NPM package. You can include it in your applications and provide data annotation support to your users. It can be granularly customized and extended.

Its repository is located at https://github.com/heartexlabs/label-studio-frontend

## Install

```bash
npm install label-studio
```

## CDN

```xhtml
<!-- Theme included stylesheets -->
<link href="https://unpkg.com/browse/label-studio@0.4.0/build/static/css/main.14acfaa5.css" rel="stylesheet">

<!-- Main Label Studio library -->
<script src="https://unpkg.com/browse/label-studio@0.4.0/build/static/js/main.0249ea16.js"></script>
```

## Quickstart

Instantiate a new Label Studio object with a selector for the div that should become the editor.

```xhtml
<!-- Include Label Studio stylesheet -->
<link href="https://unpkg.com/label-studio@0.4.0/build/static/css/main.14acfaa5.css" rel="stylesheet">

<!-- Create the Label Studio container -->
<div id="label-studio"></div>

<!-- Include the Label Studio library -->
<script src="https://unpkg.com/label-studio@0.4.0/build/static/js/main.0249ea16.js"></script>

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
      "panel",
      "update",
      "controls",
      "side-column",
      "completions:menu",
      "completions:add-new",
      "completions:delete",
      "predictions:menu",
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

> You can use [Playground](/playground) to test out different types of config.

To see all the available options for the initialization of **LabelStudio**, please check the [Reference](frontend_reference.html).
