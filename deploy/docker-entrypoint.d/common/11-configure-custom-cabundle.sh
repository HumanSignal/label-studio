#!/bin/bash

set -e ${DEBUG:+-x}

CUSTOM_CERTS_DIR="$OPT_DIR"/custom_certs_bundle
CUSTOM_CERTS_BUNDLE=$CUSTOM_CERTS_DIR/cacert.pm

if [ -n "${CUSTOM_CA_CERTS:-}" ] && [ ! -f "$CUSTOM_CERTS_BUNDLE" ]; then
  CERTIFI_CA_FILE=$(python3 -m certifi | head -n1)
  mkdir -p "$OPT_DIR"/custom_certs_bundle
  cp "$CERTIFI_CA_FILE" "$CUSTOM_CERTS_BUNDLE"
  IFS=","
  echo >&3 "$0: Found \$CUSTOM_CA_CERTS, going to import certificates"
  for ca_cert in $CUSTOM_CA_CERTS; do
    if [ -f "$ca_cert" ]; then
      echo -e "\n# Custom certificates" >> "$CUSTOM_CERTS_BUNDLE"
      cat "$ca_cert" >> "$CUSTOM_CERTS_BUNDLE"
      echo >&3 "$0: Import certificate file $ca_cert"
    else
      echo >&3 "$0: Missing certificate file $ca_cert"
    fi
  done
fi

if [ -f "$CUSTOM_CERTS_BUNDLE" ]; then
  echo >&3 "$0: Export $CUSTOM_CERTS_BUNDLE as a collection of Root Certificates"
  echo "export REQUESTS_CA_BUNDLE=$CUSTOM_CERTS_BUNDLE" >>"$OPT_DIR"/config_env
  echo "export SSL_CERT_FILE=$CUSTOM_CERTS_BUNDLE" >>"$OPT_DIR"/config_env
fi
