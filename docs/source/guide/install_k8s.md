---
title: Deploy Label Studio on Kubernetes
short: Install using Kubernetes
tier: opensource
type: guide
order: 69
order_enterprise: 0
meta_title: Deploy Label Studio on Kubernetes
meta_description: Deploy Label Studio on Kubernetes, such as on Amazon Elastic Container Service for Kubernetes, to create machine learning and data science projects in a scalable containerized environment.
section: "Install & Setup"
parent: "install"
---

Deploy Label Studio on a Kubernetes Cluster using Helm 3. You can use this Helm chart to set up Label Studio for deployment onto a Kubernetes cluster and install, upgrade, and manage the application.

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS. See the Amazon tutorial on how to [Deploy a Kubernetes Application with Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/getting-started/hands-on/deploy-kubernetes-app-amazon-eks/) for more about deploying an app on Amazon EKS.

<div class="opensource-only">

!!! warning
    To install Label Studio Enterprise Edition, see <a href="install_enterprise_k8s.html">Deploy Label Studio Enterprise on Kubernetes</a>. This page is specific to the community version of Label Studio.

</div>

## Install Label Studio on Kubernetes

If you want to install Label Studio on Kubernetes and you have unrestricted access to the internet from your K8s cluster, follow these steps.

1. Verify that you meet the [Required software prerequisites](#Required-software-prerequisites) and review the [capacity planning](#Capacity-planning) guidance.
2. [Prepare the Kubernetes cluster](#Prepare-the-Kubernetes-cluster).
3. [Add the Helm chart repository](#Add-the-Helm-chart-repository).
4. (Optional) Set up [persistent storage](persistent_storage.html).
5. (Optional) Configure [ingress](ingress_config.html).
6. (Optional) Configure [values.yaml](helm_values.html).
7. (Optional) [Set up TLS for PostgreSQL](#Optional-set-up-TLS-for-PostgreSQL)
8. [Use Helm to install Label Studio on your Kubernetes cluster](#Use-Helm-to-install-Label-Studio-on-your-Kubernetes-cluster).

If you use a proxy to access the internet from your Kubernetes cluster, or it is airgapped from the internet, see how to [Install Label Studio without public internet access](/guide/install_k8s_airgapped.html).

### Required software prerequisites

- Kubernetes and kubectl version 1.17 or higher
- Helm version 3.6.3 or higher

This chart has been tested and confirmed to work with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/docs/). See [Set up an ingress controller for Label Studio Kubernetes deployments](ingress_config.html) for more on ingress settings with Label Studio.

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS.

### Capacity planning

To plan the capacity of your Kubernetes cluster, refer to these guidelines.

Label Studio has the following default configurations for resource requests, resource limits, and replica counts:

```yaml
app:
  replicas: 1
  resources:
    requests:
      memory: 1024Mi
      cpu: 1000m
    limits:
      memory: 6144Mi
      cpu: 4000m
```

Before you make changes to these values, familiarize yourself with the [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) guidelines in the Kubernetes documentation.

If you choose to make changes to these default settings, consider the following:

| For this case                      | Adjust this                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| More than 10 concurrent annotators | Adjust the requests and limits for `resources` in the `app` pod                                 |
| Increase fault tolerance           | Increase the number of replicas of `app` pod                                                    |
| Production deployment (replicas)   | Replicas equivalent or greater than the number of availability zones in your Kubernetes cluster |

### Prepare the Kubernetes cluster

Before installing Label Studio, prepare the Kubernetes cluster with [kubectl](https://kubernetes.io/docs/reference/kubectl/).

### Add the Helm chart repository

Add the Helm chart repository to easily install and update Label Studio.

1. From the command line:
   ```shell
   helm repo add heartex https://charts.heartex.com/
   helm repo update heartex
   ```
2. If you want, check for available versions:
   ```shell
   helm search repo heartex/label-studio
   ```

## Optional: set up TLS for PostgreSQL

To configure Label Studio to use TLS for end-client connections with PostgreSQL, do the following:

1. Enable TLS for your PostgreSQL instance and save Root TLS certificate, client certificate and its key for the next steps.
2. Create a Kubernetes secret with your certificates, replacing `<PATH_TO_CA>`, `<PATH_TO_CLIENT_CRT>` and `<PATH_TO_CLIENT_KEY>` with paths to your certificates:
```shell
kubectl create secret generic <YOUR_SECRET_NAME> --from-file=ca.crt=<PATH_TO_CA> --from-file=client.crt=<PATH_TO_CLIENT_CRT> --from-file=client.key=<PATH_TO_CLIENT_KEY>
```

3. Update your `ls-values.yaml` file with your newly-created Kubernetes secret:

!!! note
    If `POSTGRE_SSL_MODE: verify-ca`, the server is verified by checking the certificate chain up to the root certificate stored on the client. If `POSTGRE_SSL_MODE: verify-full`, the server host name will be verified to make sure it matches the name stored in the server certificate. The SSL connection will fail if the server certificate cannot be verified. `verify-full` is recommended in most security-sensitive environments.

```yaml
global:
  pgConfig:
    ssl:
      pgSslMode: "verify-full"
      pgSslSecretName: "<YOUR_SECRET_NAME>"
      pgSslRootCertSecretKey: "ca.crt"
      pgSslCertSecretKey: "client.crt"
      pgSslKeySecretKey: "client.key"
```

4. Install or upgrade Label Studio using Helm.

## Use Helm to install Label Studio on your Kubernetes cluster

Use Helm to install Label Studio on your Kubernetes cluster. Provide your custom resource definitions YAML file. Specify any environment variables that you need to set for your Label Studio installation using the `--set` argument with the `helm install` command.

!!! note
    If you are deploying to a production environment, you should set the `SSRF_PROTECTION_ENABLED: true` environment variable. See [Secure Label Studio](security#Enable-SSRF-protection-for-production-environments).

From the command line, run the following:

```shell
helm install <RELEASE_NAME> heartex/label-studio -f ls-values.yaml
```

After installing, check the status of the Kubernetes pod creation:

```shell
kubectl get pods
```

## Restart Label Studio using Helm

Restart your Helm release by doing the following from the command line:

1. Identify the &lt;RELEASE_NAME&gt; of the latest Label Studio release:
```shell
helm list
```

2. Restart the Label Studio app:
```shell
kubectl rollout restart deployment/<RELEASE_NAME>-ls-app
```

## Upgrade Label Studio using Helm

To upgrade Label Studio using Helm, do the following.

1. Determine the latest tag version of Label Studio and add/replace the following in your `ls-values.yaml` file:
   ```yaml
   global:
     image:
       tag: "20210914.154442-d2d1935"
   ```
2. After updating the values file, retrieve the latest updates for the Helm chart:
   ```shell
   helm repo update heartex
   ```
3. Run the following from the command line to upgrade your deployment:
   ```shell
   helm upgrade <RELEASE_NAME> heartex/label-studio -f ls-values.yaml
   ```
   If you want, you can specify a version from the command line:
   ```shell
   helm upgrade <RELEASE_NAME> heartex/label-studio -f ls-values.yaml --set global.image.tag=20210914.154442-d2d1935
   ```
   This command overrides the tag value stored in `ls-values.yaml`. You must update the tag value when you upgrade or redeploy your instance to avoid version downgrades.

## Uninstall Label Studio using Helm

To uninstall Label Studio using Helm, delete the configuration.

From the command line, run the following:

```shell
helm delete <RELEASE_NAME>
```
