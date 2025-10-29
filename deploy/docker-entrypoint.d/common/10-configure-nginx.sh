#!/bin/sh
set -e ${DEBUG:+-x}

NGINX_CONFIG=$OPT_DIR/nginx/nginx.conf

echo >&3 "=> Copy nginx config file..."
mkdir -p "$OPT_DIR/nginx"
\cp -f /etc/nginx/nginx.conf $NGINX_CONFIG

echo >&3 "=> Configure system resolver..."
# Process each nameserver individually, wrapping only valid IPv6 addresses in square brackets.
# This regex accepts only hex digits and colons so that IPv4 addresses with :port are not captured.
nameservers=$(awk '$1=="nameserver" {
    ns = $2;
    # Capture only IPv6 addresses (they contain a colon and no dot)
    if (ns ~ /^[0-9a-fA-F:]+$/ && ns ~ /:/ && ns !~ /\./) {
        printf "[%s] ", ns;
    } else {
        # IPv4 addresses
        printf "%s ", ns;
    }
}' /etc/resolv.conf)
echo "resolver $nameservers;" > $OPT_DIR/nginx/resolv.conf

# Configure nginx error logging
echo >&3 "=> Configuring nginx error logging..."
NGINX_ERROR_LOG_LEVEL=${NGINX_ERROR_LOG_LEVEL:-warn}

# Validate log level
case "$NGINX_ERROR_LOG_LEVEL" in
  debug|info|notice|warn|error|crit|alert|emerg)
    echo >&3 "=> Setting error log level to: $NGINX_ERROR_LOG_LEVEL"
    ;;
  *)
    echo >&3 "=> Warning: Invalid log level '$NGINX_ERROR_LOG_LEVEL', using 'warn' as default"
    NGINX_ERROR_LOG_LEVEL=warn
    ;;
esac

sed -i "s|error_log /dev/stderr info;|error_log /dev/stderr $NGINX_ERROR_LOG_LEVEL;|g" $NGINX_CONFIG

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
