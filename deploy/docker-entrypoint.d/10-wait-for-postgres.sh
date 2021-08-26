#!/bin/sh
set -e

echo >&3 "=> Waiting for postgres..."
until PGPASSWORD=$POSTGRE_PASSWORD psql -h "$POSTGRE_HOST" -p $POSTGRE_PORT -U "$POSTGRE_USER" -c '\q'; do
  echo >&3 "==> Postgres is unavailable - sleeping..."
  sleep 1
done
echo >&3 "=> Postgres is up."
