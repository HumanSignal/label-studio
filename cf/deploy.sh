#!/usr/bin/env bash

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/.."

# TODO: get this by calling Cloudformation describe stack
SOURCE_BUNDLE_BUCKET_NAME=salmonvision-elasticbeanstalk-sourcebundle

# Uploading the docker-compose file in the provisioned bucket
aws s3 cp "${project_root}"/cf/docker-compose.yml s3://"${SOURCE_BUNDLE_BUCKET_NAME}"/

project_root/cf/deploy-infra.sh
project_root/cf/deploy-environment.sh
