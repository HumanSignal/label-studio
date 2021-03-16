#!/bin/bash

label-studio -b \
             --host ${HOST:-0.0.0.0} --port ${PORT:-8080} \
             --username ${USERNAME:-""} --password ${PASSWORD:-""} ${INIT_COMMAND:-""}
