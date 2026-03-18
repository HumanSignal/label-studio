/**
 * Custom error class for configuration errors that should not be sent to Sentry
 * Used for user/configuration issues rather than code bugs
 */
export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
    // Mark this error to be skipped by Sentry
    this.sentry_skip = true;
  }
}
