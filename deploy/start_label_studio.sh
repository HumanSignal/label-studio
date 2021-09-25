#!/usr/bin/env bash
# see deploy/uwsgi.ini for details
# /usr/local/bin/uwsgi --ini /label-studio/deploy/uwsgi.ini
echo LABEL_STUDIO_HOST  ---->>  $LABEL_STUDIO_HOST
echo "Make simple Label Studio launch..."
label-studio --no-browser --host http://127.0.0.1:8080