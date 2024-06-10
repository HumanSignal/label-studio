#!/usr/bin/env bash

# Util script to check whether the STAGE variable is set. Useful when deploying cloudformation templates and ensuring that dev or prod is set.

# Check if the STAGE variable is set
if [[ -z "$STAGE" ]]; then
	echo "Error: STAGE variable is not set."
	exit 1
fi

# Check if the STAGE variable is set to either 'prod' or 'dev'
if [[ "$STAGE" != "prod" && "$STAGE" != "dev" ]]; then
	echo "Error: STAGE variable must be set to either 'prod' or 'dev'."
	exit 1
fi

echo "STAGE is set to a valid value: $STAGE"
