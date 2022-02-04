---
title: Deploy Label Studio Enterprise on Kubernetes
badge: <i class='ent'></i>
type: guide
order: 203
meta_title: Deploy Label Studio Enterprise on Kubernetes
meta_description: Deploy Label Studio Enterprise on Kubernetes, such as on Amazon Elastic Container Service for Kubernetes, to create machine learning and data science projects in a scalable containerized environment. 
---

Deploy Label Studio Enterprise on a Kubernetes Cluster using Helm 3. You can use this Helm chart to set up Label Studio Enterprise for deployment onto a Kubernetes cluster and install, upgrade, and manage the application. 

<div class="enterprise"><p>
To install Label Studio Community Edition, see <a href="install.html">Install and Upgrade Label Studio</a>. This page is specific to the Enterprise version of Label Studio.
</p></div>

## Install Label Studio Enterprise on Kubernetes

If you want to install Label Studio Enterprise on Kubernetes and you have unrestricted access to the internet from your K8s cluster, follow these steps. 

1. Verify that you meet the [Required software prerequisites](#Required-software-prerequisites) and review the [capacity planning](#Capacity-planning) guidance.
2. [Prepare the Kubernetes cluster](#Prepare-the-Kubernetes-cluster).
3. [Add the Helm chart repository to your Kubernetes cluster](#Add-the-Helm-chart-repository-to-your-Kubernetes-cluster).
4. [Configure the Helm chart for Label Studio Enterprise](#Configure-the-Helm-chart-for-Label-Studio-Enterprise).
5. [Use Helm to install Label Studio Enterprise on your Kubernetes cluster](#Use-Helm-to-install-Label-Studio-Enterprise-on-your-Kubernetes-cluster).

If you use a proxy to access the internet from your Kubernetes cluster, or it is airgapped from the internet, see how to [Install Label Studio Enterprise without public internet access](#Install-Label-Studio-Enterprise-without-public-internet-access).

### Required software prerequisites

- Kubernetes and kubectl version 1.17 or higher
- Helm version 3.6.3 or higher
- Redis version 6.0.5 or higher
- PostgreSQL version 11.9 or higher

This chart has been tested and confirmed to work with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/docs/).

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS. See the Amazon tutorial on how to [Deploy a Kubernetes Application with Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/getting-started/hands-on/deploy-kubernetes-app-amazon-eks/) for more about deploying an app on Amazon EKS.

### Capacity planning

To plan the capacity of your Kubernetes cluster, refer to these guidelines. 

Label Studio Enterprise has the following default configurations for resource requests, resource limits, and replica counts:
```yaml
app:
  replicas: 1
  resources:
    requests:
      memory: 384Mi
      cpu: 250m
    limits:
      memory: 1024Mi
      cpu: 750m

rqworker:
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

1. Create a key to pull the latest Label Studio Enterprise image from the Docker registry. From the command line, run the following:
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

### Add the Helm chart repository to your Kubernetes cluster
Add the Helm chart repository to your Kubernetes cluster. 

1. From the command line, replace `<USERNAME>` and `<PASSWORD>` with the credentials provided by your account manager:
   ```shell
   helm repo add heartex https://charts.heartex.com/ --username <USERNAME> --password <PASSWORD>
   helm repo update heartex
   ```
2. If you want, check for available versions:
   ```shell
   helm search repo heartex/label-studio-enterprise
   ```

### Configure the Helm chart for Label Studio Enterprise

Install Label Studio Enterprise and set up a PostgreSQL or Redis database to store relevant Label Studio Enterprise configurations and annotations using the Helm chart. You must configure specific values for your deployment in a YAML file that you specify when installing using Helm.


A minimal installation of LSE requires the following values:

```yaml
global:
  imagePullSecrets:
    # Defined with earlier kubectl command
    - name: heartex-pull-key

# Optional: override docker image
#  image:
#    tag: ""
  
  # [Enterprise Only] This value refers to a Kubernetes secret that you 
  # created that contains your enterprise license.
  enterpriseLicense:
    secretName: "lse-license"
    secretKey: "license"
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
  # extraEnvironmentSecrets is a list of extra environment variables to set in the deplyoment, empty by default
  extraEnvironmentSecrets: {}

  # Persistence is turned off by default.
  # See more in the [Set up persistent storage](https://labelstud.io/guide/persistent_storage.html)
  persistence:
    enabled: false
  
app:
  # High Availability (HA) mode: adjust according to your resources
  replicas: 1
  # Ingress config for Label Studio
  ingress:
    host: studio.yourdomain.com
    # You may need to set path to '/*' in order to use this with ALB ingress controllers.
    path: /
    # Annotations required for your ingress controller, empty by default 
    annotations: {}
# if you have cert-manager, uncomment the next section
#    tls:
#      - secretName: ssl-cert-studio.yourdomain.com
#        hosts:
#          - studio.yourdomain.com

# adjust according to your business needs
  resources:
    requests:
      memory: 1024Mi
      cpu: 1000m
    limits:
      memory: 6144Mi
      cpu: 4000m

rqworker:
   # HA mode: adjust according to your resources
   replicas: 2

minio:
  enabled: false
```

Adjust the included defaults to reflect your environment and copy these into a new file and save it as `lse-values.yaml`. 


## Setting up TLS for PostgreSQL
To configure Label Studio Enterprise to use TLS for end-client connections with PostgreSQL, do the following.

1. Enable TLS for your PostgreSQL instance and save Root TLS certificate, client certificate and its key for the next steps.
2. Create a Kubernetes secret with your certificates, replacing `<PATH_TO_CA>`, `<PATH_TO_CLIENT_CRT>` and `<PATH_TO_CLIENT_KEY>` with paths to your certificates:

```shell
kubectl create secret generic <YOUR_SECRET_NAME> --from-file=ca.crt=<PATH_TO_CA> --from-file=client.crt=<PATH_TO_CLIENT_CRT> --from-file=client.key=<PATH_TO_CLIENT_KEY>
```
3. Update your `lse-values.yaml` file with your newly-created Kubernetes secret:

> If `POSTGRE_SSL_MODE: verify-ca`, the server is verified by checking the certificate chain up to the root certificate stored on the client. If `POSTGRE_SSL_MODE: verify-full`, the server host name will be verified to make sure it matches the name stored in the server certificate. The SSL connection will fail if the server certificate cannot be verified. `verify-full` is recommended in most security-sensitive environments.

```yaml
global:
  extraEnvironmentVars:
     POSTGRE_SSL_MODE: verify-full
     POSTGRE_SSLROOTCERT: /opt/heartex/secrets/pg_certs/ca.crt
     POSTGRE_SSLCERT: /opt/heartex/secrets/pg_certs/client.crt
     POSTGRE_SSLKEY: /opt/heartex/secrets/pg_certs/client.key

app:
  extraVolumeMounts:
    - name: pg-ssl-certs
      mountPath: /opt/heartex/secrets/pg_certs

  extraVolumes:
    - name: pg-ssl-certs
      secret:
        secretName: <YOUR_SECRET_NAME>
        defaultMode: 0640

rqworker:
  extraVolumeMounts:
    - name: pg-ssl-certs
      mountPath: /opt/heartex/secrets/pg_certs

  extraVolumes:
    - name: pg-ssl-certs
      secret:
        secretName: <YOUR_SECRET_NAME>
        defaultMode: 0640
```

4. Install or upgrade Label Studio Enterprise using Helm.


### Use Helm to install Label Studio Enterprise on your Kubernetes cluster

Use Helm to install Label Studio Enterprise on your Kubernetes cluster. Provide your custom resource definitions YAML file. Specify any environment variables that you need to set for your Label Studio Enterprise installation using the `--set` argument with the `helm install` command.

From the command line, run the following:
```shell
helm install lse heartex/label-studio-enterprise -f lse-values.yaml
```

After installing, check the status of the Kubernetes pod creation:
```shell
kubectl get pods
```

## Install Label Studio Enterprise without public internet access

If you need to install Label Studio Enterprise on a server that blocks access to the internet using a proxy, or an airgapped server that does not allow outgoing connections to the internet, follow these steps:

- If you access the internet from your server using an HTTPS proxy, see [Install behind an HTTPS proxy](#Install-behind-an-HTTPS-proxy).
- If you do not have access to the internet from your server, or use a different proxy, see [Install without internet access or HTTPS proxy](#Install-without-internet-access-or-HTTPS-proxy).

### Install behind an HTTPS proxy
If your organization uses an HTTPS proxy to manage access to the internet, do the following.
> If you're using a SOCKS proxy, Helm 3 does not support SOCKS proxies. See [Install without internet access or HTTPS proxy](#Install-without-internet-access-or-HTTPS-proxy).

1. Work with your network security team to whitelist `https://charts.heartex.com` so that you can access the Helm charts for deploymnet.
2. On the Label Studio Enterprise server, set an environment variable with the HTTPS proxy address:
```shell
export HTTPS_PROXY=<your_proxy>
```
3. [Use Helm to install Label Studio Enterprise on your Kubernetes cluster](#Use-Helm-to-install-Label-Studio-Enterprise-on-your-Kubernetes-cluster).

### Install without internet access or HTTPS proxy

If you can't access the internet using a proxy supported by Helm or at all, follow these steps to download the Helm charts necessary to deploy Label Studio Enterprise on an airgapped Kubernetes cluster. 

> You need the Label Studio Enterprise credentials provided to you by your account manager to download the Helm charts.

1. Download the latest version of Label Studio Enterprise. From the command line, run the following, replacing `<USERNAME>` and `<PASSWORD>` with the credentials provided to you by your account manager:
   ```shell
   helm repo add heartex https://charts.heartex.com/ --username <USERNAME> --password <PASSWORD>
   helm repo update heartex
   helm pull heartex/label-studio-enterprise
   ```
2. Transfer the downloaded `tar.gz` archive to the host that has `kubectl` and `helm` installed.
3. Expand the `tar.gz` archive.
4. [Install Label Studio Enterprise](#Use-Helm-to-install-Label-Studio-Enterprise-on-your-Kubernetes-cluster), updating the path in the `helm` commands to reference the relative path of the folder where you expanded Label Studio Enterprise. For example, if you expanded the archive file in the current directory, run the following:
```shell
helm install lse ./label-studio-enterprise -f lse-values.yaml
```

## Restart Label Studio Enterprise using Helm

Restart your Helm release by doing the following from the command line:

1. Identify the <RELEASE_NAME> of the latest Label Studio Enterprise release:
```shell
helm list
```
2. Restart the rqworker for Label Studio Enterprise:
```shell
kubectl rollout restart deployment/<RELEASE_NAME>-lse-rqworker
```
3. Restart the Label Studio Enterprise app:
```shell
kubectl rollout restart deployment/<RELEASE_NAME>-lse-app
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
   helm upgrade lse heartex/label-studio-enterprise -f lse-values.yaml
   ```
   If you want, you can specify a version from the command line:
   ```shell
   helm upgrade lse heartex/label-studio-enterprise -f lse-values.yaml --set global.image.tag=20210914.154442-d2d1935
   ```
   This command overrides the tag value stored in `lse-values.yaml`. You must update the tag value when you upgrade or redeploy your instance to avoid version downgrades.


## Uninstall Label Studio using Helm

To uninstall Label Studio Enterprise using Helm, delete the configuration.

From the command line, run the following:
```shell
helm delete lse
```