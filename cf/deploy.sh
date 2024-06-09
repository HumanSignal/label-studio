#!/usr/bin/env bash

# This script runs a full deployment of SalmonVision
# It does the following:
# - Deploy the cloudformation infrastructure
# - Build and push a docker image of the local code to the ECR repository
# - Trigger an elastic beanstalk environment deploy

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/.."

STAGE=prod
CONTAINER_REPOSITORY=391155498039.dkr.ecr.eu-north-1.amazonaws.com
NAME="${CONTAINER_REPOSITORY}/${STAGE}-salmonvision-backend-repository"
TAG=$(git rev-parse --short HEAD)
IMG="${NAME}:${TAG}"
LATEST="${NAME}:latest"

echo "Deploying AWS infrastructure"
"${project_root}"/cf/deploy-infra.sh

echo "Building docker image"
docker build -t "${IMG}" "${project_root}"
docker tag "${IMG}" "${LATEST}"

echo "Logging into ECR"
aws ecr get-login-password | docker login --username AWS --password-stdin ${CONTAINER_REPOSITORY}

echo "Pushing to ECR"de
docker push "${NAME}"

echo "Deploying new environment code"
"${project_root}"/cf/deploy-environment.sh
