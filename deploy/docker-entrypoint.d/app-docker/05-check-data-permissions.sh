#!/bin/bash

# Delegate to shared data-permissions check script
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
exec "$SCRIPT_DIR/../common/05-check-data-permissions.sh"