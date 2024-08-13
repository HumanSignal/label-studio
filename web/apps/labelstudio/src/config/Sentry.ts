import * as Sentry from "@sentry/browser";
import * as ReactSentry from "@sentry/react";
import type { RouterHistory } from "@sentry/react/dist/reactrouter";
import { Integrations } from "@sentry/tracing";
import { Route } from "react-router-dom";

export const initSentry = (history: RouterHistory) => {
  if (APP_SETTINGS.debug === false) {
    setTags();
    Sentry.init({
      dsn: "https://5f51920ff82a4675a495870244869c6b@o227124.ingest.sentry.io/5838868",
      integrations: [
        new Integrations.BrowserTracing({
          routingInstrumentation: ReactSentry.reactRouterV5Instrumentation(history),
        }),
      ],
      environment: process.env.NODE_ENV,
      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 0.25,
      release: getVersion(),
    });
  }
};

const setTags = () => {
  const tags: Record<string, any> = {};

  if (APP_SETTINGS.user.email) {
    Sentry.setUser({
      email: APP_SETTINGS.user.email,
      username: APP_SETTINGS.user.username,
    });
  }

  if (APP_SETTINGS.version) {
    Object.entries(APP_SETTINGS.version).forEach(([packageName, data]: [string, any]) => {
      const { version, commit } = data ?? {};

      if (version) {
        tags[`version-${packageName}`] = version;
      }
      if (commit) {
        tags[`commit-${packageName}`] = commit;
      }
    });
  }

  Sentry.setTags(tags);
};

const getVersion = () => {
  const version = APP_SETTINGS.version?.["label-studio-os-package"]?.version;

  return version ? version : process.env.RELEASE_NAME;
};

export const SentryRoute = ReactSentry.withSentryRouting(Route);
