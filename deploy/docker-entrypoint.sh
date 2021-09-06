#!/bin/sh

set -e

# Redirect all scripts output + leaving stdout to container payload.
exec 3>&1

if [ "$1" = "label-studio" ]; then
    if /usr/bin/find "/label-studio/deploy/docker-entrypoint.d/" -mindepth 1 -maxdepth 1 -type f -print -quit 2>/dev/null | read v; then
        echo >&3 "$0: Looking for init scripts in /label-studio/deploy/docker-entrypoint.d/"
        find "/label-studio/deploy/docker-entrypoint.d/" -follow -type f -print | sort -V | while read -r f; do
            case "$f" in
                *.sh)
                    if [ -x "$f" ]; then
                        echo >&3 "$0: Launching $f";
                        "$f"
                    else
                        # warn on shell scripts without exec bit
                        echo >&3 "$0: Ignoring $f, not executable";
                    fi
                    ;;
                *) echo >&3 "$0: Ignoring $f";;
            esac
        done

        echo >&3 "$0: Configuration complete; ready for start up"
    else
        echo >&3 "$0: No init scripts found in /label-studio/deploy/docker-entrypoint.d/, skipping configuration"
    fi
fi

exec "$@"