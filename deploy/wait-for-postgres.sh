#!/bin/sh
# wait-for-postgres.sh

set -e


until PGPASSWORD=$POSTGRE_PASSWORD psql -h "$POSTGRE_HOST" -p $POSTGRE_PORT -U "$POSTGRE_USER" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
