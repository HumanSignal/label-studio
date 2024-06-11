# Infrastructure on AWS

This folder contains a set of scripts and templates to deploy Salmon Vision
(based on Label Studio Community Edition) to AWS.

## Folder structure

```txt
.
├── README.md                      <-- this README file
├── docker-compose-dev.yml         <-- docker-compose.yml file for prod
├── docker-compose-prod.yml        <-- docker-compose.yml file for env
├── scripts                        <-- contains all scripts to deploy the cf templates
│   ├── deploy
│   └── utils
└── templates                      <-- cf templates
    ├── backend.yml                <-- label studio web app
    ├── bucket_source_bundle.yml   <-- s3 bucket used by backend to store the docker-compose.yml
    ├── ecr.yml                    <-- ECR creation of the salmonvision webapp and ML backends
    └── edge_assets.yml            <-- S3 buckets and IAM users to upload video assets from edge devices located on site
```

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

### Infrastructure

To deploy the infrastructure only, run the following command:

```sh
STAGE=dev ./cf/scripts/deploy/infra/main.sh
```

If you want to deploy only a specific component of the infrastructure, it can
be achieved by running the following scripts:

```sh
STAGE=dev ./cf/scripts/deploy/infra/backend.sh
STAGE=dev ./cf/scripts/deploy/infra/bucket_source_bundle.sh
STAGE=dev ./cf/scripts/deploy/infra/ecr.sh
STAGE=dev ./cf/scripts/deploy/infra/edge_assets.sh
```

### Trigger ElasticBeanstalk Environment update

To trigger an environment update, run the following command:

```sh
STAGE=dev ./cf/scripts/deploy/environment/main.sh
```

It will pull the latest Docker container from the AWS ECR repository and run
it.
The progress of the update can be tracked from the AWS Console under the
ElasticBeanstalk service.
