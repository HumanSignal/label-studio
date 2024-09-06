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

2 - **Environment Configuration (Optional for HMR):**
- If you want to enable Hot Module Replacement (HMR), create an `.env` file in the root Label Studio directory.
- Add the following configuration:
  - `FRONTEND_HMR=true`: Enables Hot Module Replacement in Django.

Optional configurations (defaults should work for most setups):
  - `FRONTEND_HOSTNAME`: HMR server address (default: http://localhost:8010).
  - `DJANGO_HOSTNAME`: Django server address (default: http://localhost:8080).

If using Docker Compose with HMR:
- Update the `env_file: .env` directive in `docker-compose.override.yml` under the app service.
- Rerun the app or docker compose service from the project root for changes to take effect.

To start the development server with HMR:
- From the `web` directory: Run `yarn dev`
- Or from the project root: Run `make frontend-dev`

#### Custom Configuration for DataManager:
- If you need to customize the configuration specifically for DataManager, follow these steps:
  - Duplicate the `.env.example` file located in the DataManager directory and rename the copy to `.env`.
  - Make your desired changes in this new `.env` file. The key configurations to consider are:
      - `NX_API_GATEWAY`: Set this to your API root. For example, `http://localhost:8080/api/dm`.
      - `LS_ACCESS_TOKEN`: This is the access token for Label Studio, which can be obtained from your Label Studio account page.
- This process allows you to have a customized configuration for DataManager, separate from the default settings in the .env.local files.

## Usage Instructions
### Key Development and Build Commands
- **Label Studio App:**
    - `yarn ls:dev`: Build the main Label Studio app with Hot Module Reload for development.
    - `yarn ls:watch`: Build the main Label Studio app continuously for development.
    - `yarn ls:e2e`: Run end-to-end tests for the Label Studio app.
    - `yarn ls:unit`: Run unit tests for the Label Studio app.
- **Label Studio Frontend (Editor):**
    - `yarn lsf:watch`: Continuously build the frontend editor.
    - `yarn lsf:serve`: Run the frontend editor standalone.
    - `yarn lsf:e2e`: Run end-to-end tests for the frontend editor.
    - `yarn lsf:integration`: Run integration tests for the frontend editor.
    - `yarn lsf:unit`: Run unit tests for the frontend editor.
- **Datamanager**
    - `yarn dm:watch`: Continuously build Datamanager.
    - `yarn dm:unit`: Run unit tests for Datamanager.
- **General**
    - `yarn build`: Build all apps and libraries in the project.
    - `yarn test:e2e`: Run end-to-end tests for all apps and libraries.
    - `yarn test:integration`: Run integration tests for all apps and libraries.
    - `yarn test:unit`: Run unit tests for all apps and libraries.
    - `yarn lint`: Run biome linter across all files with autofix.
    - `yarn lint-scss`: Run stylelint linter across all scss files with autofix.

### Git Hooks
This project uses python `pre-commit` hooks to ensure code quality. To install the hooks, run `make configure-hooks` in the project root directory.
This will install the hooks and run them on every pre-push to ensure pull requests will be aligned with linting for both python and javascript/typescript code.

If for any reason you need to format or lint using the same `pre-commit` hooks directly, you can run `make fmt` or `make fmt-check` respectively from the project root directory.

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

