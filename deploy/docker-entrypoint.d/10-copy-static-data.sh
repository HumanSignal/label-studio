#!/bin/sh
set -e ${DEBUG:+-x}

LABEL_STUDIO_STATIC_DATA_SOURCE="${LABEL_STUDIO_STATIC_DATA_SOURCE:=/label-studio/label_studio}"
LABEL_STUDIO_STATIC_DATA_TARGET="${LABEL_STUDIO_STATIC_DATA_TARGET:=/label-studio/static_volume}"

if [ -z "${LABEL_STUDIO_COPY_STATIC_DATA:-}" ]; then
    echo >&3 "=> Skipping copy data."
else
    echo >&3 "=> Copy static data to a shared folder..."
    if [ -d $LABEL_STUDIO_STATIC_DATA_SOURCE ] && [ -d $LABEL_STUDIO_STATIC_DATA_TARGET ]; then
      rm -rf $LABEL_STUDIO_STATIC_DATA_TARGET/* || true
      cp -r $LABEL_STUDIO_STATIC_DATA_SOURCE/* $LABEL_STUDIO_STATIC_DATA_TARGET/
    fi
    echo >&3 "=> Successfully copied."
fi