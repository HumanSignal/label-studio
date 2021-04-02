---
title: Frontend library
type: guide
order: 705
meta_title: Customize User Interface
meta_description: Label Studio Documentation for integrating the Label Studio frontend interface into your own machine learning or data labeling application workflow.
---

The [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend) (LSF) is the frontend library for Label Studio, based on React and mobx-state-tree and distributed as an NPM package. You can include it in your applications without using the Label Studio Backend (LSB) to provide data annotation support to your users. You can customize and extend the frontend library. 

LSF is located as a separate GitHub repository: 
https://github.com/heartexlabs/label-studio-frontend

<br>
<div style="margin:auto; text-align:center;"><img src="/images/LSF-modules.png" style="opacity: 0.9"/></div>


## Frontend development 

Refer to the [Frontend reference guide](frontend_reference.html) when developing with Label Studio Frontend. 

### Manual builds

If you want to build a new tag or change the behaviour of default components inside of LSF, then you need to go into the LSF repo and review the [Development part](https://github.com/heartexlabs/label-studio-frontend#development) of the README file. Making any changes requires that you have a good knowledge of React and Javascript.build.js <branch-name-from-official-lsf-repo>

### GitHub Artifacts

Use GitHub Artifacts to download a zip-formatted archive with LSF builds. Branches from the official LSF repo are built automatically and hosted on GitHub Artifacts. 

See the [GitHub Actions for the LSF repository](https://github.com/heartexlabs/label-studio-frontend/actions) to access them. 

You can also configure a GitHub token to obtain artifacts automatically:
```
export GITHUB_TOKEN=<token>
cd label-studio/scripts
node get-lsf-build.js <branch-name-from-official-lsf-repo>
```

### CDN 

You can include `main.<hash>.css` and `main.<hash>.js` files from a CDN directly. Explore `https://unpkg.com/label-studio@<LS_version>/build/static/` (e.g. [0.7.3](https://unpkg.com/label-studio@0.7.3/build/static/) to find correct filenames of js/css. 

```xhtml
<!-- Theme included stylesheets -->
<link href="https://unpkg.com/label-studio@0.7.3/build/static/css/main.14acfaa5.css" rel="stylesheet">

<!-- Main Label Studio library -->
<script src="https://unpkg.com/label-studio@0.7.3/build/static/js/main.0249ea16.js"></script>
```


## Frontend integration guide 

You can use the Label Studio Frontend separately in your own projects by including it in your HTML page. Instantiate a new Label Studio object with a selector for the div that should become the editor. 

To see all the available options for the initialization of LabelStudio object, see the [Label Studio Frontend](frontend_reference.html).
    
  ``` xhtml
<!-- Include Label Studio stylesheet -->
<link href="https://unpkg.com/label-studio@0.7.3/build/static/css/main.09b8161e.css" rel="stylesheet">

<!-- Create the Label Studio container -->
<div id="label-studio"></div>

<!-- Include the Label Studio library -->
<script src="https://unpkg.com/label-studio@0.7.3/build/static/js/main.e963e015.js"></script>

<!-- Initialize Label Studio -->
<script>
  var labelStudio = new LabelStudio('label-studio', {
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
      "annotations:menu",
      "annotations:add-new",
      "annotations:delete",
      "predictions:menu"
    ],

    user: {
      pk: 1,
      firstName: "James",
      lastName: "Dean"
    },
    task: {
      annotations: [],
      predictions: [],
      id: 1,
      data: {
        image: "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
      }
    },

    onLabelStudioLoad: function(LS) {
      var c = LS.annotationStore.addAnnotation({
        userGenerate: true
      });
      LS.annotationStore.selectAnnotation(c.id);
    }, 

    onSubmitAnnotation: function(LS, annotation) {
      // retrive an annotation 
      console.log(annotation.serializeAnnotation())
    }

  });
</script>
  ```

## Custom LSF + LSB integration

LS Frontend (LSF) with Backend (LSB) integration is similar what is described in the [Frontend integration guide](#Frontend-integration-guide). The Javascript integration script is placed in [lsf-sdk.js](https://github.com/heartexlabs/label-studio/blob/master/label_studio/static/js/lsf-sdk.js) in the Label Studio Backend. The main idea of this integration based on LSF callbacks.

1. Make your custom LSF build by following these [instructions](https://github.com/heartexlabs/label-studio-frontend#development). Finalize your development with `npm run build-bundle` to generate `main.<hash>.css` and `main.<hash>.js` files.

2. **Do not forget** to remove the old build from LSB:
```bash
rm -r label-studio/label_studio/static/editor/*
```

3. Copy build folder from LSF to LSB: 
    ```bash
    cp -r label-studio-frontend/build/static/{js,css} label-studio/label_studio/static/editor/
    ```

    If you installed LS as a pip package, replace `<env-path>/lib/python<version>/site-packages/label_studio/static/editor/`

4. Run the LS instance as usual and it uses the new LSF build:
    ```bash
    label-studio start <your-project>
    ```
    Check for the new build by exploring the source code of the Labeling page in your browser. There must be something like this in the `<head>` section: 
    
    ```xhtml
     <!-- Editor CSS -->
     <link href="static/editor/css/main.b50aa47e.css" rel="stylesheet">
      
     <!-- Editor JS -->
     <script src="static/editor/js/main.df658436.js"></script>
    ```

    If you have duplicate css/js files, then you must repeat these instruction from step 2.  
