#!/usr/bin/env bash

# This script deploys the edge_assets.yml template
#
set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/../../../.."

"${project_root}"/cf/scripts/utils/check_stage.sh

# Check the exit status of the external script
if [[ $? -ne 0 ]]; then
	echo "Exiting main script due to error in check_stage.sh"
	exit 1
fi

PREFIX_STACK_NAME="${STAGE}-salmonvision"
STACK_NAME="${PREFIX_STACK_NAME}-edge-assets"

aws cloudformation validate-template \
	--template-body file://"${project_root}"/cf/templates/edge_assets.yml \
	--no-cli-pager
validation_status=$?

# Check if the command was successful
if [ "$validation_status" -ne 0 ]; then
	echo "Template validation failed"
	exit 1
fi

# Deployment

aws cloudformation deploy \
	--template-file ./cf/templates/edge_assets.yml \
	--stack-name "${STACK_NAME}" \
	--parameter-overrides Stage="${STAGE}" \
	--capabilities CAPABILITY_NAMED_IAM
