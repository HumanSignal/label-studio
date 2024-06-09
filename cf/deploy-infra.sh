#!/usr/bin/env bash

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/.."

STAGE=prod
STACK_NAME=salmonvision
CHANGE_SET_NAME="change-set-$(date +%Y%m%d%H%M%S)"

aws cloudformation validate-template \
	--template-body file://"${project_root}"/cf/templates/backend.yml \
	--no-cli-pager
validation_status=$?

# Check if the command was successful
if [ "$validation_status" -ne 0 ]; then
	echo "Template validation failed"
	exit 1
fi

aws s3 cp "${project_root}"/cf/docker-compose.yml s3://salmonvision-elasticbeanstalk-sourcebundle/

# Backend template
# Create a change set
create_output=$(
	aws cloudformation create-change-set \
		--stack-name "$STACK_NAME" \
		--template-body file://"${project_root}"/cf/templates/backend.yml \
		--change-set-name "$CHANGE_SET_NAME" \
		--change-set-type UPDATE \
		--no-cli-pager \
		--capabilities CAPABILITY_IAM \
		--parameters ParameterKey=DBUser,ParameterValue=chinook ParameterKey=DBPassword,ParameterValue=zBMgsfPKKQVohqK \
		2>&1
)
create_status=$?

if [ $create_status -ne 0 ]; then
	echo "Failed to create change set: $create_output"
	exit 1
fi

# Wait for the change set to be created
aws cloudformation wait change-set-create-complete \
	--stack-name "$STACK_NAME" \
	--change-set-name "$CHANGE_SET_NAME"

# Describe the change set
describe_output=$(aws cloudformation describe-change-set \
	--stack-name "$STACK_NAME" \
	--change-set-name "$CHANGE_SET_NAME" \
	--no-cli-pager)
resource_changes=$(echo "$describe_output" | jq '.Changes | length')

if [ "$resource_changes" -eq 0 ]; then
	echo "No changes detected. Deleting change set."
	aws cloudformation delete-change-set \
		--stack-name "$STACK_NAME" \
		--change-set-name "$CHANGE_SET_NAME" \
		--no-cli-pager
	exit 0
else
	echo "Changes detected. Executing change set."
	aws cloudformation execute-change-set \
		--stack-name "$STACK_NAME" \
		--change-set-name "$CHANGE_SET_NAME" \
		--no-cli-pager
	# Wait for the change set execution to complete
	while true; do
		status=$(aws cloudformation describe-stacks \
			--stack-name "$STACK_NAME" \
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
