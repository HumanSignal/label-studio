# Infrastructure on AWS

This folder contains a set of scripts and template to deploy Label Studio
Community Edition to AWS.

## AWS credentials

Ask your AWS administrator to create a user and generate your API credentials.

## Deployment

Two stages can be used to deploy the infrastructure: `prod` and `dev`. `dev` is
typically used during development to try out infrastructure and code changes
without impacting the production setup.

A stage is set using the `STAGE` environment variable.

Export in your shell the STAGE variable and set it to `dev`. It also persists
it across commands.

```sh
export STAGE=dev
./cf/scripts/deploy/main.sh
./cf/scripts/deploy/environment/main.sh
```

Use `STAGE` for running a dedicated script or command.

```sh
STAGE=dev ./cf/scripts/deploy/main.sh
STAGE=dev ./cf/scripts/deploy/environment/main.sh
```

### All

To deploy the infrastructure and retrigger an elasticbeanstalk environment
build, one can run the following command:

```sh
STAGE=dev ./cf/scripts/deploy/main.sh
```

The progress of the deployment can be tracked from the AWS Console under the
Cloudformation and ElasticBeanstalk services.

### Trigger ElasticBeanstalk Environment update

To trigger an environment update, run the following command:

```sh
STAGE=dev ./cf/scripts/deploy/environment/main.sh
```

It will pull the latest Docker container from the AWS ECR repository and run
it.
The progress of the update can be tracked from the AWS Console under the
ElasticBeanstalk service.
