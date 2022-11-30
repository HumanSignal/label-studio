---
title: Install Label Studio Enterprise on Amazon Elastic Kubernetes Service (EKS)
short: Amazon EKS
tier: enterprise
type: guide
order: 111
order_enterprise: 136
meta_title: Install Label Studio Enterprise on Amazon Elastic Kubernetes Service (EKS)
meta_description: Deploy Label Studio Enterprise on Kubernetes, such as on Amazon Elastic Container Service for Kubernetes, to create machine learning and data science projects in a scalable containerized environment. 
section: "Install"

---


Install Label Studio Enterprise on Amazon Elastic Kubernetes Service (EKS).

Before you start, review the [deployment planning guidance](install_enterprise.html).

!!! note
    For further details beyond these steps, see the Amazon tutorial on how to [Deploy a Kubernetes Application with Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/getting-started/hands-on/deploy-kubernetes-app-amazon-eks/).

## Prerequisites

Before you can install Label Studio Enterprise on an EKS cluster, make sure that the following software prerequisites are installed and configured:

| Software | Version |
| --- | --- |
| Kubernetes and [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) | version 1.17 or higher |
| [AWS CLI](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-console.html) | |
| [eksctl](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html) | | 
| [aws-iam-authenticator](https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html) | |
| Helm | version 3.6.3 or higher |
| Redis | version 6.0.5 or higher |
| PostgreSQL | version 11.9 or higher |

## Deploy Kubernetes using eksctl

Use the eksctl tool to deploy an EKS cluster in your Amazon AWS environment. The eksctl create cluster command creates a virtual private cloud (VPC), a security group, and an IAM role for Kubernetes to create resources. For detailed instructions, see [Getting started with Amazon EKS](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html) in the Amazon EKS User Guide. 

!!! note 
    The Amazon user that creates the cluster is the one managing the cluster. See [Managing users or IAM roles for your cluster](https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html) in the Amazon EKS User Guide.

1. To deploy an EKS cluster, run the following:
```shell
eksctl create cluster \
--name my-cluster \
--region region-code \
```

For example:
```shell
eksctl create cluster --name label-studio-enterprise --region us-east-2
```
2. Then, verify that the deployment was successful:
```shell
kubectl get all
```

After your cluster is up and running, and you configure your infrastructure such as ingress, you can prepare your cluster to install Label Studio Enterprise. 


## Set up Label Studio Enterprise Helm chart

See [Deploy Label Studio Enterprise on Kubernetes](install_enterprise_k8s.html#Add-the-Helm-chart-repository-to-your-Kubernetes-cluster).
