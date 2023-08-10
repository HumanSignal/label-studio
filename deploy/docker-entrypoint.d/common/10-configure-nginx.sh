#!/bin/sh
set -e ${DEBUG:+-x}

NGINX_CONFIG=$OPT_DIR/nginx/nginx.conf

echo >&3 "=> Copy nginx config file..."
mkdir -p "$OPT_DIR/nginx"
\cp -f /etc/nginx/nginx.conf $NGINX_CONFIG

echo >&3 "=> Configure system resolver..."
echo resolver $(awk 'BEGIN{ORS=" "} $1=="nameserver" {print $2}' /etc/resolv.conf) ";" > $OPT_DIR/nginx/resolv.conf

if [ -n "${NGINX_SSL_CERT:-}" ]; then
  echo >&3 "=> Replacing nginx certs..."
  sed -i "s|^\(\s*\)#\(listen 8086.*\)$|\1\2|g" $NGINX_CONFIG
  sed -i "s|^\(\s*\)#\(ssl_certificate .*\)@cert@;$|\1\2$NGINX_SSL_CERT;|g" $NGINX_CONFIG
  sed -i "s|^\(\s*\)#\(ssl_certificate_key .*\)@certkey@;$|\1\2$NGINX_SSL_CERT_KEY;|g" $NGINX_CONFIG
  echo >&3 "=> Successfully replaced nginx certs."
else
  echo >&3 "=> Skipping replace nginx certs."
fi

if [ -n "${APP_HOST:-}" ]; then
  echo >&3 "=> Replacing app endpoint..."
  sed -i "s|localhost|${APP_HOST:-}|g" $NGINX_CONFIG
  echo >&3 "=> Successfully replaced app endpoint."
else
  echo >&3 "=> Skipping replace app endpoint."
fi

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
