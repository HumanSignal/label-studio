#!/bin/sh
set -e

if [ -n "${POSTGRE_HOST:-}" ]; then
  echo >&3 "=> Do database migrations..."
  python3 /label-studio/label_studio/manage.py migrate >&3
  echo >&3 "=> Migrations completed."
else
  echo >&3 "=> Skipping run db migrations."
fi