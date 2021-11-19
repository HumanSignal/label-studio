#!/bin/sh
set -e ${DEBUG:+-x}

NGINX_CONFIG=/etc/nginx/conf.d/${NGINX_FILE:-default.conf}

if [ -n "${NGINX_SSL_CERT:-}" ]; then
  echo >&3 "=> Replacing nginx certs..."
  sed -i "s|^\(\s*\)#\(listen 443.*\)$|\1\2|g" $NGINX_CONFIG
  sed -i "s|^\(\s*\)#\(ssl_certificate .*\)@cert@;$|\1\2$NGINX_SSL_CERT;|g" $NGINX_CONFIG
  sed -i "s|^\(\s*\)#\(ssl_certificate_key .*\)@certkey@;$|\1\2$NGINX_SSL_CERT_KEY;|g" $NGINX_CONFIG
  echo >&3 "=> Successfully replaced nginx certs."
else
  echo >&3 "=> Skipping replace nginx certs."
fi
