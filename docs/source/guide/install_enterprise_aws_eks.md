---
title: Install Label Studio Enterprise on Amazon Elastic Kubernetes Service (EKS)
short: Install on Amazon EKS
badge: <i class='ent'></i>
type: guide
order: 218
meta_title: Install Label Studio Enterprise on Amazon Elastic Kubernetes Service (EKS)
meta_description: Deploy Label Studio Enterprise on Kubernetes, such as on Amazon Elastic Container Service for Kubernetes, to create machine learning and data science projects in a scalable containerized environment. 
---


Install Label Studio Enterprise on Amazon Elastic Kubernetes Service (EKS).

Before you start, review the [deployment planning guidance](install_enterprise.html).

> For further details beyond these steps, see the Amazon tutorial on how to [Deploy a Kubernetes Application with Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/getting-started/hands-on/deploy-kubernetes-app-amazon-eks/).

## 1. Prerequisites

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

## 2. Deploy Kubernetes using eksctl

Use the eksctl tool to deploy an EKS cluster in your Amazon AWS environment. The eksctl create cluster command creates a virtual private cloud (VPC), a security group, and an IAM role for Kubernetes to create resources. For detailed instructions, see [Getting started with Amazon EKS](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html) in the Amazon EKS User Guide. 

> Note: The Amazon user that creates the cluster is the one managing the cluster. See [Managing users or IAM roles for your cluster](https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html) in the Amazon EKS User Guide.

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

## 3. Prepare the Kubernetes cluster to install Label Studio Enterprise

Before installing Label Studio Enterprise, prepare the Kubernetes cluster with [kubectl](https://kubernetes.io/docs/reference/kubectl/). 

### Retrieve Label Studio Enterprise and configure the license

1. Create a key to pull the latest Label Studio Enterprise image from the Docker registry. From the command line of your cluster, run the following:
    ```shell
    kubectl create secret docker-registry heartex-pull-key \
        --docker-server=https://index.docker.io/v2/ \
        --docker-username=heartexlabs \
        --docker-password=<CUSTOMER_PASSWORD>
    ```
2. Create the Label Studio Enterprise license as a Kubernetes secret. You can specify it as a file or as a specific URL. 
   From the command line, specify the license as a file:
   ```shell
   kubectl create secret generic lse-license --from-file=license=path/to/lic
   ```
   Or from the command line, specify the license as a URL:
   ```shell
   kubectl create secret generic lse-license --from-literal=license=https://lic.heartex.ai/db/<CUSTOMER_LICENSE_ID>
   ```

## 4. Set up Label Studio Enterprise Helm chart

See [Configure a values.yaml file for Label Studio Enterprise](install_enterprise_k8s.html#Configure-values-yaml).
