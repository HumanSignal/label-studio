#!/bin/bash

set -e ${DEBUG:+-x}

echo >&3 "=> Checking data directory permissions: $LABEL_STUDIO_BASE_DATA_DIR"

# Check if data directory is writable
if [ ! -w "$LABEL_STUDIO_BASE_DATA_DIR" ]; then
    echo >&3 "ERROR: Data directory is not writable: $LABEL_STUDIO_BASE_DATA_DIR"
    echo >&3 "-----------------------------------------------------"
    echo >&3 "Current user:"
    echo >&3 "  UID        = $(id -u)"
    echo >&3 "  GID        = $(id -g)"
    echo >&3 ""
    echo >&3 "Directory owner and permissions:"
    ls -ld "$LABEL_STUDIO_BASE_DATA_DIR" >&3 || echo >&3 "  Unable to stat directory: $LABEL_STUDIO_BASE_DATA_DIR"
    echo >&3 ""
    echo >&3 "To resolve this issue:"
    echo >&3 "  - On the Docker host, ensure the user running the container has write access to the mount volume."
    echo >&3 "  - If you are mounting a host directory as -v mydata:/label-studio/data:"
    echo >&3 "      rm -rf mydata"
    echo >&3 "      mkdir -p mydata"
    echo >&3 "      sudo chown :0 mydata"
    echo >&3 ""
    echo >&3 "Refer to the documentation for more details:"
    echo >&3 "  https://labelstud.io/guide/install_troubleshoot.html#File-permissions-for-non-root-user"
    exit 1
fi

echo >&3 "=> Data directory permissions check completed successfully"
