---
title: Deploy Label Studio Enterprise on Kubernetes
short: Deploy on Kubernetes
badge: <i class='ent'></i>
type: guide
order: 216
meta_title: Deploy Label Studio Enterprise on Kubernetes
meta_description: Deploy Label Studio Enterprise on Kubernetes, such as on Amazon Elastic Container Service for Kubernetes, to create machine learning and data science projects in a scalable containerized environment. 
---

Deploy Label Studio Enterprise on a Kubernetes Cluster using Helm 3. You can use this Helm chart to set up Label Studio Enterprise for deployment onto a Kubernetes cluster and install, upgrade, and manage the application. 

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS. See the Amazon tutorial on how to [Deploy a Kubernetes Application with Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/getting-started/hands-on/deploy-kubernetes-app-amazon-eks/) for more about deploying an app on Amazon EKS.

<div class="enterprise"><p>
To install Label Studio Community Edition, see <a href="install.html">Install and Upgrade Label Studio</a>. This page is specific to the Enterprise version of Label Studio.
</p></div>

## Install Label Studio Enterprise on Kubernetes

If you want to install Label Studio Enterprise on Kubernetes and you have unrestricted access to the internet from your K8s cluster, follow these steps. 

1. Verify that you meet the [Required software prerequisites](#Required-software-prerequisites) and review the [capacity planning](#Capacity-planning) guidance.
2. [Prepare the Kubernetes cluster](#Prepare-the-Kubernetes-cluster).
3. [Add the Helm chart repository to your Kubernetes cluster](#Add-the-Helm-chart-repository-to-your-Kubernetes-cluster).
4. [Configure Kubernetes secrets](#Configure-Kubernetes-secrets)
5. [Configure a values.yaml file for your Label Studio Enterprise deployment](#Configure-values-yaml).
6. (Optional) [Set up SSL authentication for PostgreSQL](#Set-up-SSL-authentication-for-PostgreSQL)
7. [Use Helm to install Label Studio Enterprise on your Kubernetes cluster](#Use-Helm-to-install-Label-Studio-Enterprise-on-your-Kubernetes-cluster).

If you use a proxy to access the internet from your Kubernetes cluster, or it is airgapped from the internet, see how to [Install Label Studio Enterprise without public internet access](install_enterprise_airgapped.html).

### Required software prerequisites

- Kubernetes and kubectl version 1.17 or higher
- Helm version 3.6.3 or higher
- Redis version 6.0.5 or higher
- PostgreSQL version 11.9 or higher

This chart has been tested and confirmed to work with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/docs/). See [Set up an ingress controller for Label Studio Enterprise Kubernetes deployments](ingress_config.html) for more on ingress settings with Label Studio Enterprise. 

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS. If you're using Amazon Elastic Kubernetes Service (EKS), see [Install Label Studio Enterprise on Amazon Elastic Kubernetes Service (EKS)](install_enterprise_aws_eks.html). 

### Capacity planning

To plan the capacity of your Kubernetes cluster, refer to these guidelines. 

Label Studio Enterprise has the following default configurations for resource requests, resource limits, and replica counts:
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

rqworker:
  queues:
    high:
      replicas: 1
    low:
      replicas: 1
    default:
      replicas: 1
    critical:
      replicas: 1
    all:
      replicas: 1
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 500m
```

Before you make changes to these values, familiarize yourself with the [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) guidelines in the Kubernetes documentation. 

If you choose to make changes to these default settings, consider the following:

| For this case                               | Adjust this                                                                                                                                       |
|---------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| More than 2 concurrent annotators           | Adjust the requests and limits for `resources` in the `app` pod                                                                                   |
| Increase fault tolerance                    | Increase the number of replicas of both `app` and `rqworker` services                                                                             |
| Production deployment (replicas)            | Replicas equivalent or greater than the number of availability zones in your Kubernetes cluster                                                   | 
| Production deployment (requests and limits) | Refer to the example Helm chart in [Configure the Helm chart for Label Studio Enterprise](#Configure-the-Helm-chart-for-Label-Studio-Enterprise)  |

### Prepare the Kubernetes cluster

Before installing Label Studio Enterprise, prepare the Kubernetes cluster with [kubectl](https://kubernetes.io/docs/reference/kubectl/). 

Install Label Studio Enterprise and set up a PostgreSQL and Redis databases to store relevant Label Studio Enterprise configurations and annotations using the Helm chart. You must configure specific values for your deployment in a YAML file that you specify when installing using Helm.

### Add the Helm chart repository to your Kubernetes cluster
Add the Helm chart repository to your Kubernetes cluster to easily install and update Label Studio Enterprise.

1. From the command line:
   ```shell
   helm repo add heartex https://charts.heartex.com/
   helm repo update heartex
   ```
2. If you want, check for available versions:
   ```shell
   helm search repo heartex/label-studio
   ```

### Configure Kubernetes secrets

1. Ensure that you have license key and Docker Hub credentials or request them from Heartex Team.
2. Create a key to pull the latest Label Studio Enterprise image from the Docker registry. From the command line of your cluster, run the following:
    ```shell
    kubectl create secret docker-registry heartex-pull-key \
        --docker-server=https://index.docker.io/v2/ \
        --docker-username=heartexlabs \
        --docker-password=<CUSTOMER_PASSWORD>
    ```
3. Create the Label Studio Enterprise license as a Kubernetes secret. You can specify it as a file or as a specific URL.
   From the command line, specify the license as a file:
   ```shell
   kubectl create secret generic lse-license --from-file=license=path/to/lic
   ```
   Or from the command line, specify the license as a URL:
   ```shell
   kubectl create secret generic lse-license --from-literal=license=https://lic.heartex.ai/db/<CUSTOMER_LICENSE_ID>
   ```

### Configure values.yaml 

You must configure a `values.yaml` file for your Label Studio Enterprise deployment. The following file contains default values for a minimal installation of Label Studio Enterprise. This chart has been tested and confirmed to work with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/docs/).

Example `values.yaml` file for a minimal installation of Label Studio Enterprise:
```yaml
global:
  image:
    repository: heartexlabs/label-studio-enterprise
    tag: ""
  
  imagePullSecrets:
    # Defined with earlier kubectl command
    - name: heartex-pull-key

  pgConfig:
    # PostgreSql instance hostname
    host: "postgresql"
    # PostgreSql database name
    dbName: "my-database"
    # PostgreSql username
    userName: "postgres"
    # PostgreSql password secret coordinates within Kubernetes secrets 
    password:
      secretName: "postgresql"
      secretKey: "postgresql-password"

  redisConfig:
    # Redis connection string
    host: redis://host:port/db

  # extraEnvironmentVars is a list of extra environment variables to set in the deployment, empty by default
  extraEnvironmentVars: {}
  # extraEnvironmentSecrets is a list of extra environment secrets to set in the deployment, empty by default
  extraEnvironmentSecrets: {}

enterprise:
   enabled: true
   # This value refers to the Kubernetes secret that you 
   # created that contains your enterprise license.
   enterpriseLicense:
      secretName: "lse-license"
      secretKey: "license"

app:
  # High Availability (HA) mode: adjust according to your resources
  replicas: 1
  # Ingress config for Label Studio
  ingress:
    enabled: true
    host: studio.yourdomain.com
    # You might need to set path to '/*' in order to use this with ALB ingress controllers.
    path: /
    # Annotations required for your ingress controller, empty by default 
    annotations: {}
# if you have cert-manager, uncomment the next section
#    tls:
#      - secretName: ssl-cert-studio.yourdomain.com
#        hosts:
#          - studio.yourdomain.com

# default compute resources run label studio enterprise for a basic install. adjust according to your business needs
  resources:
    requests:
      memory: 1024Mi
      cpu: 1000m
    limits:
      memory: 6144Mi
      cpu: 4000m

rqworker:
   # HA mode: adjust according to your business needs/resources
   queues:
      high:
         replicas: 2
      low:
         replicas: 2
      default:
         replicas: 2
      critical:
         replicas: 2
      all:
         replicas: 2

postgresql:
  enabled: false

redis:
  enabled: false
```

Adjust the included defaults to reflect your environment and copy these into a new file and save it as `lse-values.yaml`.

> For more complex configurations, you can create your own file based on the [list of all available Helm values](helm_values.html).

## Set up TLS for PostgreSQL
To configure Label Studio Enterprise to use TLS for end-client connections with PostgreSQL, do the following:

1. Enable TLS for your PostgreSQL instance and save Root TLS certificate, client certificate and its key for the next steps.
2. Create a Kubernetes secret with your certificates, replacing `<PATH_TO_CA>`, `<PATH_TO_CLIENT_CRT>` and `<PATH_TO_CLIENT_KEY>` with paths to your certificates:

```shell
kubectl create secret generic <YOUR_SECRET_NAME> --from-file=ca.crt=<PATH_TO_CA> --from-file=client.crt=<PATH_TO_CLIENT_CRT> --from-file=client.key=<PATH_TO_CLIENT_KEY>
```
3. Update your `lse-values.yaml` file with your newly-created Kubernetes secret:

> If `POSTGRE_SSL_MODE: verify-ca`, the server is verified by checking the certificate chain up to the root certificate stored on the client. If `POSTGRE_SSL_MODE: verify-full`, the server host name will be verified to make sure it matches the name stored in the server certificate. The SSL connection will fail if the server certificate cannot be verified. `verify-full` is recommended in most security-sensitive environments.

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

4. Install or upgrade Label Studio Enterprise using Helm.

## Set up TLS for Redis
To configure Label Studio Enterprise to use TLS for end-client connections with Redis, do the following:

1. Enable TLS for your Redis instance and save Root TLS certificate, client certificate and its key for the next steps.
2. Create a Kubernetes secret with your certificates, replacing `<PATH_TO_CA>`, `<PATH_TO_CLIENT_CRT>` and `<PATH_TO_CLIENT_KEY>` with paths to your certificates:

```shell
kubectl create secret generic <YOUR_SECRET_NAME> --from-file=ca.crt=<PATH_TO_CA> --from-file=client.crt=<PATH_TO_CLIENT_CRT> --from-file=client.key=<PATH_TO_CLIENT_KEY>
```
3. Update your `lse-values.yaml` file with your newly-created Kubernetes secret:

> In the case if you're using self signed certificates that host cannot verify you have to set `redisSslCertReqs` to `None`

```yaml
global:
  redisConfig:
    ssl:
      redisSslCertReqs: "required"
      redisSslSecretName: "<YOUR_SECRET_NAME>"
      redisSslCaCertsSecretKey: "ca.crt"
      redisSslCertFileSecretKey: "client.crt"
      redisSslKeyFileSecretKey: "client.key"
```

4. Install or upgrade Label Studio Enterprise using Helm.

### Use Helm to install Label Studio Enterprise on your Kubernetes cluster

Use Helm to install Label Studio Enterprise on your Kubernetes cluster. Provide your custom resource definitions YAML file. Specify any environment variables that you need to set for your Label Studio Enterprise installation using the `--set` argument with the `helm install` command.

From the command line, run the following:
```shell
helm install lse heartex/label-studio -f lse-values.yaml
```

After installing, check the status of the Kubernetes pod creation:
```shell
kubectl get pods
```

## Restart Label Studio Enterprise using Helm

Restart your Helm release by doing the following from the command line:

1. Identify the <RELEASE_NAME> of the latest Label Studio Enterprise release:
```shell
helm list
```
2. Restart the rqworker for Label Studio Enterprise:
```shell
kubectl rollout restart deployment/<RELEASE_NAME>-ls-rqworker
```
3. Restart the Label Studio Enterprise app:
```shell
kubectl rollout restart deployment/<RELEASE_NAME>-ls-app
```

## Upgrade Label Studio using Helm
To upgrade Label Studio Enterprise using Helm, do the following.

1. Determine the latest tag version of Label Studio Enterprise and add/replace the following in your `lse-values.yml` file: 
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
   helm upgrade lse heartex/label-studio -f lse-values.yaml
   ```
   If you want, you can specify a version from the command line:
   ```shell
   helm upgrade lse heartex/label-studio -f lse-values.yaml --set global.image.tag=20210914.154442-d2d1935
   ```
   This command overrides the tag value stored in `lse-values.yaml`. You must update the tag value when you upgrade or redeploy your instance to avoid version downgrades.


## Uninstall Label Studio using Helm

To uninstall Label Studio Enterprise using Helm, delete the configuration.

From the command line, run the following:
```shell
helm delete lse
```