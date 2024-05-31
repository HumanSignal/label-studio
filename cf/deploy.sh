#!/usr/bin/env bash

set -x

STACK_NAME=salmonvision

aws cloudformation validate-template --template-body file://template.yaml

aws cloudformation update-stack --stack-name "$STACK_NAME" --template-body file://template.yaml

aws cloudformation describe-stacks --stack-name "$STACK_NAME"
