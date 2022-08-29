#!/bin/sh

set -e ${DEBUG:+-x}

# Redirect all scripts output + leaving stdout to container payload.
exec 3>&1

ENTRYPOINT_PATH=/label-studio/deploy

uid_entrypoint() {
  if ! whoami 2>/dev/null; then
    if [ -w /etc/passwd ]; then
      echo "labelstudio::$(id -u):0:labelstudio user:${HOME}:/bin/bash" >>/etc/passwd
    fi
  fi
}

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
    if [ -f $OPT_DIR/config_env ]; then
      . $OPT_DIR/config_env
    fi
    echo >&3 "$0: Configuration complete; ready for start up"
  else
    echo >&3 "$0: No init scripts found in $1, skipping configuration"
  fi
}

uid_entrypoint

if [ "$1" = "nginx" ]; then
  exec_entrypoint "$ENTRYPOINT_PATH/nginx/scripts/"
  exec nginx -c /etc/nginx/nginx.conf
elif [ "$1" = "label-studio-uwsgi" ]; then
  exec_entrypoint "$ENTRYPOINT_PATH/docker-entrypoint.d/"
  exec uwsgi --ini /label-studio/deploy/uwsgi.ini
else
  exec_entrypoint "$ENTRYPOINT_PATH/docker-entrypoint.d/"
  exec "$@"
fi