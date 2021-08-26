#!/bin/sh
set -e

DATA_SOURCE="/label-studio/label_studio"
DATA_TARGET="/label-studio/static_volume"

if [ -z "${LABEL_STUDIO_COPY_STATIC_DATA:-}" ]; then
    echo >&3 "=> Skipping copy data."
else
    echo >&3 "=> Copy static data to a shared folder..."
    if [ -d $DATA_SOURCE ] && [ -d $DATA_TARGET ]; then
      rm -rf $DATA_TARGET/* || true
      cp -r $DATA_SOURCE/* $DATA_TARGET/
    fi
    echo >&3 "=> Successfully copied."
fi