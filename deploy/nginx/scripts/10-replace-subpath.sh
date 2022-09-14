#!/bin/sh
set -e ${DEBUG:+-x}

NGINX_CONFIG=/etc/nginx/nginx.conf

echo >&3 "=> Copy nginx config file..."
mkdir -p "$OPT_DIR/nginx"
\cp -f /label-studio/deploy/nginx/default.conf $NGINX_CONFIG

LABEL_STUDIO_HOST_NO_SCHEME=${LABEL_STUDIO_HOST#*//}
LABEL_STUDIO_HOST_NO_TRAILING_SLASH=${LABEL_STUDIO_HOST_NO_SCHEME%/}
LABEL_STUDIO_HOST_SUBPATH=$(echo "$LABEL_STUDIO_HOST_NO_TRAILING_SLASH" | cut -d'/' -f2- -s)

if [ -n "${LABEL_STUDIO_HOST_SUBPATH:-}" ] && [ -w $NGINX_CONFIG ]; then
  echo >&3 "=> Adding subpath to nginx config $NGINX_CONFIG ..."
  sed -i "s|^\(\s*\)\(location \/\)|\1\2$LABEL_STUDIO_HOST_SUBPATH\/|g" $NGINX_CONFIG
  echo >&3 "=> Successfully added subpath to nginx config."
else
  echo >&3 "=> Skipping adding subpath to nginx config."
fi
