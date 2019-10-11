import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "mobx-react";

import "./assets/styles/global.scss";

import App from "./components/App/App";
import * as serviceWorker from "./serviceWorker";

import AppStore from "./stores/AppStore";
import Requests from "./core/Requests";

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

    const app = AppStore.create(params, {
      fetch: Requests.fetcher,
      patch: Requests.patch,
      post: Requests.poster,
      remove: Requests.remover,
      alert: m => console.log(m), // Noop for demo: window.alert(m)
    });

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

        let app = AppStore.create(params, {
          fetch: Requests.fetcher,
          patch: Requests.patch,
          post: Requests.poster,
          remove: Requests.remover,
          alert: m => console.log(m), // Noop for demo: window.alert(m)
        });

        app.initializeStore({ completions: [params.completion] });

        ReactDOM.render(
          <Provider store={app}>
            <App />
          </Provider>,
          enviroment.rootElement(element),
        );
      });
    } else {
      let app = AppStore.create(params, {
        fetch: Requests.fetcher,
        patch: Requests.patch,
        post: Requests.poster,
        remove: Requests.remover,
        alert: m => console.log(m), // Noop for demo: window.alert(m)
      });

      app.initializeStore({ completions: params.completions, predictions: params.predictions });

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
