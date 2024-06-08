#!/usr/bin/env bash

set -x

aws ecr get-login-password | docker login --username AWS --password-stdin 391155498039.dkr.ecr.eu-north-1.amazonaws.com

# Pushing the container
# docker push 391155498039.dkr.ecr.eu-north-1.amazonaws.com/salmonvision-repository:latest
#

# TODO: use best practice for tagging the images (git sha for instance)
