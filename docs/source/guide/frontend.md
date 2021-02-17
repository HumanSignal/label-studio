---
title: Frontend library
type: guide
order: 705
---

Frontend, as its name suggests, is the frontend library called [«Label Studio Frontend»](https://github.com/heartexlabs/label-studio-frontend) (**LSF**) based on React and mobx-state-tree, distributed as an NPM package. You can include it in your applications without «Label Studio Backend» (**LSB**) part and provide data annotation support to your users. It can be customized and extended.

LSF is located as a separated github repository: 
https://github.com/heartexlabs/label-studio-frontend

<br>
<div style="margin:auto; text-align:center;"><img src="/images/LSF-modules.png" style="opacity: 0.9"/></div>


## Frontend development 

### Manual builds

If you want to build a new tag or change the behaviour of default components inside of LSF then you need to go into LSF repo and check [Development part](https://github.com/heartexlabs/label-studio-frontend#development) of readme. Note that this will require you to have a good knowledge of React and Javascript.build.js <branch-name-from-official-lsf-repo>


### Github Artifacts

Github Artifacts provide zip archives with LSF builds for download via simple link. Branches from the official LSF repo will be built automatically and placed on Github Artifacts hosting. Check [this link](https://github.com/heartexlabs/label-studio-frontend/actions) to access it. 

Also you can configure github token to obtain artifacts automatically:
```
export GITHUB_TOKEN=<token>
cd label-studio/scripts
node get-lsf-build.js <branch-name-from-official-lsf-repo>
```

### CDN 

You can include `main.<hash>.css` and `main.<hash>.js` files from CDN directly. Explore `https://unpkg.com/label-studio@<LS_version>/build/static/` (e.g. [0.7.3](https://unpkg.com/label-studio@0.7.3/build/static/) to find correct filenames of js/css. 

```xhtml
<!-- Theme included stylesheets -->
<link href="https://unpkg.com/label-studio@0.7.3/build/static/css/main.14acfaa5.css" rel="stylesheet">

<!-- Main Label Studio library -->
<script src="https://unpkg.com/label-studio@0.7.3/build/static/js/main.0249ea16.js"></script>
```


## Frontend integration guide 

You can use Label Studio Frontend separately in your own projects: just include it in your HTML page. Instantiate a new Label Studio object with a selector for the div that should become the editor. To see all the available options for the initialization of LabelStudio object, please check the [Reference](frontend_reference.html).
    
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
      "completions:menu",
      "completions:add-new",
      "completions:delete",
      "predictions:menu"
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
    }, 

    onSubmitCompletion: function(LS, completion) {
      // retrive a completion 
      console.log(completion.serializeCompletion())
    }

  });
</script>
  ```

## Custom LSF + LSB integration

LS Frontend (LSF) with Backend (LSB) integration is similar to described in «[Frontend integration guide](#Frontend-integration-guide)». Javascript integration script is placed in [lsf-sdk.js](https://github.com/heartexlabs/label-studio/blob/master/label_studio/static/js/lsf-sdk.js) in Backend. The main idea of this integration based on LSF callbacks.

1. Make your custom LSF build by following this [instructions](https://github.com/heartexlabs/label-studio-frontend#development). Final your development with `npm run build-bundle` to generate `main.<hash>.css` and `main.<hash>.js` files.

2. **Do not forget** to remove the old build from LSB:
```bash
rm -r label-studio/label_studio/static/editor/*
```

3. Copy build folder from LSF to LSB: 
    ```bash
    cp -r label-studio-frontend/build/static/{js,css} label-studio/label_studio/static/editor/
    ```

    If you installed LS as a pip package then you should replace `<env-path>/lib/python<version>/site-packages/label_studio/static/editor/`

4. Run LS instance as usual and it will use a new LSF build:
    ```bash
    label-studio start <your-project>
    ```
    You can check a new build by exploring the source code of Labeling page in your browser, there must be something like this in the `<head>` section: 
    
    ```xhtml
     <!-- Editor CSS -->
     <link href="static/editor/css/main.b50aa47e.css" rel="stylesheet">
      
     <!-- Editor JS -->
     <script src="static/editor/js/main.df658436.js"></script>
    ```

    If you have doubled css/js files then you need to repeat these instruction from the step 2.  