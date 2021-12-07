---
title: Deploy Label Studio Enterprise on Kubernetes
badge: <i class='ent'></i>
type: guide
order: 203
meta_title: Deploy Label Studio Enterprise on Kubernetes
meta_description: Deploy Label Studio Enterprise on Kubernetes, such as on Amazon Elastic Container Service for Kubernetes, to create machine learning and data science projects in a scalable containerized environment. 
---

Deploy Label Studio Enterprise on a Kubernetes Cluster using Helm 3. You can use this Helm chart to set up Label Studio Enterprise for deployment onto a Kubernetes cluster and install, upgrade, and manage the application. 

Your Kubernetes cluster can be self-hosted or installed somewhere such as Amazon EKS. See the Amazon tutorial on how to [Deploy a Kubernetes Application with Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/getting-started/hands-on/deploy-kubernetes-app-amazon-eks/) for more about deploying an app on Amazon EKS.

## Configure a Helm chart for Label Studio Enterprise

Install Label Studio Enterprise and set up a PostgreSQL or Redis database to store relevant Label Studio Enterprise configurations and annotations using the Helm chart. You must configure specific values for your deployment in a YAML file that you specify when installing using Helm.

### Add the Helm chart repository to your Kubernetes cluster
Add the Helm chart repository to your Kubernetes cluster to easily install and update Label Studio Enterprise.

1. From the command line, replace `<USERNAME>` and `<PASSWORD>` with the credentials provided by your account manager:
   ```shell
   helm repo add heartex https://charts.heartex.com/ --username <USERNAME> --password <PASSWORD>
   helm repo update heartex
   ```
2. If you want, check for available versions:
   ```shell
   helm search repo heartex/label-studio-enterprise
   ```

### Configure values.yaml 

You must configure a values.yaml file for your Label Studio Enterprise deployment. The following file contains default values for a minimal installation of Label Studio Enterprise.

For more complex configurations, create your own file based on the [list of all available Helm values]() and the examples in [this directory in the Label Studio repository]().

This chart has been tested and confirmed to work with the [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/) and [cert-manager](https://cert-manager.io/docs/).

Example values.yaml file for a minimal installation of Label Studio Enterprise:
```yaml
global:
  imagePullSecrets:
    # Defined with earlier kubectl command
    - name: heartex-pull-key
  
  # This value refers to the Kubernetes secret that you 
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
  # extraEnvironmentSecrets is a list of extra environment secrets to set in the deployment, empty by default
  extraEnvironmentSecrets: {}
  
app:
  # High Availability (HA) mode: adjust according to your resources
  replicas: 1
  # Ingress config for Label Studio
  ingress:
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
   # HA mode: adjust according to your resources
   replicas: 2
```

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