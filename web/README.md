# Label Studio

Label Studio is a complex, NX-managed project divided into three main components:

## [Main App (`apps/labelstudio`)][lso]
This is the primary application that consolidates all frontend framework elements. It's the hub for integrating and managing the different libraries and functionalities of Label Studio.

## [Library - Label Studio Frontend (`libs/editor`)][lsf]
Label Studio Frontend, developed with React and mobx-state-tree, is a robust frontend library tailored for data annotation. It's designed for seamless integration into your applications, providing a rich set of features for data handling and visualization. Customization and extensibility are core aspects, allowing for tailored annotation experiences.

## [Library - Datamanager (`libs/datamanager`)][dm]
Datamanager is an advanced tool specifically for data exploration within Label Studio. Key features include:

<img align="right" height="180" src="https://github.com/heartexlabs/label-studio/blob/master/images/heartex_icon_opossum_green@2x.png?raw=true" />

## Installation Instructions

1 - **Dependencies Installation:**
- Execute `yarn install --frozen-lockfile` to install all necessary dependencies.

2 - **Environment Configuration:**
#### Custom Configuration for DataManager:
- If you need to customize the configuration specifically for DataManager, follow these steps:
  - Duplicate the `.env.example` file located in the DataManager directory and rename the copy to `.env`.
  - Make your desired changes in this new `.env` file. The key configurations to consider are:
      - `NX_API_GATEWAY`: Set this to your API root. For example, `https://localhost:8080/api/dm`.
      - `LS_ACCESS_TOKEN`: This is the access token for Label Studio, which can be obtained from your Label Studio account page.
- This process allows you to have a customized configuration for DataManager, separate from the default settings in the .env.local files.

## Usage Instructions
### Key Development and Build Commands
- **Label Studio App:**
    - `yarn ls:watch`: Build the main Label Studio app continuously for development.
- **Label Studio Frontend (Editor):**
    - `yarn lsf:watch`: Continuously build the frontend editor.
    - `yarn lsf:serve`: Run the frontend editor standalone.
- **Datamanager**
    - `yarn dm:watch`: Continuously build Datamanager.
- **General Build**
    - `yarn build`: Build all apps and libraries in the project.


## Ecosystem

| Project                          | Description |
|----------------------------------|-|
| [label-studio][lso]              | Server part, distributed as a pip package |
| [label-studio-frontend][lsf]     | Frontend part, written in JavaScript and React, can be embedded into your application |
| [label-studio-converter][lsc]    | Encode labels into the format of your favorite machine learning library |
| [label-studio-transformers][lst] | Transformers library connected and configured for use with label studio |
| [datamanager][dm]                | Data exploration tool for Label Studio |

## License

This software is licensed under the [Apache 2.0 LICENSE](../LICENSE) © [HumanSignal](https://www.humansignal.com/). 2020

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />

[lsc]: https://github.com/heartexlabs/label-studio-converter
[lst]: https://github.com/heartexlabs/label-studio-transformers

[lsf]: libs/editor/README.md
[dm]: libs/datamanager/README.md
[lso]: apps/labelstudio/README.md

