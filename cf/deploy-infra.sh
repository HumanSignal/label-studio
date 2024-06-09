#!/usr/bin/env bash

# This script deploys the required infrastructure to run Salmon Vision.
#
# Currently, two cloudformation stacks are deployed:
#
# - SourceBundleBucket: which creates an S3 bucket to store the docker-compose.yml file that Beanstalk uses
# - Backend: Database setup, S3 buckets to store asset uploads, ECR repository to push new docker images.
# It requires that the STAGE variable is set to either prod or dev
#
# Make sure that your AWS profile is activated and that you can deploy the changes via the CLI.

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/.."

"${project_root}"/cf/check_stage.sh

# Check the exit status of the external script
if [[ $? -ne 0 ]]; then
	echo "Exiting main script due to error in check_stage.sh"
	exit 1
fi

AWS_ACCOUNT_ID="391155498039"
# Prefix for the stack names to be deployed
PREFIX_STACK_NAME="${STAGE}-salmonvision"
SOURCE_BUNDLE_BUCKET_STACK_NAME="${PREFIX_STACK_NAME}-bucketsourcebundle"
ECR_STACK_NAME="${PREFIX_STACK_NAME}-container-registry"
SOURCE_BUNDLE_BUCKET_NAME="${PREFIX_STACK_NAME}-elasticbeanstalk-sourcebundle-${AWS_ACCOUNT_ID}"
BACKEND_STACK_NAME="${PREFIX_STACK_NAME}-backend"
BACKEND_CHANGE_SET_NAME="change-set-$(date +%Y%m%d%H%M%S)"

# Template validation
# -------------------

# 0. ECR template
#
aws cloudformation validate-template \
	--template-body file://"${project_root}"/cf/templates/ecr.yml \
	--no-cli-pager
validation_status=$?

# Check if the command was successful
if [ "$validation_status" -ne 0 ]; then
	echo "Template validation failed"
	exit 1
fi

# 1. bucket_source_bundle template

aws cloudformation validate-template \
	--template-body file://"${project_root}"/cf/templates/bucket_source_bundle.yml \
	--no-cli-pager
validation_status=$?

# Check if the command was successful
if [ "$validation_status" -ne 0 ]; then
	echo "Template validation failed"
	exit 1
fi

# # 2. Backend template

aws cloudformation validate-template \
	--template-body file://"${project_root}"/cf/templates/backend.yml \
	--no-cli-pager
validation_status=$?

# Check if the command was successful
if [ "$validation_status" -ne 0 ]; then
	echo "Template validation failed"
	exit 1
fi

# Deploying CF templates
# ----------------------

# 0. ecr

aws cloudformation deploy \
	--template-file "${project_root}"/cf/templates/ecr.yml \
	\
	--stack-name ${ECR_STACK_NAME} \
	--parameter-overrides Stage=${STAGE} \
	--capabilities CAPABILITY_IAM

# 1. bucket_source_bundle

aws cloudformation deploy \
	--template-file "${project_root}"/cf/templates/bucket_source_bundle.yml \
	\
	--stack-name ${SOURCE_BUNDLE_BUCKET_STACK_NAME} \
	--parameter-overrides BucketName=${SOURCE_BUNDLE_BUCKET_NAME} \
	--capabilities CAPABILITY_IAM

# # Uploading the docker-compose file in the provisioned bucket
aws s3 cp "${project_root}"/cf/docker-compose-"${STAGE}".yml s3://"${SOURCE_BUNDLE_BUCKET_NAME}"/docker-compose.yml

# # Backend template
# # ----------------

# Note: set --change-set-type CREATE if you need to recreate from scratch
create_output=$(
	aws cloudformation create-change-set \
		--stack-name ${BACKEND_STACK_NAME} \
		--template-body file://"${project_root}"/cf/templates/backend.yml \
		--change-set-name "$BACKEND_CHANGE_SET_NAME" \
		--change-set-type UPDATE \
		--capabilities CAPABILITY_IAM \
		--parameters ParameterKey=Stage,ParameterValue=${STAGE} ParameterKey=SourceBundleBucketName,ParameterValue=${SOURCE_BUNDLE_BUCKET_NAME} ParameterKey=DBUser,ParameterValue=chinook ParameterKey=DBPassword,ParameterValue=zBMgsfPKKQVohqK \
		--no-cli-pager \
		2>&1
)
create_status=$?

if [ $create_status -ne 0 ]; then
	echo "Failed to create change set: $create_output"
	exit 1
fi

aws cloudformation wait change-set-create-complete \
	--stack-name ${BACKEND_STACK_NAME} \
	--change-set-name "$BACKEND_CHANGE_SET_NAME"

describe_output=$(aws cloudformation describe-change-set \
	--stack-name ${BACKEND_STACK_NAME} \
	--change-set-name "$BACKEND_CHANGE_SET_NAME" \
	--no-cli-pager)
resource_changes=$(echo "$describe_output" | jq '.Changes | length')

if [ "$resource_changes" -eq 0 ]; then
	echo "No changes detected. Deleting change set."
	aws cloudformation delete-change-set \
		--stack-name ${BACKEND_STACK_NAME} \
		--change-set-name "$BACKEND_CHANGE_SET_NAME" \
		--no-cli-pager
	exit 0
else
	echo "Changes detected. Executing change set."
	aws cloudformation execute-change-set \
		--stack-name "$BACKEND_STACK_NAME" \
		--change-set-name "$BACKEND_CHANGE_SET_NAME" \
		--no-cli-pager

	# Wait for the change set execution to complete
	while true; do
		status=$(aws cloudformation describe-stacks \
			--stack-name "$BACKEND_STACK_NAME" \
			--query "Stacks[0].StackStatus" \
			--output text)
		echo "Current stack status: $status"
		if [[ "$status" == *"_COMPLETE"* ]] || [[ "$status" == *"_FAILED"* ]]; then
			echo "Stack update completed with status: $status"
			break
		else
			echo "Waiting for stack update to complete..."
			sleep 10 # Adjust the sleep time as needed
		fi
	done
	exit 0
fi
