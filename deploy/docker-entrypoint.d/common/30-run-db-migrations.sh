#!/bin/sh
set -e ${DEBUG:+-x}

if [ -n "${POSTGRE_HOST:-}" ] || [ -n "${MYSQL_HOST:-}" ] && [ "${SKIP_DB_MIGRATIONS:-}" != "true" ]; then
  echo >&3 "=> Do database migrations..."
  python3 /usr/local/lib/python"$(python3 --version | cut -d ' ' -f 2 | cut -d '.' -f 1,2)"/site-packages/label_studio/manage.py locked_migrate >&3
  echo >&3 "=> Migrations completed."
else
  echo >&3 "=> Skipping run db migrations."
fi