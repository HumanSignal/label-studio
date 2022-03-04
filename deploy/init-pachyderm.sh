#!/bin/sh

echo "Setting pachd address: $1"
echo "{\"pachd_address\": \"grpc://$1\"}"\
 | pachctl config set context "local" --overwrite\
 && pachctl config set active-context "local"
