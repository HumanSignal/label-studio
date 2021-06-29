import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";

Sentry.init({
  dsn: "https://5f51920ff82a4675a495870244869c6b@o227124.ingest.sentry.io/5838868",
  integrations: [new Integrations.BrowserTracing()],
  environment: process.env.NODE_ENV,
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.4 : 1.0,
});
