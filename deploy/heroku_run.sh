#!/bin/bash

readonly URI_REGEX='postgres:\/\/(.+):(.+)@(.+):(.+)\/(.+)'

[[ $DATABASE_URL =~ $URI_REGEX ]]
export POSTGRE_USER="${BASH_REMATCH[1]}"
export POSTGRE_PASSWORD="${BASH_REMATCH[2]}"
export POSTGRE_NAME="${BASH_REMATCH[5]}"
export POSTGRE_HOST="${BASH_REMATCH[3]}"
export POSTGRE_PORT="${BASH_REMATCH[4]}"
export DJANGO_DB='default'

./deploy/docker-entrypoint.sh label-studio \
  --host ${HOST:-""} \
  --port ${PORT} \
  --username ${USERNAME} \
  --password ${PASSWORD}
