# Label Studio

Label Studio is a complex, NX-managed project divided into three main components:

## Main App (`apps/labelstudio`)
This is the primary application that consolidates all frontend framework elements. It's the hub for integrating and managing the different libraries and functionalities of Label Studio.

## Library - Label Studio Frontend (`libs/editor`)
Label Studio Frontend, developed with React and mobx-state-tree, is a robust frontend library tailored for data annotation. It's designed for seamless integration into your applications, providing a rich set of features for data handling and visualization. Customization and extensibility are core aspects, allowing for tailored annotation experiences.

## Library - Datamanager (`libs/datamanager`)
Datamanager is an advanced tool specifically for data exploration within Label Studio. Key features include:

<img align="right" height="180" src="https://github.com/heartexlabs/label-studio/blob/master/images/heartex_icon_opossum_green@2x.png?raw=true" />

### Features

- Grid and list view to easily explore your datasets
- Customizable data representation: select what data you want to see and how to show it
- Easily slice your datasets with filters for more precise exploration
- Deep integration with Label Studio Frontend

### Under the hood

- [Backend API][api_docs]
- [Architecture][dm_architecture]

## Installation Instructions

1 - **Dependencies Installation:**
- Execute `yarn install --frozen-lockfile` to install all necessary dependencies.

2 - **Environment Configuration:**
- Duplicate `.env.example` files in each directory to their `.env` counterparts and configure as follows:
    - `apps/labelstudio/.env.example` -> `apps/labelstudio/.env`
        - Configure `CSS_PREFIX` (e.g., `ls-`). Ensure uniqueness across apps and libraries.
        - Set `APP_FOLDER` to `apps/labelstudio/`.
    - `libs/editor/.env.example` -> `libs/editor/.env`
        - Set `CSS_PREFIX` (e.g., `lsf-`).
        - Set `APP_FOLDER` to `libs/editor/`.
    - `libs/datamanager/.env.example` -> `libs/datamanager/.env`
        - Set `NX_API_GATEWAY` to your API root (e.g., `https://localhost:8080/api/dm`).
        - Configure `LS_ACCESS_TOKEN` (obtainable from Label Studio account page).
        - Set `CSS_PREFIX` (e.g., `dm-`).
        - Set `APP_FOLDER` to `libs/datamanager/`.

## Usage Instructions
### Development and Build Commands
- **Label Studio App:**
    - `yarn ls:watch`: Build the main Label Studio app continuously for development.
- **Label Studio Frontend (Editor):**
    - `yarn lsf:watch`: Continuously build the frontend editor.
    - `yarn lsf:serve`: Run the frontend editor standalone.
- **Datamanager**
    - `yarn dm:watch`: Continuously build Datamanager.
- **General Build**
    - `yarn build`: Build all apps and libraries in the project.

## Creating pages

Pages could be either Django templates or React components.

### Django

Consider Django templates as a fallback if there's no proper React component for a page.

To create a page using Django is simple and straightforward: select an app within `label_studio/` directory, add a url and create a view with a html template. React app will handle it automatically if there's no React page for a particular route.

### React

**Important notice:** you still have to add url to `urls.py` under one of the Django apps so the backend won't throw a 404. It's up to you where to add it.

All the pages live under `apps/labelstudio/src/pages` and are self-hosted. It means every page defines it's route, title, breadcrumb item and content.

Pages organized as page sets: every folder under `apps/labelstudio/src/pages` is a page set that can contain one or more pages.

To add a new page follow these steps:

##### Choose existing page set or create a new one

Let's say we're creating page set from scratch. To do that we need a directory: `apps/labelstudio/src/pages/MyPageSet`

##### Create a component file under a page set directory

React components are simple functions, so it's enough to write:

```js
export const MyNewPage = () => <div>Page content</div>
```

This would be a legit component and a page

##### Setup title and route

This is done by adding properties to a component:

```js
MyNewPage.title = "Some title"
MyNewPage.path = "/my_page_path"
```

##### Create a page set

If you're creating a new page set there's an additional step: you need to create an `index.js` file in the root of your page set. A path would be `apps/labelstudio/src/pages/MyPageSet/index.js`

This is necessary to group all the pages under the page set. Content of that file would be:

```js
export { MyNewPage } from './MyNewPage';
```

At this point you can also setup a layout wrapper around the page set. In this case content of the file will be a little bit different:

```js
import { MyNewPage } from './MyNewPage';

export const MyLayout = (props) => {
  return (
    <div className="some-extra-class">
      {props.children}
    </div>
  )
}

MyLayout.title = "My Page Set";
MyLayout.path = "/some_root"
```

Notice the `props` argument and `props.children`. This is the default React way of passing content to the component. It will work for every component you create. In this case `children` would be a content of a single page you create depending on current route.

Layout can also be extended with `title` and `path`.

Keep in mind that if you're setting `path` property on the layout, every page under this layout will become a nested route and will extend layout's path. It meast that the page we defined earlier will have a full path of `/some_root/my_page_path`.

##### Adding page set to a router

Now the last step is to add our page set to the app. This is done inside `frontend/src/pages/index.js`:

```js
// First we need to import the page set we've created
import * as MyPageSet from './MyPageSet'
/* ...other imports might be here... */

export const Pages = {
  /* other pages here */,
  // Next goes our page set
  MyPageSet,
}
```

Now we're done. We can now open the page `/some_root/my_page_path` in the browser and see everything in action.

### Page and Route component properties

* `title` – page title and a breadcrumb. can be string or function
* `routes` – nested list of routes
* `layout` – layout component to wrap around nested paths
* `pages` – set of pages
* `routes` – set of raw routes
* `exact` – if true, lookup exact path rather than a subscring

## Ecosystem

| Project | Description |
|-|-|
| label-studio | Server part, distributed as a pip package |
| label-studio-frontend | Frontend part, written in JavaScript and React, can be embedded into your application |
| [label-studio-converter][lsc] | Encode labels into the format of your favorite machine learning library |
| [label-studio-transformers][lst] | Transformers library connected and configured for use with label studio |
| datamanager | Data exploration tool for Label Studio |

## License

This software is licensed under the [Apache 2.0 LICENSE](../LICENSE) © [HumanSignal](https://www.humansignal.com/). 2020

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />

[ls]: https://github.com/heartexlabs/label-studio
[lsf]: https://github.com/heartexlabs/label-studio-frontend
[lsc]: https://github.com/heartexlabs/label-studio-converter
[lst]: https://github.com/heartexlabs/label-studio-transformers

[api_docs]: https://github.com/heartexlabs/dm2/blob/master/docs/api_reference.md
[lsf_dev]: https://github.com/heartexlabs/label-studio-frontend#development
[dm_architecture]: https://github.com/heartexlabs/dm2/blob/master/docs/dm_architecture_diagram.pdf
