import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "mobx-react";

import "./assets/styles/global.scss";
import * as serviceWorker from "./serviceWorker";
import App from "./components/App/App";
import AppStore from "./stores/AppStore";
import DevelopmentEnvironment from "./env/development";
import ProductionEnviroment from "./env/production";

let enviroment = DevelopmentEnvironment;

if (process.env.NODE_ENV === "production") {
  enviroment = ProductionEnviroment;

  window.LabelStudio = (element, options) => {
    let params = options;

    if (params && params.task) {
      params.task = enviroment.getData(params.task);
    }

    /**
     * Configure Application
     */
    const app = AppStore.create(params, enviroment.configureApplication(params));

    /**
     * Initialize store
     */
    app.initializeStore(enviroment.getState(params.task));

    ReactDOM.render(
      <Provider store={app}>
        <App />
      </Provider>,
      enviroment.rootElement(element),
    );

    window.Htx = app;
    return app;
  };
} else {
  enviroment = DevelopmentEnvironment;

  window.LabelStudio = (element, options) => {
    let params = options;

    // this is a way to initialize one of the examples from the src/examples section
    if (!options.config) {
      enviroment.getExample().then(result => {
        params = {
          ...params,
          ...result,
        };

        let app = AppStore.create(params, enviroment.configureApplication(params));

        app.initializeStore({ completions: [params.completion], predictions: params.predictions });
        window.Htx = app;

        ReactDOM.render(
          <Provider store={app}>
            <App />
          </Provider>,
          enviroment.rootElement(element),
        );
      });
    } else {
      // this is static initialization from the index.html file
      params = {
        ...params,
        task: {
          ...params.task,
          data: JSON.stringify(params.task.data),
        },
      };

      let app = AppStore.create(params, enviroment.configureApplication(params));

      app.initializeStore({ completions: params.task.completions, predictions: params.task.predictions });

      ReactDOM.render(
        <Provider store={app}>
          <App />
        </Provider>,
        enviroment.rootElement(element),
      );

      return app;
    }
  };
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
