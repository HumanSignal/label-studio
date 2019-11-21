import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "mobx-react";

import "./assets/styles/global.scss";

import App from "./components/App/App";
import * as serviceWorker from "./serviceWorker";

import AppStore from "./stores/AppStore";

import ProductionEnviroment from "./env/production";
import DevelopmentEnvironment from "./env/development";

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

    if (!options.config) {
      enviroment.getExample().then(result => {
        params = {
          ...params,
          ...result,
        };

        let app = AppStore.create(params, enviroment.configureApplication(params));

        app.initializeStore({ completions: [params.completion] });

        ReactDOM.render(
          <Provider store={app}>
            <App />
          </Provider>,
          enviroment.rootElement(element),
        );
      });
    } else {
      params = {
        ...params,
        task: {
          ...params.task,
          data: JSON.stringify(params.task.data),
        },
      };

      params["interfaces"].push("predictions:menu");
      params["interfaces"].push("predictions");
      let app = AppStore.create(params, enviroment.configureApplication(params));
      const p = [
        {
          model_version: "model 1",
          created_ago: "3 hours",
          result: [
            {
              from_name: "tag",
              id: "t5sp3TyXPx",
              source: "$image",
              to_name: "img",
              type: "rectanglelabels",
              value: {
                height: 11.612284069097889,
                rectanglelabels: ["Hello"],
                rotation: 0,
                width: 39.6,
                x: 13.2,
                y: 34.702495201535505,
              },
            },
          ],
        },
        {
          model_version: "model 2",
          created_ago: "4 hours",
          result: [
            {
              from_name: "tag",
              id: "t5sp3TyXPz",
              source: "$image",
              to_name: "img",
              type: "rectanglelabels",
              value: {
                height: 33.612284069097889,
                rectanglelabels: ["Hello"],
                rotation: 0,
                width: 39.6,
                x: 13.2,
                y: 54.702495201535505,
              },
            },
          ],
        },
      ];
      app.initializeStore({ completions: params.task.completions, predictions: p });

      ReactDOM.render(
        <Provider store={app}>
          <App />
        </Provider>,
        enviroment.rootElement(element),
      );
    }
  };
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
