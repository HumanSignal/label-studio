#!/usr/bin/env bash

# This script runs a full deployment of SalmonVision
# It does the following:
# - Deploy the cloudformation infrastructure
# - Logging into ECR
# - Build and push a docker image of the local code to the ECR repository
# - Trigger an elastic beanstalk environment deploy

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/.."

STAGE=prod
DOCKER_CONTAINER_REPOSITORY=391155498039.dkr.ecr.eu-north-1.amazonaws.com
DOCKER_IMAGE_NAME="${DOCKER_CONTAINER_REPOSITORY}/${STAGE}-salmonvision-backend-repository"
DOCKER_IMAGE_TAG=$(git rev-parse --short HEAD)
DOCKER_IMAGE="${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
DOCKER_TAG_LATEST="${DOCKER_IMAGE_NAME}:latest"

echo "Deploying AWS infrastructure"
"${project_root}"/cf/deploy-infra.sh

echo "Building docker image"
docker build -t "${DOCKER_IMAGE}" "${project_root}"
docker tag "${DOCKER_IMAGE}" "${DOCKER_TAG_LATEST}"

echo "Logging into ECR"
aws ecr get-login-password | docker login --username AWS --password-stdin ${DOCKER_CONTAINER_REPOSITORY}

echo "Pushing to ECR"
docker push "${DOCKER_IMAGE_NAME}"

echo "Deploying new environment code"
"${project_root}"/cf/deploy-environment.sh
