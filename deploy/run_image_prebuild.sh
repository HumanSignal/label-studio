#!/usr/bin/env bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
LSF_DIR="${SCRIPT_DIR}/../label-studio-frontend/build"
LSF_REPO=${2:-private-lsf}

echo "=> Clean up ${LSF_DIR} and getting new LSF builds from ${LSF_REPO}..."

if [ -d "$LSF_DIR" ]; then
  rm -rf ${LSF_DIR:?}/*
else
  mkdir -p $LSF_DIR
fi

# node ${SCRIPT_DIR}/get-lsf-build.js "${1:-master}" "${LSF_REPO}"

echo "=> Create version file..."
python3 ${SCRIPT_DIR}/label_studio/core/version.py
