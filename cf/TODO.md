# TODO

- Make the S3 bucket work
  - Troubleshoot why CORS does not seem to work. Compare with Eelke setup.
- Replicate Beanstalk config with cloudformation
  - Make sure to create the proper permissions and roles for the EC2 instance to pull from ECR for instance
  - Possible to inline docker-compose.yaml file in the cloudformation.yaml template?
- CF improvement
  - Prevent buffering aws commands in the deploy scripts
  - shortcircuit if the cf template is not linted and checked
  - Move the DB config to an env file and thread it with parameters
  - Move the DB in the VPC and make it private

Dockerrun.aws.json is used for ECS
docker-compose.yaml is used for docker on EC2 (from beanstalk)
