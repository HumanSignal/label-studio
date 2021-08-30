#!/bin/sh
set -e

echo >&3 "=> Do database migrations..."
python3 /label-studio/label_studio/manage.py migrate >&3
echo >&3 "=> Migrations completed."