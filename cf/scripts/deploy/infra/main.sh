#!/usr/bin/env bash

# Deploys all infra scripts
# - ecr.sh
# - edge_assets.sh
# - bucket_source_bundle.sh
# - backend.sh

set -x

project_root="$(dirname "${BASH_SOURCE[0]}")/../../../.."

"${project_root}"/cf/scripts/utils/check_stage.sh

# Check the exit status of the external script
if [[ $? -ne 0 ]]; then
	echo "Exiting main script due to error in check_stage.sh"
	exit 1
fi

"${project_root}"/cf/scripts/utils/check_stage.sh

echo "Deploying the ecr template"
"${project_root}"/cf/scripts/deploy/infra/ecr.sh

echo "Deploying the edge_assets template"
"${project_root}"/cf/scripts/deploy/infra/edge_assets.sh

echo "Deploying the bucket_source_bundle template"
"${project_root}"/cf/scripts/deploy/infra/bucket_source_bundle.sh

# Note: the backend stack should be deployed last as it depends on bucket_source_bundle and ecr to function properly
echo "Deploying the backend template"
"${project_root}"/cf/scripts/deploy/infra/backend.sh
