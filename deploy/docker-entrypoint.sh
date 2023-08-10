#!/bin/bash

set -e ${DEBUG:+-x}

# Redirect all scripts output + leaving stdout to container payload.
exec 3>&1

ENTRYPOINT_PATH=/label-studio/deploy/docker-entrypoint.d

exec_entrypoint() {
  if /usr/bin/find -L "$1" -mindepth 1 -maxdepth 1 -type f -print -quit 2>/dev/null | read v; then
    echo >&3 "$0: Looking for init scripts in $1"
    find "$1" -follow -type f -print | sort -V | while read -r f; do
      case "$f" in
      *.sh)
        if [ -x "$f" ]; then
          echo >&3 "$0: Launching $f"
          "$f"
        else
          # warn on shell scripts without exec bit
          echo >&3 "$0: Ignoring $f, not executable"
        fi
        ;;
      *) echo >&3 "$0: Ignoring $f" ;;
      esac
    done
    CONFIG_ENV=$OPT_DIR/config_env
    if [ -f "$CONFIG_ENV" ]; then
      echo >&3 "$0: Sourcing $CONFIG_ENV"
      . $CONFIG_ENV
    fi
    echo >&3 "$0: Configuration complete; ready for start up"
  else
    echo >&3 "$0: No init scripts found in $1, skipping configuration"
  fi
}

source_inject_envvars() {
  if [ -n "${ENV_INJECT_SOURCES:-}" ]; then
    IFS=","
    for env_file in $ENV_INJECT_SOURCES; do
       if [ -f "$env_file" ]; then
         . $env_file
       fi
    done
  fi
}

exec_or_wrap_n_exec() {
  if [ -n "${CMD_WRAPPER:-}" ]; then
    IFS=" "
    wrapper_cmd_array=($CMD_WRAPPER)
    wrapper_cmd=${wrapper_cmd_array[0]}
    wrapper_cmd_args=${wrapper_cmd_array[@]:1}
    exec "$wrapper_cmd" $wrapper_cmd_args $@
  else
    exec "$@"
  fi
}

source_inject_envvars

if [ -f "$OPT_DIR"/config_env ]; then
  echo >&3 "$0: Remove config_env"
  rm -f "$OPT_DIR"/config_env
fi

if [ "$1" = "nginx" ]; then
  # in this mode we're running in a separate container
  export APP_HOST=${APP_HOST:=app}
  exec_entrypoint "$ENTRYPOINT_PATH/nginx/"
  exec nginx -c $OPT_DIR/nginx/nginx.conf -e /dev/stderr
elif [ "$1" = "label-studio-uwsgi" ]; then
  exec_entrypoint "$ENTRYPOINT_PATH/app/"
  exec_or_wrap_n_exec uwsgi --ini /label-studio/deploy/uwsgi.ini
elif [ "$1" = "label-studio-migrate" ]; then
  exec_entrypoint "$ENTRYPOINT_PATH/app-init/"
  exec python3 /label-studio/label_studio/manage.py locked_migrate >&3
else
  exec_or_wrap_n_exec "$@"
fi
