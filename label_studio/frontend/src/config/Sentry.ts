import * as Sentry from "@sentry/browser";
import * as ReactSentry from '@sentry/react';
import { RouterHistory } from "@sentry/react/dist/reactrouter";
import { Integrations } from "@sentry/tracing";
import { Route } from 'react-router-dom';

export const initSentry = (history: RouterHistory) => {
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

export const SentryRoute = ReactSentry.withSentryRouting(Route);
