---
title: Install Label Studio Enterprise on AWS Private Cloud
badge: <i class='ent'></i>
type: guide
order: 202
meta_title: Install Label Studio Enterprise on AWS Private Cloud
meta_description: Install and upgrade Label Studio Enterprise on AWS VPC to create machine learning and data science projects. 
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

If you want to manage your own Label Studio Enterprise installation in the cloud, follow these steps to install it in AWS Virtual Private Cloud (VPC). You can also [install Label Studio Enterprise on-premises using Docker](install_enterprise.html) if you need to meet strong privacy regulations, legal requirements, or want to manage a custom installation on your own infrastructure.

<div class="enterprise"><p>
To install Label Studio Community Edition, see <a href="install.html">Install and Upgrade Label Studio</a>. This page is specific to the Enterprise version of Label Studio.
</p></div>

<!-- md deploy.md -->

## Install Label Studio Enterprise on AWS Private Cloud

You can deploy to your own private cloud with all necessary components provided by Amazon AWS services. The bundle comes with the following configuration for the Amazon services:

- Virtual Private Cloud (VPC)
- Identity and Access Management (IAM)
- Route53
- Elastic Container Registry (ECR)
- Elastic Container Service (ECS)
- Simple Storage Service (S3)
- ElastiCache
- Relational Database Service (RDS)
- Systems Manager Agent (SSM)
- CodeDeploy

Deployment scripts are distributed as [terraform](https://www.terraform.io/) configuration files (.tf). 

### Prerequisites

Download and install the Terraform package for your operating system and architecture. Recommended terraform version: v0.12.18 or higher

You must have a root user with all the required permissions for deploying AWS components. If you do not have an active AWS profile with full administrative access, see [Create a root user](#Create-a-root-user) on this page. 

#### Create a root user

1. In the `user/` directory of your VPC, review and if necessary, modify `user.tf` parameters to match the following:

```hcl
locals {
  user_name   = "heartex-production"
  policy_name = "heartex-production"
  bucket_name = "heartex-terraform-state" // S3 bucket name used to store terraform state
}
```
2. Initialize and run Terraform inside that directory:
```bash
terraform init
terraform apply
```
If Terraform completes successfully, you see the following output:
```haml
Apply complete! Resources: 6 added, 0 changed, 0 destroyed.

Outputs:

iam_access_key_id = AKIAAWSACCESSKEYID
iam_access_key_secret = 9FaIL7Eza8mAwSsEcReTAcCeSsKeY
```
3. Store the user credentials in your local environment in a specific AWS named profile. For example, append the following credentials to the `~/.aws/credentials` file:
```text
[heartex-production]
aws_access_key_id = AKIAAWSACCESSKEYID
aws_secret_access_key = 9FaIL7Eza8mAwSsEcReTAcCeSsKeY
```
4. After storing the user credentials, use them for your Label Studio instance by updating the `AWS_PROFILE` environment variable to reference these new credentials:
   `export AWS_PROFILE=heartex-production`
   
For more about configuring AWS in your local environment, see [Configuring the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) in the Amazon AWS documentation.

### Configure your VPC

Configure your Amazon VPC to work with Label Studio Enterprise. 

> You must know your AWS account ID to perform these configurations. If you do not know it, you can retrieve it from the AWS STS API: `aws sts get-caller-identity`

1. In the `envs/production` directory, open the `main.tf` file.
2. In the `locals` section for your private cloud settings, make updates to match the following example. Update placeholders such as the `public_dns_namespace` or `account_id` to match the values relevant for your environment. 
```hcl
locals {
  stack_name           = "heartex-production"
  aws_region           = "us-west-1"
  aws_profile          = "heartex-production"
  public_dns_namespace = "my.heartex.com"
  account_id           = "490012345678" // your AWS account ID

  images          = ["webapp"]
  image_webapp    = "${local.account_id}.dkr.ecr.${local.aws_region}.amazonaws.com/${local.aws_profile}/webapp:latest"

  vpc_cidr_block     = "10.0.0.0/16"
  cidrsubnet_newbits = 8

  bucket_name = "heartex-bucket" // S3 storage for internal use

  node_type = "cache.t2.micro" 

  allocated_storage = 5
  user_name         = "postgres" // DB user name
  storage_type      = "gp2" // Storage type: Standard, «gp2» (general-purpose SSD) or «io1» (SSD IOPS)
  instance_class    = "db.t2.micro"  // DB instance type (https://aws.amazon.com/ru/rds/instance-types/)

  licence_file_path = "${path.root}/license.txt"

  // Additional parameters
  redis_ssl           = 0
  redis_ssl_cert_reqs = "required"
  // ...
```

### Deploy Label Studio Enterprise 

1. Add a license to your VPC. Place the license file in the same directory as the `main.tf` file. For example, `envs/production/license.txt`.
2. Initialize Terraform so that you can use it to deploy the relevant modules. From the command line, run the following:
```bash
terraform init
```
3. Create an IAM role to use for deploying and updating images. From the command line, run the following:
```bash
terraform apply -target module.iam
```
Store the output credentials in a secure location. You can use them to make Lambda invocations to deploy updates to your VPC. 
4. Create an elastic container registry (ECR) to store the Label Studio Enterprise images. From the command line, run the following:
```bash
terraform apply -target module.ecr
```
You see the following output in your console:
```bash
ecr_repository_urls = {
  "webapp" = "490012345678.dkr.ecr.us-west-1.amazonaws.com/heartex-production/webapp"
}
iam_access_key_maintainer_id = AKIAXEGRLHACCESSKEYID
iam_access_key_maintainer_secret = mrKlneaqzXVcFKlTSECrEtAcCeSsKeY
```
You use the `ecr_repository-urls` to make updates and push new Label Studio Enterprise versions to your VPC.
5. Upload images to the ECR. Make sure you have the latest Label Studio Enterprise Docker image. From the command line, run the following:
```bash
docker tag <image name:version> 490012345678.dkr.ecr.us-west-1.amazonaws.com/heartex-production/webapp
docker push 490012345678.dkr.ecr.us-west-1.amazonaws.com/heartex-production/webapp 
```
6. Configure a managed DNS service for your VPC with a public URL specified by the `public_dns_namespace` in the `main.tf` file. From the command line, run the following:
```bash
terraform apply -target module.route53
```
The output contains name servers records that you can use to [create a hosted zone in DNS](https://console.aws.amazon.com/route53/v2/hostedzones#CreateHostedZone) for your VPC. 
```bash
route53_zone_name_servers = [
  "ns-1234.awsdns-12.org",
  "ns-5678.awsdns-12.co.uk",
  "ns-123.awsdns-34.com",
  "ns-456.awsdns-34.net"
]
```
DNS might take some time to update with the latest records. 
7. Deploy the remaining modules. From the command line, run the following:
```bash
terraform apply
```
It takes about ten minutes for the modules to finish deploying. 

If you see an error, `Error describing created certificate: Expected certificate to be issued but was in state PENDING_VALIDATION`, try finishing the deployment later. This error can be caused by invalid DNS servers, which can take some time to be updated with the newest records.

## Update Label Studio Enterprise on AWS Private Cloud

To update Label Studio Enterprise on AWS Private Cloud, update your installation to the latest image in the ECR using blue/green deployment.

From the command line, run the following:
```bash
aws --region <selected-region> lambda invoke --function-name <chosen-stack-name>-deploy --payload '{"service": "webapp", "image": "<image-name-with-proper-version-tag>"}' result.json && cat result.json| jq .
```

### Remove a private cloud instance
Destroy all created services by running [terraform destroy](https://www.terraform.io/docs/cli/commands/destroy.html):

```bash
terraform destroy
```


