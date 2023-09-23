#!/bin/sh
set -e ${DEBUG:+-x}

echo >&3 "=> Run label-studio init..."
label-studio init -q >&3
echo >&3 "=> label-studio init completed."