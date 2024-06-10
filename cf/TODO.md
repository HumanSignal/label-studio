# TODO

- Deploy STAGE=prod ecr.yml
- Tag labelstudio as latest and push to new ecr repository for webapp
- redeploy in full the salmonvision webapp
- Setup ML backend integration with YOLOv8 as model
  - Leverage a github repo for this?
  - Try it locally with a ls local install
- investigate why in the ECRs only the last one keep a tag, tag it also with git sha
- Move bash variables to common file
  - Same with the S3 bucket
- Make the S3 bucket work
  - Troubleshoot why CORS does not seem to work. Compare with Eelke setup.
- Harden the templates and infrastructure
  - Move the DB config to an env file and thread it with parameters
  - Move the DB in the VPC and make it private

Dockerrun.aws.json is used for ECS
docker-compose.yaml is used for docker on EC2 (from beanstalk)
- setting up SSL termination elastic beanstalk
  - Need access to the registrar

## SSL certificates

### Resources

- https://medium.com/@jameshamann/configuring-your-elastic-beanstalk-app-for-ssl-9065ca091f49
- https://aws.plainenglish.io/setup-ssl-https-on-elastic-beanstalk-single-instance-environment-d748ea04437d?gi=c21e0ed7f12a

## ML Integration

Gitub Repos to get inspiration from:
- https://github.com/seblful/label-studio-yolov8-backend
- https://github.com/35grain/label-studio-yolov8-backend

### Resources

- https://hackmd.io/@6mXGdyTDQIKh9W0MWwTgIg/SkQylsyV3
- https://github.com/HumanSignal/label-studio-ml-backend
