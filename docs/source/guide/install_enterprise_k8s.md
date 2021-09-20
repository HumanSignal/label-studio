---
title: Deploy Label Studio Enterprise on Kubernetes
badge: <i class='ent'></i>
type: guide
order: 203
meta_title: Deploy Label Studio Enterprise on Kubernetes
meta_description: Deploy Label Studio Enterprise on Kubernetes, such as on Amazon Elastic Container Service for Kubernetes, to create machine learning and data science projects in a scalable containerized environment. 
---

Deploy Label Studio Enterprise on a Kubernetes Cluster using Helm 3. You can use this Helm chart to set up Label Studio Enterprise for deployment onto a Kubernetes cluster and install, upgrade, and manage the application. 

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

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
```

Adjust the included defaults to reflect your environment and copy these into a new file and save it as `lse-values.yaml`. 


<br/>
{% details <b>Click to expand the full list of configurable options</b> %}

If you have a more complex environment, you can customize your own YAML file of values to pass to Label Studio Enterprise using this example. 

{% codeblock lang:yaml %}

# Default values for Label Studio Enterprise.
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.

# https://labelstud.io/guide/install_enterprise.html#Start-using-Docker-Compose

global:
  # Image pull secret to use for registry authentication.
  # Alternatively, you can specify the value as an array of strings.
  imagePullSecrets: []

  image:
    repository: heartexlabs/label-studio-enterprise
    pullPolicy: IfNotPresent
    tag: ""

  djangoConfig:
    db: "default"
    settings_module: "htx.settings.label_studio"

  # [Enterprise Only] This value refers to a Kubernetes secret that you have
  # created that contains your enterprise license.
  enterpriseLicense:
    # The name of the Kubernetes secret that holds the enterprise license. The
    # secret must be in the same namespace that Label Studio Enterprise is installed into.
    secretName: ""
    # The key within the Kubernetes secret that holds the enterprise license.
    secretKey: "license"

  pgConfig:
    host: ""
    port: 5432
    dbName: ""
    userName: ""
    password:
      secretName: ""
      secretKey: ""

  # Redis location, for example redis://[:password]@localhost:6379/1
  redisConfig:
    host: ""
    password:
      secretName: ""
      secretKey: ""

  extraEnvironmentVars: { }
  extraEnvironmentSecrets: { }

app:
  enabled: true

  NameOverride: ""
  FullnameOverride: ""

  resources:
    requests:
      memory: 384Mi
      cpu: 250m
    limits:
      memory: 1024Mi
      cpu: 750m

  logLevel: "INFO"

  debug: ""

  # extraEnvironmentVars is a list of extra environment variables to set in the
  # app deployment.
  extraEnvironmentVars: { }
  # KUBERNETES_SERVICE_HOST: kubernetes.default.svc

  # extraEnvironmentSecrets is a list of extra environment variables to set in the
  # app deployment.
  extraEnvironmentSecrets: { }
  # MYSQL_PASSWORD:
  #   secretName: mysql_secret
  #   secretKey: password

  # nodeSelector labels for pod assignment, formatted as a multi-line string or YAML map.
  # ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#nodeselector
  # Example:
  # nodeSelector:
  #   beta.kubernetes.io/arch: amd64
  nodeSelector: { }

  # Extra k8s annotations to attach to the rqworker pods
  # This can either be YAML or a YAML-formatted multi-line templated string map
  # of the annotations to apply to the rqworker pods
  annotations: { }

  # Extra k8s labels to attach to Label Studio Enterprise.
  # Provide a YAML map of k8s labels.
  extraLabels: { }

  affinity: { }

  # Toleration Settings for rqworker pods
  # Provide either a multi-line string or YAML matching the Toleration array
  # in a PodSpec.
  tolerations: []

  # Used to define custom readinessProbe settings
  readinessProbe:
    enabled: true
    path: /version
    # When a probe fails, Kubernetes will try failureThreshold times before giving up
    failureThreshold: 2
    # Number of seconds after the container has started before probe initiates
    initialDelaySeconds: 35
    # How often (in seconds) to perform the probe
    periodSeconds: 5
    # Minimum consecutive successes for the probe to be considered successful after having failed
    successThreshold: 1
    # Number of seconds after which the probe times out.
    timeoutSeconds: 3
  # Used to enable a livenessProbe for the pods
  livenessProbe:
    enabled: true
    path: "/health"
    # When a probe fails, Kubernetes will try failureThreshold times before giving up
    failureThreshold: 2
    # Number of seconds after the container has started before probe initiates
    initialDelaySeconds: 60
    # How often (in seconds) to perform the probe
    periodSeconds: 5
    # Minimum consecutive successes for the probe to be considered successful after having failed
    successThreshold: 1
    # Number of seconds after which the probe times out.
    timeoutSeconds: 3

  service:
    enabled: true
    type: ClusterIP
    port: 80
    targetPort: 8085
    portName: service

  ingress:
    enabled: true
    # For Kubernetes >= 1.18 you should specify the ingress-controller using the field ingressClassName
    # See https://kubernetes.io/blog/2020/04/02/improvements-to-the-ingress-api-in-kubernetes-1.18/#specifying-the-class-of-an-ingress
    className: ""
    annotations: { }
    # kubernetes.io/ingress.class: nginx # deprecated
    # kubernetes.io/tls-acme: "true"
    host: app.heartex.local
    ## Extra paths to prepend to the host configuration. This is useful when working with annotation based services.
    extraPaths: []
    # - path: /*
    #   backend:
    #     serviceName: ssl-redirect
    #     servicePort: use-annotation
    tls: [ ]
    #  - secretName: chart-example-tls
    #    hosts:
    #      - app.heartex.local

  # Definition of the serviceAccount used to run Label Studio Enterprise
  serviceAccount:
    # Specifies whether to create a service account
    create: true
    # The name of the service account to use.
    # If not set and create is true, a name is generated using the fullname template
    name: ""
    # Extra k8s annotations for the serviceAccount definition. This can either be
    # YAML or a YAML-formatted multi-line templated string map of the
    # k8s annotations to apply to the serviceAccount.
    annotations: {}

rqworker:
  enabled: true

  NameOverride: ""
  FullnameOverride: ""

  deploymentStrategy:
    type: Recreate

  replicas: 1
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 500m

  logLevel: "INFO"

  debug: ""

  # extraEnvironmentVars is a list of extra environment variables to set in the
  # rqworker deployment.
  extraEnvironmentVars: { }
  # KUBERNETES_SERVICE_HOST: kubernetes.default.svc

  # extraEnvironmentSecrets is a list of extra environment variables to set in the
  # rqworker deployment.
  extraEnvironmentSecrets: { }
  # MYSQL_PASSWORD:
  #   secretName: mysql_secret
  #   secretKey: password

  # nodeSelector labels for pod assignment, formatted as a multi-line string or YAML map.
  # ref: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#nodeselector
  # Example:
  # nodeSelector:
  #   beta.kubernetes.io/arch: amd64
  nodeSelector: { }

  # Extra k8s annotations to attach to the rqworker pods
  # This can either be YAML or a YAML-formatted multi-line templated string map
  # of the k8s annotations to apply to the rqworker pods
  annotations: { }

  # Extra k8s labels to attach to the rqworker
  # This should be a YAML map of the labels to apply to the rqworker
  extraLabels: { }

  affinity: { }

  # Toleration Settings for rqworker pods
  # Provide either a multi-line string or YAML matching the Toleration array
  # in a PodSpec.
  tolerations: []

  # Used to define custom readinessProbe settings
  readinessProbe:
    enabled: false
    path: /version
    # When a probe fails, Kubernetes will try failureThreshold times before giving up
    failureThreshold: 2
    # Number of seconds after the container has started before probe initiates
    initialDelaySeconds: 35
    # How often (in seconds) to perform the probe
    periodSeconds: 5
    # Minimum consecutive successes for the probe to be considered successful after having failed
    successThreshold: 1
    # Number of seconds after which the probe times out.
    timeoutSeconds: 3
  # Used to enable a livenessProbe for the pods
  livenessProbe:
    enabled: false
    path: "/health"
    # When a probe fails, Kubernetes will try failureThreshold times before giving up
    failureThreshold: 2
    # Number of seconds after the container has started before probe initiates
    initialDelaySeconds: 60
    # How often (in seconds) to perform the probe
    periodSeconds: 5
    # Minimum consecutive successes for the probe to be considered successful after having failed
    successThreshold: 1
    # Number of seconds after which the probe times out.
    timeoutSeconds: 3

  # Definition of the serviceAccount used to run rqworker for Label Studio Enterprise
  serviceAccount:
    # Specifies whether to create a service account
    create: true
    # The name of the service account to use.
    # If not set and create is true, a name is generated using the fullname template
    name: ""
    # Extra k8s annotations for the serviceAccount definition. This can either be
    # YAML or a YAML-formatted multi-line templated string map of the
    # annotations to apply to the serviceAccount.
    annotations: { }
    
{% endcodeblock %}
    
{% enddetails %}
<br/>

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

Run `helm upgrade` with your values YAML file provided:
```shell
helm upgrade lse . -f lse-values.yaml
```


## Uninstall Label Studio using Helm

To uninstall Label Studio Enterprise using Helm, delete the configuration.

From the command line, run the following:
```shell
helm delete lse
```