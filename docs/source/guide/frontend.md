---
title: Frontend builds
short: Frontend builds
tier: all
order: 0
order_enterprise: 0
hide_menu: true
meta_title: Customize User Interface
meta_description: Label Studio documentation for integrating the Label Studio frontend interface into your own machine learning or data labeling application workflow.
section: "Integrate & Extend"

---

!!! attention
    As of [Label Studio 1.11.0](https://github.com/HumanSignal/label-studio/releases/tag/1.11.0), the Label Studio frontend has been deprecated as a separate library and is no longer supported as a standalone distribution. For information about using the frontend library within Label Studio, see [the README](https://github.com/HumanSignal/label-studio/blob/develop/web/libs/editor/README.md). 

The [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend) (LSF) is the main labeling interface distributed within Label Studio and as a separate package via NPM and Unpkg. You can integrate the LSF into your projects without Label Studio to provide data labeling capabilities to your users.

LSF can be customized and extended to fit your needs, and you can use a custom version of LSF standalone or in your LS installation. For more information see [Custom LSF + LS integration](#custom-lsf-in-label-studio).

LSF is located as a separate GitHub repository: https://github.com/heartexlabs/label-studio-frontend

<br>
<img src="/images/frontend/lsf-in-ls.jpg" class="gif-border">

<i>Figure 1: Label Studio Frontend </i>


## Installation

There are two ways to install the LSF as follows:

1. Using the package manager
2. Using the Unpkg CDN

### Using a package manager (recommended)
You can either use `npm` or `yarn` to install the LSF.

```bash
npm install heartexlabs@label-studio@latest --save
```

```bash
yarn add heartexlabs@label-studio@latest
```

### Using Unpkg.com CDN
```xhtml
<!-- Include Label Studio stylesheet -->
<link href="https://unpkg.com/heartexlabs@label-studio@latest/build/static/css/main.css" rel="stylesheet">

<!-- Include the Label Studio library -->
<script src="https://unpkg.com/heartexlabs@label-studio@latest/build/static/js/main.js"></script>
```

## Frontend integration guide

The LSF can be used with Vanilla JS or with the framework of your choice. The following examples cover basic integration with Vanilla and React.

### Vanilla JS integration
You can use the Label Studio Frontend separately in your own projects by including it in your HTML page. Instantiate a new Label Studio object with a selector for the div that should become the editor.

To see all the available options for the initialization of LabelStudio object, see the [Label Studio Frontend](frontend_reference.html).

{% collapse "Using modern JS techniques (recommended)" %}

This guide assumes that you're using a bundler like Webpack or Rollup to assemble your JS bundles, and LSF is installed via a package manager.

In your HTML add the following code:
```xhtml
<div id="label-studio"></div>
```

Now to initialize the Label Studio Frontend, add the following code to your JS file:
``` js
import LabelStudio from 'heartexlabs@label-studio@latest';
import 'heartexlabs@label-studio@latest/build/static/css/main.css';

const labelStudio = new LabelStudio('label-studio', {
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
      image: "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
    }
  }
});

labelStudio.on("labelStudioLoad", (LS) => {
  // Perform an action when Label Studio is loaded
  const c = LS.annotationStore.addAnnotation({
    userGenerate: true
  });
  LS.annotationStore.selectAnnotation(c.id);
});

labelStudio.on("submitAnnotation", (LS, annotation) => {
  // Retrieve an annotation in JSON format
  console.log(annotation.serializeAnnotation())
});
```
{% endcollapse %}

{% collapse "Using plain HTML and JS" %}

This technique is useful if you're not using a bundler or if you want to use the LSF in a static HTML page.

```xhtml
<!-- Include Label Studio stylesheet -->
<link href="https://unpkg.com/heartexlabs@label-studio@latest/build/static/css/main.css" rel="stylesheet">

<div id="label-studio"></div>

<!-- Include the Label Studio library -->
<script src="https://unpkg.com/heartexlabs@label-studio@latest/build/static/js/main.js"></script>

<script>
const root = document.querySelector('#label-studio');
const labelStudio = new LabelStudio(root, {
  // all configuration options are the same
});
</script>
```
{% endcollapse %}

### React integration
LSF is flexible and can be used with a framework of choice. This guide covers the React integration but the same principles can be applied to other frameworks.

{% collapse "LSF with React" %}
Prepare new custom component:
```jsx
// components/LabelStudio.js
import {useRef} from 'react';

const LabelStudioReact = (props) => {
  const labelStudioContainerRef = useRef();
  const labelStudioRef = useRef();

  useEffect(() => {
    if (labelStudioContainerRef.current) {
      labelStudioRef.current = new LabelStudio(
        labelStudioContainerRef.current,
        props
      );
    }
  }, []);

  return (
    <div
      id="label-studio"
      ref={function(el) {
        labelStudioContainerRef.current = el
      }}
    />
  );
}
```

Use the component in your React application
```jsx
// App.js
import { render } from 'react-dom';
import LabelStudioReact from './components/LabelStudio';

const labelinConfig = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Hello"></Label>
      <Label value="World"></Label>
    </RectangleLabels>
  </View>
`

const task = {
  annotations: [],
  predictions: [],
  id: 1,
  data: {
    image: "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
  }
}

const App = () => {
  return (
    <div class="app-root">
      <LabelStudioReact
        config={labelinConfig}
        task={task}
        interfaces={[
          "panel",
          "update",
          "controls",
          "side-column",
          "annotations:menu",
          "annotations:add-new",
          "annotations:delete",
          "predictions:menu"
        ]}
        user={{
          pk: 1,
          firstName: "James",
          lastName: "Dean"
        }}
      />
    </div>
  )
}

render(<App />, document.getElementById('root'));
```
{% endcollapse %}


## Frontend development

Refer to the [Frontend Reference](frontend_reference.html) when developing with Label Studio Frontend.

### Manual builds

If you want to build a new tag or change the behaviour of default components inside of LSF, then you need to go into the LSF repo and review the [Development part](https://github.com/heartexlabs/label-studio-frontend#development) of the README file. Making any changes requires that you have a good knowledge of React and Javascript.build.js `<branch-name-from-official-lsf-repo>`

### GitHub Artifacts

Use GitHub Artifacts to download a zip-formatted archive with LSF builds. Branches from the official LSF repo are built automatically and hosted on GitHub Artifacts.

See the [GitHub Actions for the LSF repository](https://github.com/heartexlabs/label-studio-frontend/actions) to access them.

You can also configure a GitHub token to obtain artifacts automatically:
```
export GITHUB_TOKEN=<token>
cd label-studio/frontend
yarn download:lsf <branch-name-from-official-lsf-repo>
```


<div class="opensource-only">

## Custom LSF in Label Studio

LS Frontend (LSF) with Backend (LSB) integration is similar what is described in the [Frontend integration guide](#Frontend-integration-guide). The JavaScript integration script is placed in [lsf-sdk.js](https://github.com/heartexlabs/label-studio/blob/master/label_studio/static/js/lsf-sdk.js) in the Label Studio Backend. The main idea of this integration based on LSF callbacks.

Check out a quick guide on how to use custom LSF in Label Studio.

<iframe width="800" height="500" src="https://www.youtube.com/embed/QSGgiXie2SE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

### Prepare a custom LSF build
1. Make your custom LSF build by following these [instructions](https://github.com/heartexlabs/label-studio-frontend#development).
2. Finalize your development with `npm run build:module` to generate `main.css` and `main.js` files.
3. Confirm files appearance in the `build/static` folder.

### Integrate LSF into Label Studio
All frontend-related files are stored under `label-studio/frontend` directory. You will also find `dist/` folder there that contains the latest builds of the external frontend libraries.

Under `dist/` folder locate the `lsf/` folder and replace its contents with your custom LSF build.

!!! note
    Inside every folder under `dist/` you will find a `version.json` file. Do not modify or remove it. Its presence is required for the Label Studio to operate.

1. **Do not forget** to remove the old build from LSB:
    ```bash
    rm -rf label-studio/label_studio/frontend/dist/lsf/{js,css}
    ```

2. Copy build folder from LSF to LS:
    ```bash
    cp -r label-studio-frontend/build/static/{js,css} label-studio/label_studio/frontend/dist/lsf/
    ```

    If you installed LS as a pip package, replace `<env-path>/lib/python<version>/site-packages/label_studio/frontend/dist/lsf/`

3. Run the LS instance as usual. It is now using the new LSF build:
    ```bash
    label-studio start <your-project>
    ```

</div>