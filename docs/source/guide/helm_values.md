---
title: Available Helm values for Label Studio Enterprise Kubernetes deployments
short: Available Helm values
badge: <i class='ent'></i>
type: guide
order: 220
meta_title: Available Helm values for Label Studio Enterprise Kubernetes deployments
meta_description: For cases when you want to customize your Label Studio Enterprise Kubernetes deployment, review these available Helm values that you can set in your Helm chart.
---

<!-- Fix for long values in table cells -->
<style>
  td:first-child {
    max-width: 350px;
  }
  td:first-child code {
    white-space: normal;
    word-break: break-word;
    margin-left: 0;
    padding-left: 3px;
  }
  td:nth-child(3) {
    white-space: normal;
    word-break: break-word;
    max-width: 130px;
  }
  td:last-child {
    max-width: 150px;
  }
  td:last-child code {
    white-space: normal;
    word-break: break-all;
  }
</style>

Refer to these tables with available Helm chart values for your `lse-values.yaml` file
when configuring your Label Studio Enterprise deployment on Kubernetes. See [Deploy Label Studio Enterprise on Kubernetes](install_enterprise_k8s.html) for more.

## Global parameters
Global parameters for the Helm chart.

| Key                                                                         | Type   | Default Value                       | Description                                                                                         |
|-----------------------------------------------------------------------------|--------|-------------------------------------|-----------------------------------------------------------------------------------------------------|
| `global.imagePullSecrets`                                                   | string | []                                  | Image pull secret to use for registry authentication                                                |
| `global.image.repository`                                                   | string | heartexlabs/label-studio-enterprise | Image repository                                                                                    |
| `global.image.pullPolicy`                                                   | string | IfNotPresent                        | Image pull policy                                                                                   |
| `global.image.tag`                                                          | string | ""                                  | Image tag (immutable tags are recommended)                                                          |
| `global.djangoConfig.db`                                                    | string | default                             | Django default config name                                                                          |
| `global.djangoConfig.settings_module`                                       | string | htx.settings.label_studio           | Django default settings module name                                                                 |
| `global.enterpriseLicense.secretName`                                       | string | ""                                  | Name of an existing secret holding the Label Studio Enterprise license information                  |
| `global.enterpriseLicense.secretKey`                                        | string | license                             | Key of an existing secret holding the enterprise license information                                |
| `global.pgConfig.host`                                                      | string | ""                                  | PostgreSQL hostname                                                                                 |
| `global.pgConfig.port`                                                      | string | 5432                                | PostgreSQL port                                                                                     |
| `global.pgConfig.dbName`                                                    | string | ""                                  | PostgreSQL database name                                                                            |
| `global.pgConfig.userName`                                                  | string | ""                                  | PostgreSQL database user account                                                                    |
| `global.pgConfig.password.secretName`                                       | string | ""                                  | Name of an existing secret holding the password of PostgreSQL database user account                 |
| `global.pgConfig.password.secretKey`                                        | string | ""                                  | Key of an existing secret holding the password of PostgreSQL database user account                  |
| `global.redisConfig.host`                                                   | string | ""                                  | Redis connection string in a format:  `redis://[:password]@localhost:6379/1`                        |
| `global.redisConfig.password.secretName`                                    | string | ""                                  | Name of an existing secret holding the password of Redis database                                   |
| `global.redisConfig.password.secretKey`                                     | string | ""                                  | Key of an existing secret holding the password of Redis database                                    |
| `global.extraEnvironmentVars`                                               | map    | {}                                  | Key/value map of an extra Environment variables, for example, `PYTHONUNBUFFERED: 1`                 |
| `global.extraEnvironmentSecrets`                                            | map    | {}                                  | Key/value map of an extra Secrets                                                                   |
| `global.contextPath`                                                        | string | /                                   | Context path appended for health/readiness checks                                                   |
| `global.persistence.enabled`                                                | string | false                               | Enable persistent storage. See more about setting up [persistent storage](persistent_storage.html). |
| `global.persistence.type`                                                   | string | volume                              | Persistent storage type                                                                             |
| `global.persistence.config.s3.accessKey`                                    | string | ""                                  | Access key to use to access AWS S3                                                                  |
| `global.persistence.config.s3.secretKey`                                    | string | ""                                  | Secret key to use to access AWS S3                                                                  |
| `global.persistence.config.s3.accessKeyExistingSecret`                      | string | ""                                  | Existing Secret name to extract Access key from to access AWS S3                                    |
| `global.persistence.config.s3.accessKeyExistingSecretKey`                   | string | ""                                  | Existing Secret key to extract Access key from to access AWS S3                                     |
| `global.persistence.config.s3.secretKeyExistingSecret`                      | string | ""                                  | Existing Secret name to extract Access secret key from to access AWS S3                             |
| `global.persistence.config.s3.secretKeyExistingSecretKey`                   | string | ""                                  | Existing Secret key to extract Access secret key from to access AWS S3                              |
| `global.persistence.config.s3.region`                                       | string | ""                                  | AWS S3 region                                                                                       |
| `global.persistence.config.s3.bucket`                                       | string | ""                                  | AWS S3 bucket name                                                                                  |
| `global.persistence.config.s3.folder`                                       | string | ""                                  | AWS S3 folder name                                                                                  |
| `global.persistence.config.s3.urlExpirationSecs`                            | string | 86400                               | The number of seconds that a presigned URL is valid for                                             |
| `global.persistence.config.volume.storageClass`                             | string | ""                                  | StorageClass for Persistent Volume                                                                  |
| `global.persistence.config.volume.size`                                     | string | 5Gi                                 | Persistent volume size                                                                              |
| `global.persistence.config.volume.annotations`                              | map    | {}                                  | Persistent volume additional annotations                                                            |
| `global.persistence.config.volume.existingClaim`                            | string | ""                                  | Name of an existing PVC to use                                                                      |
| `global.persistence.config.volume.resourcePolicy`                           | string | ""                                  | PVC resource policy                                                                                 |
| `global.persistence.config.azure.storageAccountName`                        | string | ""                                  | Azure Storage Account Name to use to access Azure Blob Storage                                      |
| `global.persistence.config.azure.storageAccountKey`                         | string | ""                                  | Azure Storage Account Key to use to access Azure Blob Storage                                       |
| `global.persistence.config.azure.storageAccountNameExistingSecret`          | string | ""                                  | Existing Secret name to extract Azure Storage Account Name from to access Azure Blob Storage        |
| `global.persistence.config.azure.storageAccountNameExistingSecretKey`       | string | ""                                  | Existing Secret key to extract Azure Storage Account Name from to use to access Azure Blob Storage  |
| `global.persistence.config.azure.storageAccountKeyExistingSecret`           | string | ""                                  | Existing Secret name to extract Azure Storage Account Key from to access Azure Blob Storage         |
| `global.persistence.config.azure.storageAccountKeyExistingSecretKey`        | string | ""                                  | Existing Secret key to extract Azure Storage Account Key from to use to access Azure Blob Storage   |
| `global.persistence.config.azure.containerName`                             | string | ""                                  | Azure Storage container name                                                                        |
| `global.persistence.config.azure.folder`                                    | string | ""                                  | Azure Storage folder name                                                                           |
| `global.persistence.config.azure.urlExpirationSecs`                         | string | 86400                               | The number of seconds that a presigned URL is valid for                                             |
| `global.persistence.config.gcs.projectID`                                   | string | ""                                  | GCP Project ID to use                                                                               |
| `global.persistence.config.gcs.applicationCredentialsJSON`                  | string | ""                                  | Service Account key to access GCS                                                                   |
| `global.persistence.config.gcs.applicationCredentialsJSONExistingSecret`    | string | ""                                  | Existing Secret name to extract Service Account Key from to access GCS                              |
| `global.persistence.config.gcs.applicationCredentialsJSONExistingSecretKey` | string | ""                                  | Existing Secret key to extract Service Account Key from to access GCS                               |
| `global.persistence.config.gcs.bucket`                                      | string | ""                                  | GCS bucket name                                                                                     |
| `global.persistence.config.gcs.folder`                                      | string | ""                                  | GCS folder name                                                                                     |
| `global.persistence.config.gcs.urlExpirationSecs`                           | string | 86400                               | The number of seconds that a presigned URL is valid for                                             |
| `featureFlags`                                                              | map    | {}                                  | Key/value map of Feature Flags                                                                      |

## App parameters
Parameters specific to the `app` portion of the Label Studio Enterprise deployment.

| Key                                                     | Type    | Default  Value    | Description                                                                                 |
|---------------------------------------------------------|---------|-------------------|---------------------------------------------------------------------------------------------|
| `app.enabled`                                           | string  | true              | Enable app pod                                                                              |
| `app.deploymentStrategy.type`                           | string  | RollingUpdate     | Deployment strategy type                                                                    |
| `app.deploymentStrategy.rollingUpdate.maxSurge`         | string  | 2                 | The maximum number of pods that can be created over the desired number of pods              |
| `app.deploymentStrategy.rollingUpdate.maxUnavailable`   | string  | 0                 | The maximum number of pods that can be unavailable during the update process                |
| `app.replicas`                                          | string  | 1                 | Amount of app pod replicas                                                                  |
| `app.NameOverride`                                      | string  | ""                | String to partially override release template name                                          |
| `app.FullnameOverride`                                  | string  | ""                | String to fully override release template name                                              |
| `app.resources.requests.memory`                         | string  | 384Mi             | The requested memory resources for the App container                                        |
| `app.resources.requests.cpu`                            | string  | 250m              | The requested cpu resources for the App container                                           |
| `app.resources.limits.memory`                           | string  | 1024Mi            | The memory resources limits for the App container                                           |
| `app.resources.limits.cpu`                              | string  | 750m              | The cpu resources limits for the App container                                              |
| `app.logLevel`                                          | string  | INFO              | Application log level                                                                       |
| `app.debug`                                             | string  | ""                | Application DEBUG mode                                                                      |
| `app.extraEnvironmentVars`                              | map     | {}                | A map of extra environment variables to set                                                 |
| `app.extraEnvironmentSecrets`                           | map     | {}                | A map of extra environment secrets to set                                                   |
| `app.nodeSelector`                                      | map     | {}                | labels for pod assignment, formatted as a multi-line string or YAML map                     |
| `app.annotations`                                       | map     | {}                | k8s annotations to attach to the app pods                                                   |
| `app.extraLabels`                                       | map     | {}                | extra k8s labels to attach                                                                  |
| `app.affinity`                                          | map     | {}                | Affinity for pod assignment                                                                 |
| `app.tolerations`                                       | list    | []                | Toleration settings for pod                                                                 |
| `app.readinessProbe.enabled`                            | string  | true              | Enable redinessProbe                                                                        |
| `app.readinessProbe.path`                               | string  | /version          | Path for reasinessProbe                                                                     |
| `app.readinessProbe.failureThreshold`                   | string  | 2                 | When a probe fails, Kubernetes will try failureThreshold times before giving up             |
| `app.readinessProbe.initialDelaySeconds`                | string  | 10                | Number of seconds after the container has started before probe initiates                    |
| `app.readinessProbe.periodSeconds`                      | string  | 10                | How often (in seconds) to perform the probe                                                 |
| `app.readinessProbe.successThreshold`                   | string  | 1                 | Minimum consecutive successes for the probe to be considered successful after having failed |
| `app.readinessProbe.timeoutSeconds`                     | string  | 5                 | Number of seconds after which the probe times out                                           |
| `app.livenessProbe.enabled`                             | string  | true              | Enable livenessProbe                                                                        |
| `app.livenessProbe.path`                                | string  | /health           | Path for livenessProbe                                                                      |
| `app.livenessProbe.failureThreshold`                    | string  | 3                 | When a probe fails, Kubernetes will try failureThreshold times before giving up             |
| `app.livenessProbe.initialDelaySeconds`                 | string  | 60                | Number of seconds after the container has started before probe initiates                    |
| `app.livenessProbe.periodSeconds`                       | string  | 10                | How often (in seconds) to perform the probe                                                 |
| `app.livenessProbe.successThreshold`                    | string  | 1                 | Minimum consecutive successes for the probe to be considered successful after having failed |
| `app.livenessProbe.timeoutSeconds`                      | string  | 5                 | Number of seconds after which the probe times out                                           |
| `app.service.type`                                      | string  | ClusterIP         | k8s service type                                                                            |
| `app.service.port`                                      | string  | 80                | k8s service port                                                                            |
| `app.service.targetPort`                                | string  | 8085              | k8s servuce target port                                                                     |
| `app.service.portName`                                  | string  | service           | k8s service port name                                                                       |
| `app.service.annotations`                               | map     | {}                | Custom annotations for app service                                                          |
| `app.service.sessionAffinity`                           | string  | "None"            | Session Affinity for Kubernetes service, can be "None" or "ClientIP"                        |
| `app.service.sessionAffinityConfig`                     | map     | {}                | Additional settings for the sessionAffinity                                                 |
| `app.ingress.enabled`                                   | string  | true              | Enable ingress                                                                              |
| `app.ingress.className`                                 | string  | ""                | Ingress classname                                                                           |
| `app.ingress.annotations`                               | map     | {}                | Additional ingress annotations                                                              |
| `app.ingress.host`                                      | string  | app.heartex.local | Ingress host                                                                                |
| `app.ingress.path`                                      | string  | /                 | Ingress path                                                                                |
| `app.ingress.extraPaths`                                | list    | []                | Extra paths to prepend to the host configuration                                            |
| `app.ingress.tls`                                       | list    | []                | TLS secrets definition                                                                      |
| `app.serviceAccount.create`                             | string  | true              | Enable the creation of a ServiceAccount for app pod                                         |
| `app.serviceAccount.name`                               | string  | ""                | Name of the created ServiceAccount                                                          |
| `app.serviceAccount.annotations`                        | map     | {}                | Custom annotations for app ServiceAccount                                                   |
| `app.extraVolumes`                                      | list    | []                | Array to add extra volumes                                                                  |
| `app.extraVolumeMounts`                                 | list    | []                | Array to add extra mounts (normally used with extraVolumes)                                 |
| `app.podSecurityContext.enabled`                        | string  | false             | Enable pod Security Context                                                                 |
| `app.containerSecurityContext.enabled`                  | string  | true              | Enable container Security Context                                                           |
| `app.containerSecurityContext.runAsNonRoot`             | string  | true              | Avoid running as root User                                                                  |
| `app.containerSecurityContext.allowPrivilegeEscalation` | string  | false             | Controls whether a process can gain more privileges than its parent process                 |
| `app.topologySpreadConstraints`                         | list    | [ ]               | Topology Spread Constraints for pod assignment                                              |
| `app.dnsPolicy`                                         | string  | ""                | Pod DNS policy                                                                              |
| `app.enableServiceLinks`                                | boolean | false             | Service environment variables                                                               |
| `app.shareProcessNamespace`                             | boolean | false             | Enable shared process namespace in a pod                                                    |
| `app.automountServiceAccountToken`                      | bollean | true              | Automount service account token for the server service account                              |





## Rqworker parameters

Parameters specific to the `rqworkers` service of your Label Studio Enterprise deployment.

| Key                                                          | Type     | Default  | Description                                                                                 |
|--------------------------------------------------------------|----------|----------|---------------------------------------------------------------------------------------------|
| `rqworker.enabled`                                           | string   | true     | Enable rqworker pod                                                                         |
| `rqworker.NameOverride`                                      | string   | ""       | String to partially override release template name                                          |
| `rqworker.FullnameOverride`                                  | string   | ""       | String to fully override release template name                                              |
| `rqworker.deploymentStrategy.type`                           | string   | Recreate | Deployment strategy type                                                                    |
| `rqworker.replicas`                                          | string   | 1        | Amount of rqworker replicas                                                                 |
| `rqworker.resources.requests.memory`                         | string   | 256Mi    | The requested memory resources for the Rqworker container                                   |
| `rqworker.resources.requests.cpu`                            | string   | 100m     | The requested cpu resources for the Rqworker container                                      |
| `rqworker.resources.limits.memory`                           | string   | 512Mi    | The memory resources limits for the Rqworker container                                      |
| `rqworker.resources.limits.cpu`                              | string   | 500m     | The cpu resources limits for the Rqworker container                                         |
| `rqworker.logLevel`                                          | string   | INFO     | Rqworker log level                                                                          |
| `rqworker.debug`                                             | string   | ""       | Rqworker DEBUG mode                                                                         |
| `rqworker.extraEnvironmentVars`                              | map      | {}       | A map of extra environment variables to set                                                 |
| `rqworker.extraEnvironmentSecrets`                           | map      | {}       | A map of extra environment secrets to set                                                   |
| `rqworker.nodeSelector`                                      | map      | {}       | labels for pod assignment, formatted as a multi-line string or YAML map                     |
| `rqworker.annotations`                                       | map      | {}       | k8s annotations to attach to the rqworker pods                                              |
| `rqworker.extraLabels`                                       | map      | {}       | extra k8s labels to attach                                                                  |
| `rqworker.affinity`                                          | map      | {}       | Affinity for pod assignment                                                                 |
| `rqworker.tolerations`                                       | list     | []       | Toleration settings for pod                                                                 |
| `rqworker.readinessProbe.enabled`                            | string   | false    | Enable redinessProbe                                                                        |
| `rqworker.readinessProbe.path`                               | string   | /version | Path for reasinessProbe                                                                     |
| `rqworker.readinessProbe.failureThreshold`                   | string   | 2        | When a probe fails, Kubernetes will try failureThreshold times before giving up             |
| `rqworker.readinessProbe.initialDelaySeconds`                | string   | 35       | Number of seconds after the container has started before probe initiates                    |
| `rqworker.readinessProbe.periodSeconds`                      | string   | 5        | How often (in seconds) to perform the probe                                                 |
| `rqworker.readinessProbe.successThreshold`                   | string   | 1        | Minimum consecutive successes for the probe to be considered successful after having failed |
| `rqworker.readinessProbe.timeoutSeconds`                     | string   | 3        | Number of seconds after which the probe times out                                           |
| `rqworker.livenessProbe.enabled`                             | string   | false    | Enable livenessProbe                                                                        |
| `rqworker.livenessProbe.path`                                | string   | /health  | Path for livenessProbe                                                                      |
| `rqworker.livenessProbe.failureThreshold`                    | string   | 2        | When a probe fails, Kubernetes will try failureThreshold times before giving up             |
| `rqworker.livenessProbe.initialDelaySeconds`                 | string   | 60       | Number of seconds after the container has started before probe initiates                    |
| `rqworker.livenessProbe.periodSeconds`                       | string   | 5        | How often (in seconds) to perform the probe                                                 |
| `rqworker.livenessProbe.successThreshold`                    | string   | 1        | Minimum consecutive successes for the probe to be considered successful after having failed |
| `rqworker.livenessProbe.timeoutSeconds`                      | string   | 3        | Number of seconds after which the probe times out                                           |
| `rqworker.serviceAccount.create`                             | string   | true     | Enable the creation of a ServiceAccount for rqworker pod                                    |
| `rqworker.serviceAccount.name`                               | string   | ""       | Name of the created ServiceAccount                                                          |
| `rqworker.serviceAccount.annotations`                        | map      | {}       | Custom annotations for app ServiceAccount                                                   |
| `rqworker.extraVolumes`                                      | list     | []       | Array to add extra volumes                                                                  |
| `rqworker.extraVolumeMounts`                                 | list     | []       | Array to add extra mounts (normally used with extraVolumes)                                 |
| `rqworker.podSecurityContext.enabled`                        | string   | false    | Enable pod Security Context                                                                 |
| `rqworker.containerSecurityContext.enabled`                  | string   | true     | Enable container Security Context                                                           |
| `rqworker.containerSecurityContext.runAsNonRoot`             | string   | true     | Avoid running as root User                                                                  |
| `rqworker.containerSecurityContext.allowPrivilegeEscalation` | string   | false    | Controls whether a process can gain more privileges than its parent process                 |
| `rqworker.topologySpreadConstraints`                         | list     | [ ]      | Topology Spread Constraints for pod assignment                                              |
| `rqworker.dnsPolicy`                                         | string   | ""       | Pod DNS policy                                                                              |
| `rqworker.enableServiceLinks`                                | boolean  | false    | Service environment variables                                                               |
| `rqworker.shareProcessNamespace`                             | boolean  | false    | Enable shared process namespace in a pod                                                    |
| `rqworker.automountServiceAccountToken`                      | bollean  | true     | Automount service account token for the server service account                              |

## Deprecated parameters

Deprecated parameters no longer in use or supported by Label Studio Enterprise Helm charts. 

| Key                               | Type   | Default Value | Description               |
|-----------------------------------|--------|---------------|---------------------------|
| `minio.enabled`                   | string | true          | Enable minio deployment   |
| `minio.accessKey.password`        | string | minio         | Minio accesskey           |
| `minio.secretKey.password`        | string | minio123      | Minio accessPassword      |
| `minio.resources.requests.cpu`    | string | 250m          | Minio requested resources |
| `minio.resources.requests.memory` | string | 256Mi         | Minio limits resources    |
| `minio.mode`                      | string | standalone    | Minio mode                |
| `minio.persistence.enabled`       | string | false         | Minio enable persistence  |
