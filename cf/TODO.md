# TODO

- Make the S3 bucket work
  - Troubleshoot why CORS does not seem to work. Compare with Eelke setup.
- Replicate Beanstalk config with cloudformation
  - Move the DB config to an env file and thread it with parameters
  - Move the DB in the VPC and make it private
Script to make users and API keys for rcloning videos onto S3
Loop on the deploy infra to poll results of the cf stack readiness

Dockerrun.aws.json is used for ECS
docker-compose.yaml is used for docker on EC2 (from beanstalk)
- setting up SSL termination elastic beanstalk
  - Need access to the registrar
