#!/usr/bin/env bash

project_root="$(dirname "${BASH_SOURCE[0]}")/.."

echo "Deploying AWS infrastructure"
"${project_root}"/cf/deploy-infra.sh

echo "Deploying new environment code"
"${project_root}"/cf/deploy-environment.sh
