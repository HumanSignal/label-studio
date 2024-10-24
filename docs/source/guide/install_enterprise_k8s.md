---
title: Deploy Label Studio Enterprise on Kubernetes
short: Install using Kubernetes
tier: enterprise
type: guide
order: 0
order_enterprise: 69
meta_title: Deploy Label Studio Enterprise on Kubernetes
meta_description: Deploy Label Studio Enterprise on Kubernetes, such as on Amazon Elastic Container Service for Kubernetes, to create machine learning and data science projects in a scalable containerized environment. 
section: "Install & Setup"
parent_enterprise: "install_enterprise"

---

Deploy Label Studio Enterprise on a Kubernetes Cluster using Helm 3. You can use this Helm chart to set up Label Studio Enterprise for deployment onto a Kubernetes cluster and install, upgrade, and manage the application. 

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS. See the Amazon tutorial on how to [Deploy a Kubernetes Application with Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/getting-started/hands-on/deploy-kubernetes-app-amazon-eks/) for more about deploying an app on Amazon EKS.

<div class="enterprise-only">

!!! warning
    To install Label Studio Community Edition, see <a href="https://labelstud.io/guide/install_k8s.html">Deploy Label Studio on Kubernetes</a>. This page is specific to the Enterprise version of Label Studio.

</div>

This high-level architecture diagram that outlines the main components of a Label Studio Enterprise deployment.

<img src="/images/LSE_k8s_scheme.png"/>

!!! warning
    Label Studio Enterprise 2.2.9 decommissioned MinIO as a service.

Label Studio Enterprise runs on Python and uses rqworkers to perform additional tasks. Metadata and annotations are stored in a bundled version of PostgreSQL that functions as persistent storage. If you host Label Studio Enterprise in the cloud, use [persistent storage in the cloud](persistent_storage.html) instead of MinIO.

## Install Label Studio Enterprise on Kubernetes

If you want to install Label Studio Enterprise on Kubernetes and you have unrestricted access to the internet from your K8s cluster, follow these steps. 

1. Verify that you meet the [Required software prerequisites](#Required-software-prerequisites) and review the [capacity planning](#Capacity-planning) guidance.
2. [Prepare the Kubernetes cluster](#Prepare-the-Kubernetes-cluster).
3. [Add the Helm chart repository](#Add-the-Helm-chart-repository).
4. [Configure Kubernetes secrets](#Configure-Kubernetes-secrets)
5. (Optional) Set up [persistent storage](persistent_storage.html). 
6. (Optional) Configure [ingress](ingress_config.html).
7. [Configure a values.yaml file](#Configure-values-yaml).
8. (Optional) [Set up TLS for PostgreSQL](#Optional-set-up-TLS-for-PostgreSQL)
9. (Optional) [Set up TLS for Redis](#Optional-set-up-TLS-for-Redis)
10. [Use Helm to install Label Studio Enterprise on your Kubernetes cluster](#Use-Helm-to-install-Label-Studio-Enterprise-on-your-Kubernetes-cluster).

If you use a proxy to access the internet from your Kubernetes cluster, or it is airgapped from the internet, see how to [Install Label Studio Enterprise without public internet access](install_k8s_airgapped.html).

### Required software prerequisites

- Kubernetes and kubectl version 1.17 or higher
- Helm version 3.6.3 or higher
- Redis version 6.0.5 or higher
- PostgreSQL version 11.9 or higher

This chart has been tested and confirmed to work with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/docs/). See [Set up an ingress controller for Label Studio Kubernetes deployments](ingress_config.html) for more on ingress settings with Label Studio. 

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS. 

### Capacity planning

To plan the capacity of your Kubernetes cluster, refer to these guidelines. 

Label Studio Enterprise has the following default configurations for resource requests, resource limits, and replica counts:

<div class="enterprise-only">

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
      replicas: 4
    critical:
      replicas: 1
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 1024Mi
      cpu: 1000m
```

</div>

Before you make changes to these values, familiarize yourself with the [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) guidelines in the Kubernetes documentation. 

If you choose to make changes to these default settings, consider the following:

| For this case                               | Adjust this                                                                                                                           |
|---------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| More than 10 concurrent annotators          | Adjust the requests and limits for `resources` in the `app` pod                                                                       |
| Increase fault tolerance                    | Increase the number of replicas of `app` and/or `rqworker` services                                                                   |
| Production deployment (replicas)            | Replicas equivalent or greater than the number of availability zones in your Kubernetes cluster                                       | 

#### RQ worker replicas

The `default` queue is the most extensive queue. It is recommended to use 4 times more replicas for the `default` queue compared to the other queues. The other queues (`critical`, `high`, `low`) can have the same number of replicas. You can start with 1 replica for each of them. 

### Prepare the Kubernetes cluster

Before installing Label Studio, prepare the Kubernetes cluster with [kubectl](https://kubernetes.io/docs/reference/kubectl/). 

Install Label Studio Enterprise and set up a PostgreSQL and Redis databases to store relevant Label Studio Enterprise configurations and annotations using the Helm chart. You must configure specific values for your deployment in a YAML file that you specify when installing using Helm.

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

<div class="enterprise-only">

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
   
</div>

<div class="enterprise-only">

### Configure values.yaml 

You must configure a `values.yaml` file for your Label Studio Enterprise deployment. The following file contains default values for a minimal installation of Label Studio. This chart has been tested and confirmed to work with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/docs/).

Example `values.yaml` file for a minimal installation of Label Studio Enterprise Enterprise:
```yaml
global:
  image:
    repository: heartexlabs/label-studio-enterprise
    tag: REPLACE_ME
  
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

# default compute resources run Label Studio Enterprise for a basic installation. adjust according to your business needs
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

postgresql:
  enabled: false

redis:
  enabled: false
```

Adjust the included defaults to reflect your environment and copy these into a new file and save it as `ls-values.yaml`.


!!! note 
    For more complex configurations, you can create your own file based on the [list of all available Helm values](helm_values.html).

</div>

## Optional: set up TLS for PostgreSQL
To configure Label Studio Enterprise to use TLS for end-client connections with PostgreSQL, do the following:

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

4. Install or upgrade Label Studio Enterprise using Helm.

## Optional: set up TLS for Redis
To configure Label Studio Enterprise to use TLS for end-client connections with Redis, do the following:

1. Enable TLS for your Redis instance and save Root TLS certificate, client certificate and its key for the next steps.
2. Create a Kubernetes secret with your certificates, replacing `<PATH_TO_CA>`, `<PATH_TO_CLIENT_CRT>` and `<PATH_TO_CLIENT_KEY>` with paths to your certificates:

```shell
kubectl create secret generic <YOUR_SECRET_NAME> --from-file=ca.crt=<PATH_TO_CA> --from-file=client.crt=<PATH_TO_CLIENT_CRT> --from-file=client.key=<PATH_TO_CLIENT_KEY>
```
3. Update your `ls-values.yaml` file with your newly-created Kubernetes secret:

!!! note 
    In the case if you are using self-signed certificates that host cannot verify you have to set `redisSslCertReqs` to `None`

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

## Use Helm to install Label Studio Enterprise on your Kubernetes cluster

Use Helm to install Label Studio Enterprise on your Kubernetes cluster. Provide your custom resource definitions YAML file. Specify any environment variables that you need to set for your Label Studio Enterprise installation using the `--set` argument with the `helm install` command.

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

## Restart Label Studio Enterprise using Helm

Restart your Helm release by doing the following from the command line:

1. Identify the &lt;RELEASE_NAME&gt; of the latest Label Studio Enterprise release:
```shell
helm list
```
2. Restart the rqworker for Label Studio:
```shell
kubectl rollout restart deployment/<RELEASE_NAME>-ls-rqworker
```
3. Restart the Label Studio Enterprise app:
```shell
kubectl rollout restart deployment/<RELEASE_NAME>-ls-app
```


## Uninstall Label Studio Enterprise using Helm

To uninstall Label Studio Enterprise using Helm, delete the configuration.

From the command line, run the following:
```shell
helm delete <RELEASE_NAME>
```
