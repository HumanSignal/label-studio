#!/bin/bash

set -e ${DEBUG:+-x}

function copy_and_export() {
  dest_dir=$OPT_DIR/_pg_ssl_certs
  mkdir -p $dest_dir
  local src_path=$1
  if [[ -f "$src_path" ]]; then
    src_filename=$(basename -- $src_path)
    cp $src_path $dest_dir/
    chmod 600 $dest_dir/$src_filename
    echo "$dest_dir/$src_filename"
  fi
}

function save_and_export() {
  local key=$1
  local value=$2
  export "$key"="$value"
  echo "export $1=$2" >>"$OPT_DIR"/config_env
}

function postgres_ssl_setup() {
  # workaround to deal with immutable k8s secrets
  if [[ ${POSTGRE_SSL_MODE:-} == 'verify-ca' || ${POSTGRE_SSL_MODE:-} == 'verify-full' ]]; then
    if [[ -z ${POSTGRE_SSLROOTCERT:-} ]]; then
      echo >&3 "=>POSTGRE_SSLROOTCERT is required"
      exit 1
    else
      save_and_export PGSSLMODE "$POSTGRE_SSL_MODE"
      save_and_export PGSSLROOTCERT "$(copy_and_export $POSTGRE_SSLROOTCERT)"
    fi
    if [[ ${POSTGRE_SSL_MODE:-} == 'verify-full' ]]; then
      if [[ -z ${POSTGRE_SSLCERT:-} || -z ${POSTGRE_SSLKEY:-} ]]; then
        echo >&3 "=> One of required variables POSTGRE_SSLCERT or POSTGRE_SSLKEY were not set"
        exit 1
      fi
    fi
    if [[ -n ${POSTGRE_SSLCERT:-} ]]; then
      save_and_export PGSSLCERT "$(copy_and_export $POSTGRE_SSLCERT)"
    fi
    if [[ -n ${POSTGRE_SSLKEY:-} ]]; then
      save_and_export PGSSLKEY "$(copy_and_export $POSTGRE_SSLKEY)"
    fi
  elif [[ ${POSTGRE_SSL_MODE:-} == 'disable' || ${POSTGRE_SSL_MODE:-} == 'allow' || ${POSTGRE_SSL_MODE:-} == 'prefer' || ${POSTGRE_SSL_MODE:-} == 'require' ]]; then
    save_and_export PGSSLMODE "$POSTGRE_SSL_MODE"
  fi
}

function postgres_ready(){
python3 << END
import sys
import os
import psycopg2
try:
    conn = psycopg2.connect(dbname=os.getenv('POSTGRE_NAME', 'root'), user=os.getenv('POSTGRE_USER'), password=os.getenv('POSTGRE_PASSWORD'), host=os.getenv('POSTGRE_HOST'), port=os.getenv('POSTGRE_PORT'), sslmode=os.getenv('PGSSLMODE'), sslrootcert=os.getenv('PGSSLROOTCERT'), sslcert=os.getenv('PGSSLCERT'), sslkey=os.getenv('PGSSLKEY'))
except psycopg2.OperationalError as e:
    print(e)
    sys.exit(-1)
sys.exit(0)
END
}


if [[ -n "${POSTGRE_HOST:-}" ]]; then
  postgres_ssl_setup
  echo >&3 "=> Waiting for postgres..."
  until postgres_ready; do
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
