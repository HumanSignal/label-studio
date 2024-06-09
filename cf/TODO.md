# TODO

- investigate why in the ECRs only the last one keep a tag, tag it also with git sha
- Move bash variables to common file
  - Same with the S3 bucket
- Make the S3 bucket work
  - Troubleshoot why CORS does not seem to work. Compare with Eelke setup.
- Harden the templates and infrastructure
  - Move the DB config to an env file and thread it with parameters
  - Move the DB in the VPC and make it private
Script to make users and API keys for rcloning videos onto S3

Dockerrun.aws.json is used for ECS
docker-compose.yaml is used for docker on EC2 (from beanstalk)
- setting up SSL termination elastic beanstalk
  - Need access to the registrar
- A docker image needs to be pushed first- could be interesting to split the ECR creation and provision from the backend?
