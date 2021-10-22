#!/bin/sh
set -e ${DEBUG:+-x}

if [ -n "${POSTGRE_HOST:-}" ]; then
  echo >&3 "=> Waiting for postgres..."
  until PGPASSWORD=$POSTGRE_PASSWORD psql -h "$POSTGRE_HOST" -p $POSTGRE_PORT -U "$POSTGRE_USER" -d "${POSTGRE_NAME:=root}" -c '\q'; do
    echo >&3 "==> Postgres is unavailable - sleeping..."
    sleep 1
  done
  echo >&3 "=> Postgres is up."
elif [ -n "${MYSQL_HOST:-}" ]; then
  echo >&3 "=> Waiting for MySQL..."
  while ! mysqladmin ping -h"$MYSQL_HOST" -P"${MYSQL_PORT:-3306}" --silent; do
      echo >&3 "==> MySQL is unavailable - sleeping..."
      sleep 1
  done
  echo >&3 "=> MySQL is up."
else
  echo >&3 "=> Skipping wait for database."
fi
