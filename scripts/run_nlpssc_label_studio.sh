#!/usr/bin/bash

# Set the environment variable collect_analytics to 0 to stop the collection of analytics data.
# Ensure that SENTRY_DSN and FRONTEND_SENTRY_DSN are set to empty strings to disable Sentry logging.

export NLPSSC_LOCAL_FOLDER=".nlpssc"

export collect_analytics=0
export SENTRY_DSN=""
export FRONTEND_SENTRY_DSN=""

NODE_PATH="$(cygpath "D:\DaxWorkspace\tools\node-v20.10.0-win-x64")"
export PATH=$NODE_PATH:$PATH

PROJECT_PATH="$(cygpath "D:\DaxWorkspace\label-studio")"

pushd $PROJECT_PATH

VIRT_ENV_PATH=".venv"

if [[ ! -d "$VIRT_ENV_PATH" ]]; then
    python -m venv "$VIRT_ENV_PATH"
fi

PYTHON_PATH="${PROJECT_PATH}/.venv/Scripts/python"
INSTALLED_FILE="${NLPSSC_LOCAL_FOLDER}/LABEL_STUDIO_INSTALLED"

if [[ ! -f "$INSTALLED_FILE" ]]; then
    $PYTHON_PATH -m pip -e install 
    touch $INSTALLED_FILE
fi

DATABASES_MIGRATED="${NLPSSC_LOCAL_FOLDER}/DATABASES_MIGRATED"

if [[ ! -f "$DATABASES_MIGRATED" ]]; then
    # Run database migrations
    $PYTHON_PATH label_studio/manage.py migrate
    touch "$DATABASES_MIGRATED"
fi


# Start the server in development mode at http://localhost:8080
$PYTHON_PATH label_studio/manage.py runserver

