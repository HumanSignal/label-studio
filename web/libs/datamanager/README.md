## Data Manager 2.0 &middot; ![Build and Test](https://github.com/heartexlabs/dm2/workflows/Build%20and%20Test/badge.svg) &middot; [![npm version](https://badge.fury.io/js/%40heartexlabs%2Fdatamanager.svg)](https://badge.fury.io/js/%40heartexlabs%2Fdatamanager)

[Website](https://labelstud.io/) • [Docs](https://labelstud.io/guide) • [Twitter](https://twitter.com/heartexlabs) • [Join Slack Community](https://slack.labelstud.io)

Data exploration tool for [Label Studio][ls].

<img src="https://raw.githubusercontent.com/heartexlabs/dm2/master/docs/image.png" height="500" align="center"/>

## Summary

<img align="right" height="180" src="https://github.com/heartexlabs/label-studio/blob/master/images/heartex_icon_opossum_green@2x.png?raw=true" />

- [Quick Start](#quick-start)
- [Features](#features-star2)
- [Usage](#usage)
- [Under the hood](#under-the-hood)
- [Build and run](#build-and-run)
- [Develoment](#development)
- [License](#license)

### Quickstart

```
npm install @heartexlabs/datamanager
```

### Features

- Grid and list view to easily explore your datasets
- Customizable data representation: select what data you want to see and how to show it
- Easily slice your datasates with filters for more precise exploration
- Deep integration with Label Studio Frontend

### Usage

You can use DataManager as a standalone module.

**Keep in mind that DataManager requires [backend api](#under-the-hood) to operate. In case of standalone usage you need to implement backend yourself.**

#### Installation

```
npm install @heartexlabs/datamanager
```

#### Initialize

```javascript
import { DataManager } from '@heartexlabs/datamanager';

const dm = new DataManager({
  // Where to render DataManager
  root: document.querySelector('.app'),
  // API gateway
  apiGateway: 'https://example.com/api',
  // API settings
  apiEndpoints: {
    // here you can override API endpoints
    // default config could be found in api-config.js
  },
  // Disable requests mocking
  apiMockDisabled: process.env.NODE_ENV === 'production',
  // Passing parameters to Label Studio Frontend
  labelStudio: {
    user: { pk: 1, firstName: "James" }
  },
  // Table view settings
  table: {
    hiddenColumns: {/*...*/},
    visibleColumns: {/*...*/}
  },
  // Setup links. Null value will hide the button
  links: {
    import: '/import',
    export: '/export',
  }
})
```

#### Events

DataManager forwards most of the events from Label Studio.

```js
dm.on('submitAnnotation', () => /* handle the submit process */)
```

#### API endpoints

To have access to the backend DataManager uses endpoints. Every endpoint is converted into a named method that DM will use under the hood. Full list of those method could be found [here](#under-the-hood).

Every endpoint could be either a string or an object.

API endpoint paths also support `:[parameter-name]` notation, e.g. `/tabs/:tabID/tasks`. These parameteres are required if specified. This means DM will throw an exception if the parameter is not present in the API call.

```js
// In this case DM will assume that api.columns() is a get request
apiEndpoints: {
	columns: "/api/columns",
}
```



For requests other than **GET** use object notation:

```javascript
// If you want to specify a method, use oject instead
apiEndpoints: {
  updateTab: {
    path: "/api/tabs/:id",
    method: "post"
  }
}
```

###### Response conversion

```javascript
// In case you already have the api but the response doesn't fit the format expected by DM
// you can convert the response on the fly
apiEndpoints: {
  tabs: {
    path: "/api/tabs",
    convert: (response) => {
			/* do whatever you need with the response */
      /* then return the modified object */
      return response
    }
  }
}
```

###### Request mock

DataManager supports requests mocking. This feature comes handy for the development purposes.

```javascript
apiEndpoints: {
  columns: {
    path: "/api/columns",
    mock: (url, requestParams, request) => {
      // here you can process the request and return the response
      // execution of this method can be disabled by using `apiMockDisabled: true`
    }
  }
}
```


### Under the hood

- [Backend API][api_docs]
- [Architecture][dm_architecture]

### Build and run

#### Run in development mode with server API

Ensure that Label Studio is running, then configure your environment. Copy `.env.defaults` into `.env` and change settings:

- `API_GATEWAY=http://localhost:8080/api/dm` or other API root if you have one
- `LS_ACCESS_TOKEN` — to get this token go to LS, open menu from avatar in top right corner, go to Account page, copy token

Also you have to change `data-project-id` in `public/index.html` to project you want to use. DM always works with only one project at a time.

Then start DM with simple command:

```
npm run start
```

#### Build for production and standalone usage

Builds a CommonJS compatible module

```
npm run build:module
```

#### Build for Label Studio

Wait until the artifact is built, then navigate to the Label Studio directory and execute the following command in your command line:

```
node scripts/get-build.js dm [branch-name]
```

`branch-name` – optional, default: `master`

## Development

### Prerequisites

For the development it is required to have Label Studio installed and running as the DataManager uses LabelStudio API to operate.

If you're using your own backend, make sure that the API implements all the methods DataManager requires.

### Running local version of DataManager

```
npm ci
```

Run local version of the DataManager

```
npm start
```

### DataManager and Label Studio Frontend

By default DataManager comes with the latest version of Label Studio Frontent available on npm at the moment.

If you need another version, you have several options to connect it.

#### Using version from unpkg.com

You can take whatever version of LSF you need from unpkg.com and replace the existing one in `public/index.html`.

#### Using local clone

If need more control over the changes or you're developing some sort of integration between DataManager and Label Studio Frontend, you'll need to clone `label-studio-frontend` locally first.

1. Follow the [Development guide](https://github.com/heartexlabs/label-studio-frontend#development) first and build a production version of Label Studio Frontend.
2. Grab the contents of `./build/static` directory and copy it over to Data Manager `public` folder.
3. Edit `public/index.html`, you will need to replace these two lines:

```diff
<!-- Label Studio Frontend -->
-    <link href="https://unpkg.com/label-studio@latest/build/static/css/" rel="stylesheet">
-    <script src="https://unpkg.com/label-studio@latest/build/static/js/main.js"></script>
+    <link href="./static/css/" rel="stylesheet">
+    <script src="./static/js/main.js"></script>
```

#### Using custom DM build in Label Studio

You can install DataManager into Label Studio by replacing bundle files.

First, build the DataManager itself:

```
npm ci && npm run build:module
```

Next replace the bundle in Label Studio with a new one:

```
cp -r ./build/**/* [your-label-studio-path]/label-studio/static/dm/
```

Now you can start Label Studio if it's not running, or refresh the page in the browser.

## Ecosystem

| Project | Description |
|-|-|
| [label-studio][ls] | Server part, distributed as a pip package |
| [label-studio-frontend][lsf] | Frontend part, written in JavaScript and React, can be embedded into your application |
| [label-studio-converter][lsc] | Encode labels into the format of your favorite machine learning library |
| [label-studio-transformers][lst] | Transformers library connected and configured for use with label studio |
| datamanager | Data exploration tool for Label Studio |

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.com/). 2020

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />

[ls]: https://github.com/heartexlabs/label-studio
[lsf]: https://github.com/heartexlabs/label-studio-frontend
[lsc]: https://github.com/heartexlabs/label-studio-converter
[lst]: https://github.com/heartexlabs/label-studio-transformers

[api_docs]: https://github.com/heartexlabs/dm2/blob/master/docs/api_reference.md
[lsf_dev]: https://github.com/heartexlabs/label-studio-frontend#development
[dm_architecture]: https://github.com/heartexlabs/dm2/blob/master/docs/dm_architecture_diagram.pdf
