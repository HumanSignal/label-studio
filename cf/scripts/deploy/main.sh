#!/usr/bin/env bash

# This script runs a full deployment of SalmonVision
# It requires that the STAGE variable is set to either prod or dev
# It does the following:
# - Deploy the cloudformation infrastructure
# - Logging into ECR
# - Build and push a docker image of the local code to the ECR repository
# - Trigger an elastic beanstalk environment deploy

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/../../.."

"${project_root}"/cf/scripts/utils/check_stage.sh

# Check the exit status of the external script
if [[ $? -ne 0 ]]; then
	echo "Exiting main script due to error in check_stage.sh"
	exit 1
fi

DOCKER_CONTAINER_REPOSITORY=391155498039.dkr.ecr.eu-north-1.amazonaws.com
DOCKER_IMAGE_NAME="${DOCKER_CONTAINER_REPOSITORY}/${STAGE}-salmonvision"
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_IMAGE="${DOCKER_IMAGE_NAME}:${GIT_SHA}"
DOCKER_TAG_LATEST="${DOCKER_IMAGE_NAME}:latest"

echo "Deploying AWS infrastructure"
"${project_root}"/cf/scripts/deploy/infra/ecr.sh
"${project_root}"/cf/scripts/deploy/infra/edge_assets.sh
"${project_root}"/cf/scripts/deploy/infra/bucket_source_bundle.sh
# Note: the backend stack should be deployed last
"${project_root}"/cf/scripts/deploy/infra/backend.sh

echo "Building docker image"
docker build -t "${DOCKER_IMAGE}" "${project_root}"
docker tag "${DOCKER_IMAGE}" "${DOCKER_TAG_LATEST}"

echo "Logging into ECR"
aws ecr get-login-password | docker login --username AWS --password-stdin ${DOCKER_CONTAINER_REPOSITORY}

echo "Pushing to ECR"
docker push "${DOCKER_IMAGE_NAME}"

echo "Deploying new environment code"
"${project_root}"/cf/scripts/deploy/environment/main.sh
