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

## Required software prerequisites

- Kubernetes and kubectl version 1.17 or higher
- Helm version 3.6.3 or higher
- Redis version 6.0.5 or higher
- PostgreSQL version 11.9 or higher

This chart has been tested and confirmed to work with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/docs/).

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS. See the Amazon tutorial on how to [Deploy a Kubernetes Application with Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/getting-started/hands-on/deploy-kubernetes-app-amazon-eks/) for more about deploying an app on Amazon EKS.

## Prepare the Kubernetes cluster

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

## Configure the Helm chart for Label Studio Enterprise

Install Label Studio Enterprise and set up a PostgreSQL or Redis database to store relevant Label Studio Enterprise configurations and annotations using the Helm chart. You must configure specific values for your deployment in a YAML file that you specify when installing using Helm.


A minimal installation of LSE requires the following values:

```yaml
global:
  imagePullSecrets:
    # Defined with earlier kubectl command
    - name: heartex-pull-key
  
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
  
# Ingress config for Label Studio
app:
  ingress:
    host: studio.yourdomain.com
# if you have a tls cert, uncomment the next section
#    tls:
#      - secretName: ssl-cert
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
```

Adjust the included defaults to reflect your environment and copy these into a new file and save it as `lse-values.yaml`. 


## Install Label Studio Enterprise using Helm on a Kubernetes cluster

Use Helm to install Label Studio Enterprise on your Kubernetes cluster. Provide your custom reource definitions YAML file. Specify any environment variables that you need to set for your Label Studio Enterprise installation using the `--set` argument with the `helm install` command.

From the command line, run the following:
```shell
helm install lse . -f lse-values.yaml
```

After installing, check the status of the Kubernetes pod creation:
```shell
kubectl get pods
```

## Upgrade Label Studio using Helm
To upgrade Label Studio Enterprise using Helm, do the following.

Determine the latest tag version of Label Studio Enterprise and add the following to your `lse-values.yml` file: 
```yaml
global:
images:
tag: “20210914.154442-d2d1935”
```
After updating the values file, run the following from the command line:
```shell
helm upgrade lse . -f lse-values.yaml
```

As another option, you can run the following from the command line:
```yaml
helm upgrade lse . -f lse-values.yaml --set global.images.tag=20210914.154442-d2d1935
```
This command overrides the tag value stored in `lse-values.yaml`. You must update the tag value when you upgrade or redeploy your instance to avoid version downgrades.

## Uninstall Label Studio using Helm

To uninstall Label Studio Enterprise using Helm, delete the configuration.

From the command line, run the following:
```shell
helm delete lse
```