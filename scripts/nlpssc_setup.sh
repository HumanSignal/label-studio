#!/usr/bin/bash

# Set the environment variable collect_analytics to 0 to stop the collection of analytics data.
# Ensure that SENTRY_DSN and FRONTEND_SENTRY_DSN are set to empty strings to disable Sentry logging.

export collect_analytics=0
export SENTRY_DSN=""
export FRONTEND_SENTRY_DSN=""



