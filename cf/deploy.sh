#!/usr/bin/env bash

set -x

STAGE=prod
STACK_NAME=salmonvision
CHANGE_SET_NAME="change-set-$(date +%Y%m%d%H%M%S)"

aws cloudformation validate-template --template-body file://template.yaml --no-cli-pager
validation_status=$?

# Check if the command was successful
if [ "$validation_status" -ne 0 ]; then
	echo "Template validation failed"
	exit 1
fi

# TODO use a constant here and call aws cli to create the bucket if it does not exist
# Uploading the docker-compose file to the S3 bucket
aws s3 cp docker-compose.yml s3://salmonvision-elasticbeanstalk-sourcebundle/

# Create a change set
create_output=$(aws cloudformation create-change-set --stack-name "$STACK_NAME" --template-body file://template.yaml --change-set-name "$CHANGE_SET_NAME" --change-set-type UPDATE --no-cli-pager --capabilities CAPABILITY_IAM 2>&1)
create_status=$?

if [ $create_status -ne 0 ]; then
	echo "Failed to create change set: $create_output"
	exit 1
fi

# Wait for the change set to be created
aws cloudformation wait change-set-create-complete --stack-name "$STACK_NAME" --change-set-name "$CHANGE_SET_NAME"

# Describe the change set
describe_output=$(aws cloudformation describe-change-set --stack-name "$STACK_NAME" --change-set-name "$CHANGE_SET_NAME" --no-cli-pager)
resource_changes=$(echo "$describe_output" | jq '.Changes | length')

if [ "$resource_changes" -eq 0 ]; then
	echo "No changes detected. Deleting change set."
	aws cloudformation delete-change-set --stack-name "$STACK_NAME" --change-set-name "$CHANGE_SET_NAME" --no-cli-pager
	exit 0
else
	echo "Changes detected. Executing change set."
	aws cloudformation execute-change-set --stack-name "$STACK_NAME" --change-set-name "$CHANGE_SET_NAME" --no-cli-pager
	exit 0
fi
