#!/usr/bin/env bash

# This script deploys the bucket_source_bundle.yml template

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/../../../.."

"${project_root}"/cf/scripts/utils/check_stage.sh

# Check the exit status of the external script
if [[ $? -ne 0 ]]; then
	echo "Exiting main script due to error in check_stage.sh"
	exit 1
fi

AWS_ACCOUNT_ID="391155498039"
PREFIX_STACK_NAME="${STAGE}-salmonvision"
STACK_NAME="${PREFIX_STACK_NAME}-bucketsourcebundle"
BUCKET_NAME="${PREFIX_STACK_NAME}-elasticbeanstalk-sourcebundle-${AWS_ACCOUNT_ID}"

aws cloudformation validate-template \
	--template-body file://"${project_root}"/cf/templates/bucket_source_bundle.yml \
	--no-cli-pager
validation_status=$?

# Check if the command was successful
if [ "$validation_status" -ne 0 ]; then
	echo "Template validation failed"
	exit 1
fi

# Deployment
# ----------

aws cloudformation deploy \
	--template-file "${project_root}"/cf/templates/bucket_source_bundle.yml \
	--stack-name "${STACK_NAME}" \
	--parameter-overrides BucketName="${BUCKET_NAME}" \
	--capabilities CAPABILITY_IAM

# Uploading the docker-compose file in the provisioned bucket

aws s3 cp "${project_root}"/cf/docker-compose-"${STAGE}".yml s3://"${BUCKET_NAME}"/docker-compose.yml
