#!/usr/bin/env bash

set -e

# if wait-for-postgres script is specified, we sleep in the loop until Postgre is up
if [[ "$1" = "./deploy/wait-for-postgres.sh" ]]; then
    # ./deploy/wait-for-postgres.sh db
    $1 $2
    shift 2
fi

echo "=> Do database migrations..."
python3 label_studio/manage.py migrate

echo "=> Run $@..."
exec "$@"

