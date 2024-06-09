#!/usr/bin/env bash

# This script triggers an elastic beanstalk environment deploy.
# It pulls the latest docker image from the ECR and redeploys it on the EC2 instances.
# It requires that the STAGE variable is set to either prod or dev

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/.."

"${project_root}"/cf/check_stage.sh

# Check the exit status of the external script
if [[ $? -ne 0 ]]; then
	echo "Exiting main script due to error in check_stage.sh"
	exit 1
fi

PREFIX_STACK_NAME="${STAGE}-salmonvision"
BACKEND_STACK_NAME="${PREFIX_STACK_NAME}-backend"

# Querying and parsing CF stack to deploy the beanstalk environment
APPLICATION_NAME=$(aws cloudformation describe-stacks --stack-name "${BACKEND_STACK_NAME}" | jq '.Stacks[0].Outputs[] | select(.OutputKey == "ElasticBeanstalkApplicationName").OutputValue' --raw-output)
ENVIRONMENT_NAME=$(aws cloudformation describe-stacks --stack-name "${BACKEND_STACK_NAME}" | jq '.Stacks[0].Outputs[] | select(.OutputKey == "ElasticBeanstalkEnvironmentName").OutputValue' --raw-output)
VERSION_LABEL=$(aws cloudformation describe-stacks --stack-name "${BACKEND_STACK_NAME}" | jq '.Stacks[0].Outputs[] | select(.OutputKey == "ElasticBeanstalkApplicationEnvironmentVersion").OutputValue' --raw-output)

echo "Deploying the application ${APPLICATION_NAME} with environment ${ENVIRONMENT_NAME} and version ${VERSION_LABEL}"
aws elasticbeanstalk update-environment \
	--application-name "${APPLICATION_NAME}" \
	--environment-name "${ENVIRONMENT_NAME}" \
	--version-label "${VERSION_LABEL}" \
	--no-cli-pager

# Polling the status of the environment and exiting either on failure or success.
while true; do
	status=$(aws elasticbeanstalk describe-environments \
		--environment-names "${ENVIRONMENT_NAME}" \
		--query "Environments[0].Status" \
		--output text \
		--no-cli-pager)
	if [ "$status" == "Ready" ]; then
		echo "Deployment change has landed successfully!"
		break
	elif [ "$status" == "Terminated" ]; then
		echo "Deployment change failed to land, environment is terminated."
		exit 1
	else
		echo "Deployment change is still in progress, current status: $status"
		sleep 10 # Adjust the sleep time as needed
	fi
done
