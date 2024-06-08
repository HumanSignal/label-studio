#!/usr/bin/env bash

set -x

# This will redeploy the environment, pulling the latest code from the ECR repository
aws elasticbeanstalk update-environment \
	--application-name SalmonVisionLabelStudio \
	--environment-name SalmonVisionLabelStudio-env \
	--version-label SalmonVisionLabelStudio-version-9
