/* global Sentry */

import { createBrowserHistory } from "history";
import React from "react";
import { render } from "react-dom";
import { Router } from "react-router-dom";
import { initSentry } from "../config/Sentry";
import { ApiProvider } from "../providers/ApiProvider";
import { AppStoreProvider } from "../providers/AppStoreProvider";
import { ConfigProvider } from "../providers/ConfigProvider";
import { LibraryProvider } from "../providers/LibraryProvider";
import { MultiProvider } from "../providers/MultiProvider";
import { ProjectProvider } from "../providers/ProjectProvider";
import { RoutesProvider } from "../providers/RoutesProvider";
import { DRAFT_GUARD_KEY, DraftGuard, draftGuardCallback } from "../components/DraftGuard/DraftGuard";
import "./App.styl";
import { AsyncPage } from "./AsyncPage/AsyncPage";
import ErrorBoundary from "./ErrorBoundary";
import { RootPage } from "./RootPage";
import { FF_OPTIC_2, isFF } from "../utils/feature-flags";
import { ToastProvider, ToastViewport } from "../components/Toast/Toast";

const baseURL = new URL(APP_SETTINGS.hostname || location.origin);

const browserHistory = createBrowserHistory({
  basename: baseURL.pathname || "/",
  getUserConfirmation: (message, callback) => {
    if (isFF(FF_OPTIC_2) && message === DRAFT_GUARD_KEY) {
      draftGuardCallback.current = callback;
    } else {
      callback(window.confirm(message));
    }
  },
});

window.LSH = browserHistory;

initSentry(browserHistory);

const App = ({ content }) => {
  const libraries = {
    lsf: {
      scriptSrc: window.EDITOR_JS,
      cssSrc: window.EDITOR_CSS,
      checkAvailability: () => !!window.LabelStudio,
    },
    dm: {
      scriptSrc: window.DM_JS,
      cssSrc: window.DM_CSS,
      checkAvailability: () => !!window.DataManager,
    },
  };

  return (
    <ErrorBoundary>
      <Router history={browserHistory}>
        <MultiProvider
          providers={[
            <AppStoreProvider key="app-store" />,
            <ApiProvider key="api" />,
            <ConfigProvider key="config" />,
            <LibraryProvider key="lsf" libraries={libraries} />,
            <RoutesProvider key="rotes" />,
            <ProjectProvider key="project" />,
            <ToastProvider key="toast" />,
          ]}
        >
          <AsyncPage>
            <DraftGuard />
            <RootPage content={content} />
            <ToastViewport />
          </AsyncPage>
        </MultiProvider>
      </Router>
    </ErrorBoundary>
  );
};

const root = document.querySelector(".app-wrapper");
const content = document.querySelector("#main-content");

render(<App content={content.innerHTML} />, root);
