---
title: Install Label Studio Enterprise on AWS Private Cloud
type: guide
order: 202
meta_title: Install and Upgrade Enterprise
meta_description: Label Studio Documentation for installing and upgrading Label Studio Enterprise with Docker or on AWS to use for your machine learning and data science projects. 
---

If you want to manage your own Label Studio Enterprise installation in the cloud, follow these steps to install it in AWS Virtual Private Cloud (VPC). You can also [install Label Studio Enterprise on-premises using Docker](install_enterprise.html) if you need to meet strong privacy regulations, legal requirements, or want to manage a custom installation on your own infrastructure.

> To install Label Studio Community Edition, see [Install and Upgrade Label Studio](install.html). This page is specific to the Enterprise version of Label Studio.

<!-- md deploy.md -->

## Install Label Studio Enterprise on AWS Private Cloud

### Prerequisites

#### Create a root user

### Configure your VPC

### Deploy Label Studio Enterprise 

1. Add a license
2. Initialize Terraform
3. Create a deploy user
4. Create a container registry
5. Upload images to the container registry
6. Configure DNS
7. Deploy the remaining modules

### Update your VPC instance

### Remove a private cloud instance
Destroy all created services by running [terraform destroy](https://www.terraform.io/docs/cli/commands/destroy.html):

```bash
terraform destroy
```


