import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "mobx-react";

import "semantic-ui-css/semantic.min.css";
import "./assets/styles/global.scss";

import App from "./components/App/App";
import * as serviceWorker from "./serviceWorker";

import AppStore from "./stores/AppStore";
import Requests from "./core/Requests";

import ProductionEnviroment from "./env/prod";
import DevelopmentEnvironment from "./env/dev";

let enviroment = DevelopmentEnvironment;

if (process.env.NODE_ENV === "production") {
  enviroment = ProductionEnviroment;
}

const app = AppStore.create(enviroment.getData(), {
  fetch: Requests.fetcher,
  patch: Requests.patch,
  post: Requests.poster,
  remove: Requests.remover,
  alert: m => console.log(m), // Noop for demo: window.alert(m)
});

/**
 * Initialize store
 */
app.initializeStore(enviroment.getState());

window.Htx = app;

ReactDOM.render(
  <Provider store={app}>
    <App />
  </Provider>,
  enviroment.rootElement(),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
