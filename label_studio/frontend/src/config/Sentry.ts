import * as Sentry from "@sentry/browser";
import * as ReactSentry from '@sentry/react';
import { RouterHistory } from "@sentry/react/dist/reactrouter";
import { Integrations } from "@sentry/tracing";
import { Route } from 'react-router-dom';

export const initSentry = (history: RouterHistory) => {
  if (process.env.NODE_ENV !== 'production') return;

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
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

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
      const {version, commit} = data ?? {};
      console.log({packageName, version, commit, data});

      if (version) {
        tags['version-' + packageName] = version;
      }
      if (commit) {
        tags['commit-' + packageName] = commit;
      }
    });
  }

  console.log(tags);

  Sentry.setTags(tags);
};

export const SentryRoute = ReactSentry.withSentryRouting(Route);
