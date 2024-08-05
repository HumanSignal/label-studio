---
title: Available Helm values for Label Studio Helm Chart
short: Available Helm values
tier: all
type: guide
order: 72
order_enterprise: 72
meta_title: Available Helm values for Label Studio Helm Chart
meta_description: For cases when you want to customize your Label Studio Kubernetes deployment, review these available Helm values that you can set in your Helm chart.
section: "Install & Setup"
parent: "install_k8s"
parent_enterprise: "install_enterprise_k8s"
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

Refer to these tables with available Helm chart values for your `values.yaml` file
when configuring your Label Studio deployment on Kubernetes. See [Deploy Label Studio on Kubernetes](install_k8s.html) for more.

## Global parameters

Global parameters for the Helm chart.

| Parameter                                                                   | Description                                                                                                                         | Default                    |
|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|----------------------------|
| `global.imagePullSecrets`                                                   | Global Docker registry secret names as an array                                                                                     | `[]`                       |
| `global.image.repository`                                                   | Image repository                                                                                                                    | `heartexlabs/label-studio` |
| `global.image.pullPolicy`                                                   | Image pull policy                                                                                                                   | `IfNotPresent`             |
| `global.image.tag`                                                          | Image tag (immutable tags are recommended)                                                                                          | `develop`                  |
| `global.pgConfig.host`                                                      | PostgreSQL hostname                                                                                                                 | `""`                       |
| `global.pgConfig.port`                                                      | PostgreSQL port                                                                                                                     | `5432`                     |
| `global.pgConfig.dbName`                                                    | PostgreSQL database name                                                                                                            | `""`                       |
| `global.pgConfig.userName`                                                  | PostgreSQL database user account                                                                                                    | `""`                       |
| `global.pgConfig.password.secretName`                                       | Name of an existing secret holding the password of PostgreSQL database user account                                                 | `""`                       |
| `global.pgConfig.password.secretKey`                                        | Key of an existing secret holding the password of PostgreSQL database user account                                                  | `""`                       |
| `global.pgConfig.ssl.pgSslMode`                                             | [PostgreSQL SSL mode](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-SSLMODE)                             | `""`                       |
| `global.pgConfig.ssl.pgSslSecretName`                                       | Name of an existing secret holding the ssl certificate for PostgreSQL host                                                          | `""`                       |
| `global.pgConfig.ssl.pgSslRootCertSecretKey`                                | Key of an existing secret holding the ssl certificate for PostgreSQL host                                                           | `""`                       |
| `global.pgConfig.ssl.pgSslCertSecretKey`                                    | Name of an existing secret holding the ssl certificate private key for PostgreSQL host                                              | `""`                       |
| `global.pgConfig.ssl.pgSslKeySecretKey`                                     | Key of an existing secret holding the ssl certificate private key for PostgreSQL host                                               | `""`                       |
| `global.redisConfig.host`                                                   | Redis connection string in a format: redis://[:password]@localhost:6379/1                                                           | `""`                       |
| `global.redisConfig.password.secretName`                                    | Name of an existing secret holding the password of Redis database                                                                   | `""`                       |
| `global.redisConfig.password.secretKey`                                     | Key of an existing secret holding the password of Redis database                                                                    | `""`                       |
| `global.redisConfig.ssl.redisSslCertReqs`                                   | Whether to validate the server public key or ignore it. Accepts (`""`, `"optional"`, `"required"`).                                 | `""`                       |
| `global.redisConfig.ssl.redisSslSecretName`                                 | Name of an existing secret holding the ssl certificate for Redis host                                                               | `""`                       |
| `global.redisConfig.ssl.redisSslCaCertsSecretKey`                           | Key of an existing secret holding the ssl certificate for Redis host                                                                | `""`                       |
| `global.redisConfig.ssl.redisSslCertFileSecretKey`                          | Name of an existing secret holding the ssl certificate private key for Redis host                                                   | `""`                       |
| `global.redisConfig.ssl.redisSslKeyFileSecretKey`                           | Key of an existing secret holding the ssl certificate private key for Redis host                                                    | `""`                       |
| `global.extraEnvironmentVars`	                                              | Key/value map of an extra Environment variables, for example, `PYTHONUNBUFFERED: 1`                                                 | `{}`                       |
| `global.extraEnvironmentSecrets`                                            | Key/value map of an extra Secrets                                                                                                   | `{}`                       |
| `global.persistence.enabled`                                                | Enable persistent storage. [See more about setting up persistent storage](https://labelstud.io/guide/persistent_storage.html)       | `true`                     |
| `global.persistence.type`                                                   | Persistent storage type                                                                                                             | `volume`                   |
| `global.persistence.config.s3.accessKey`                                    | Access key to use to access AWS S3                                                                                                  | `""`                       |
| `global.persistence.config.s3.secretKey`                                    | Secret key to use to access AWS S3                                                                                                  | `""`                       |
| `global.persistence.config.s3.accessKeyExistingSecret`                      | Existing Secret name to extract Access key from to access AWS S3                                                                    | `""`                       |
| `global.persistence.config.s3.accessKeyExistingSecretKey`                   | Existing Secret key to extract Access key from to access AWS S3                                                                     | `""`                       |
| `global.persistence.config.s3.secretKeyExistingSecret`                      | Existing Secret name to extract Access secret key from to access AWS S3                                                             | `""`                       |
| `global.persistence.config.s3.secretKeyExistingSecretKey`                   | Existing Secret key to extract Access secret key from to access AWS S3                                                              | `""`                       |
| `global.persistence.config.s3.region`                                       | AWS S3 region                                                                                                                       | `""`                       |
| `global.persistence.config.s3.bucket`                                       | AWS S3 bucket name                                                                                                                  | `""`                       |
| `global.persistence.config.s3.folder`                                       | AWS S3 folder name                                                                                                                  | `""`                       |
| `global.persistence.config.s3.urlExpirationSecs`                            | The number of seconds that a presigned URL is valid for                                                                             | `86400`                    |
| `global.persistence.config.s3.endpointUrl`                                  | Custom S3 URL to use when connecting to S3, including scheme                                                                        | `""`                       |
| `global.persistence.config.volume.storageClass`                             | StorageClass for Persistent Volume                                                                                                  | `""`                       |
| `global.persistence.config.volume.size`                                     | Persistent volume size                                                                                                              | `10Gi`                     |
| `global.persistence.config.volume.accessModes`                              | PVC Access mode                                                                                                                     | `[ReadWriteOnce]`          |
| `global.persistence.config.volume.annotations`	                             | Persistent volume additional annotations                                                                                            | `{}`                       |
| `global.persistence.config.volume.existingClaim`                            | Name of an existing PVC to use                                                                                                      | `""`                       |
| `global.persistence.config.volume.resourcePolicy`                           | PVC resource policy                                                                                                                 | `""`                       |
| `global.persistence.config.volume.annotations`                              | Persistent volume additional annotations                                                                                            | `{}`                       |
| `global.persistence.config.azure.storageAccountName`                        | Azure Storage Account Name to use to access Azure Blob Storage                                                                      | `""`                       |
| `global.persistence.config.azure.storageAccountKey`                         | Azure Storage Account Key to use to access Azure Blob Storage                                                                       | `""`                       |
| `global.persistence.config.azure.storageAccountNameExistingSecret`          | Existing Secret name to extract Azure Storage Account Name from to access Azure Blob Storage                                        | `""`                       |
| `global.persistence.config.azure.storageAccountNameExistingSecretKey`       | Existing Secret key to extract Azure Storage Account Name from to use to access Azure Blob Storage                                  | `""`                       |
| `global.persistence.config.azure.storageAccountKeyExistingSecret`           | Existing Secret name to extract Azure Storage Account Key from to access Azure Blob Storage                                         | `""`                       |
| `global.persistence.config.azure.storageAccountKeyExistingSecretKey`        | Existing Secret key to extract Azure Storage Account Key from to use to access Azure Blob Storage                                   | `""`                       |
| `global.persistence.config.azure.containerName`                             | Azure Storage container name                                                                                                        | `""`                       |
| `global.persistence.config.azure.folder`                                    | Azure Storage folder name                                                                                                           | `""`                       |
| `global.persistence.config.azure.urlExpirationSecs`                         | The number of seconds that a presigned URL is valid for                                                                             | `86400`                    |
| `global.persistence.config.gcs.projectID`                                   | GCP Project ID to use                                                                                                               | `""`                       |
| `global.persistence.config.gcs.applicationCredentialsJSON`                  | Service Account key to access GCS                                                                                                   | `""`                       |
| `global.persistence.config.gcs.applicationCredentialsJSONExistingSecret`    | Existing Secret name to extract Service Account Key from to access GCS                                                              | `""`                       |
| `global.persistence.config.gcs.applicationCredentialsJSONExistingSecretKey` | Existing Secret key to extract Service Account Key from to access GCS                                                               | `""`                       |
| `global.persistence.config.gcs.bucket`                                      | GCS bucket name                                                                                                                     | `""`                       |
| `global.persistence.config.gcs.folder`                                      | GCS folder name                                                                                                                     | `""`                       |
| `global.persistence.config.gcs.urlExpirationSecs`                           | The number of seconds that a presigned URL is valid for                                                                             | `86400`                    |
| `global.featureFlags`                                                       | Key/value map of Feature Flags                                                                                                      | `{}`                       |
| `global.envInjectSources`                                                   | List of file names of a shell scripts to load additional environment variables from. This is useful when using Vault Agent Injector | `[]`                       |
| `global.cmdWrapper`                                                         | Additional commands to run prior to starting App. Useful to run wrappers before startup command                                     | `""`                       |
| `global.customCaCerts`                                                      | List of file names of SSL certificates to add into trust chain                                                                      | `[]`                       |

## App parameters

Parameters specific to the `app` portion of the Label Studio deployment.

| Parameter                                      | Description                                                                                                          | Default                  |
|------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|--------------------------|
| `app.args`                                     | Override default container args (useful when using custom images)	                                                   | `["label-studio-uwsgi"]` |
| `app.deploymentStrategy.type`                  | Deployment strategy type                                                                                             | `RollingUpdate`          |
| `app.replicas`                                 | Amount of app pod replicas                                                                                           | `1`                      |
| `app.NameOverride`                             | String to partially override release template name                                                                   | `""`                     |
| `app.FullnameOverride`                         | String to fully override release template name                                                                       | `""`                     |
| `app.resources.requests.memory`                | The requested memory resources for the App container                                                                 | `384Mi`                  |
| `app.resources.requests.cpu`                   | The requested cpu resources for the App container                                                                    | `250m`                   |
| `app.resources.limits.memory`                  | The memory resources limits for the App container                                                                    | `""`                     |
| `app.resources.limits.cpu`                     | The cpu resources limits for the App container                                                                       | `""`                     |
| `app.initContainer.resources.requests`         | Init container db-migrations resource requests                                                                       | `{}`                     |
| `app.initContainer.resources.limits`           | Init container db-migrations resource limits                                                                         | `{}`                     |
| `app.readinessProbe.enabled`                   | Enable redinessProbe                                                                                                 | `false`                  |
| `app.readinessProbe.path`                      | Path for reasinessProbe                                                                                              | `/version`               |
| `app.readinessProbe.failureThreshold`          | When a probe fails, Kubernetes will try failureThreshold times before giving up                                      | `2`                      |
| `app.readinessProbe.initialDelaySeconds`       | Number of seconds after the container has started before probe initiates                                             | `60`                     |
| `app.readinessProbe.periodSeconds`             | How often (in seconds) to perform the probe                                                                          | `10`                     |
| `app.readinessProbe.successThreshold`          | Minimum consecutive successes for the probe to be considered successful after having failed                          | `1`                      |
| `app.readinessProbe.timeoutSeconds`            | Number of seconds after which the probe times out                                                                    | `5`                      |
| `app.livenessProbe.enabled`                    | Enable livenessProbe                                                                                                 | `true`                   |
| `app.livenessProbe.path`                       | Path for livenessProbe                                                                                               | `/health`                |
| `app.livenessProbe.failureThreshold`           | When a probe fails, Kubernetes will try failureThreshold times before giving up                                      | `3`                      |
| `app.livenessProbe.initialDelaySeconds`        | Number of seconds after the container has started before probe initiates                                             | `60`                     |
| `app.livenessProbe.periodSeconds`              | How often (in seconds) to perform the probe                                                                          | `10`                     |
| `app.livenessProbe.successThreshold`           | Minimum consecutive successes for the probe to be considered successful after having failed                          | `1`                      |
| `app.livenessProbe.timeoutSeconds`             | Number of seconds after which the probe times out                                                                    | `5`                      |
| `app.extraEnvironmentVars`                     | A map of extra environment variables to set                                                                          | `{}`                     |
| `app.extraEnvironmentSecrets`                  | A map of extra environment secrets to set                                                                            | `{}`                     |
| `app.nodeSelector`                             | Labels for pod assignment, formatted as a multi-line string or YAML map                                              | `{}`                     |
| `app.annotations`                              | k8s annotations to attach to the app pods                                                                            | `{}`                     |
| `app.extraLabels`                              | extra k8s labels to attach                                                                                           | `{}`                     |
| `app.affinity`                                 | Affinity for pod assignment                                                                                          | `{}`                     |
| `app.tolerations`                              | Toleration settings for pod                                                                                          | `[]`                     |
| `app.nginx.resources.requests`                 | Nginx sidecar container: resource requests                                                                           | `{}`                     |
| `app.nginx.resources.limits`                   | Nginx sidecar container: resource limits                                                                             | `{}`                     |
| `app.dnsPolicy`                                | Pod DNS policy                                                                                                       | `ClusterFirst`           |
| `app.enableServiceLinks`                       | Service environment variables                                                                                        | `false`                  |
| `app.shareProcessNamespace`                    | Enable shared process namespace in a pod                                                                             | `false`                  |
| `app.automountServiceAccountToken`             | Automount service account token for the server service account                                                       | `true`                   |
| `app.serviceAccount.create`                    | Enable the creation of a ServiceAccount for app pod                                                                  | `true`                   |
| `app.serviceAccount.name`                      | Name of the created ServiceAccount                                                                                   |                          |
| `app.serviceAccount.annotations`               | Custom annotations for app ServiceAccount                                                                            | `{}`                     |
| `app.podSecurityContext.enabled`               | Enable pod Security Context                                                                                          | `true`                   |
| `app.podSecurityContext.fsGroup`               | Group ID for the pod                                                                                                 | `1001`                   |
| `app.containerSecurityContext.enabled`         | Enable container security context                                                                                    | `true`                   |
| `app.containerSecurityContext.runAsUser`       | User ID for the container                                                                                            | `1001`                   |
| `app.containerSecurityContext.runAsNonRoot`    | Avoid privilege escalation to root user                                                                              | `true`                   |
| `app.extraVolumes`                             | Array to add extra volumes                                                                                           | `[]`                     |
| `app.extraVolumeMounts`                        | Array to add extra mounts (normally used with extraVolumes)                                                          | `[]`                     |
| `app.topologySpreadConstraints`                | Topology Spread Constraints for pod assignment                                                                       | `[]`                     |
| `app.nginx.args`                               | Override default container args (useful when using custom images)	                                                   | `["nginx"]`              |
| `app.nginx.livenessProbe.enabled`              | Nginx sidecar container: Enable livenessProbe                                                                        | `true`                   |
| `app.nginx.livenessProbe.path`                 | Nginx sidecar container: path for livenessProbe                                                                      | `/nginx_health`          |
| `app.nginx.livenessProbe.failureThreshold`     | Nginx sidecar container: when a probe fails, Kubernetes will try failureThreshold times before giving up             | `2`                      |
| `app.nginx.livenessProbe.initialDelaySeconds`  | Nginx sidecar container: Number of seconds after the container has started before probe initiates                    | `60`                     |
| `app.nginx.livenessProbe.periodSeconds`        | Nginx sidecar container: How often (in seconds) to perform the probe                                                 | `5`                      |
| `app.nginx.livenessProbe.successThreshold`     | Nginx sidecar container: Minimum consecutive successes for the probe to be considered successful after having failed | `1`                      |
| `app.nginx.livenessProbe.timeoutSeconds`       | Nginx sidecar container: Number of seconds after which the probe times out                                           | `3`                      |
| `app.nginx.readinessProbe.enabled`             | Nginx sidecar container: Enable readinessProbe                                                                        | `true`                   |
| `app.nginx.readinessProbe.path`                | Nginx sidecar container: Path for readinessProbe                                                                     | `/version`               |
| `app.nginx.readinessProbe.failureThreshold`    | Nginx sidecar container: When a probe fails, Kubernetes will try failureThreshold times before giving up             | `2`                      |
| `app.nginx.readinessProbe.initialDelaySeconds` | Nginx sidecar container: Number of seconds after the container has started before probe initiates                    | `60`                     |
| `app.nginx.readinessProbe.periodSeconds`       | Nginx sidecar container: How often (in seconds) to perform the probe                                                 | `10`                     |
| `app.nginx.readinessProbe.successThreshold`    | Nginx sidecar container: Minimum consecutive successes for the probe to be considered successful after having failed | `1`                      |
| `app.nginx.readinessProbe.timeoutSeconds`      | Nginx sidecar container: Number of seconds after which the probe times out                                           | `5`                      |
| `app.service.type`                             | k8s service type                                                                                                     | `ClusterIP`              |
| `app.service.port`                             | k8s service port                                                                                                     | `80`                     |
| `app.service.targetPort`                       | k8s service target port                                                                                              | `8085`                   |
| `app.service.portName`                         | k8s service port name                                                                                                | `service`                |
| `app.service.annotations`	                     | Custom annotations for app service                                                                                   | `{}`                     |
| `app.service.sessionAffinity`                  | Custom annotations for app service                                                                                   | `None`                   |
| `app.service.sessionAffinityConfig`	           | Additional settings for the sessionAffinity                                                                          | `{}`                     |
| `app.ingress.enabled`                          | Set to true to enable ingress record generation	                                                                     | `false`                  |
| `app.ingress.className`                        | IngressClass that will be be used to implement the Ingress (Kubernetes 1.18+)                                        | `""`                     |
| `app.ingress.host`                             | Default host for the ingress resource	                                                                               | `""`                     |
| `app.ingress.path`                             | The Path to LabelStudio. You may need to set this to '/*' in order to use this with ALB ingress controllers.         | `/`                      |
| `app.ingress.extraPaths`                       | Extra paths to prepend to the host configuration                                                                     | `[]`                     |
| `app.ingress.tls`                              | TLS secrets definition                                                                                               | `[]`                     |
| `app.ingress.annotations`                      | Additional ingress annotations                                                                                       | `{}`                     |
| `app.rbac.create`                              | Specifies whether RBAC resources should be created for app service                                                   | `false`                  |
| `app.rbac.rules`                               | Custom RBAC rules to set for app service		                                                                           | `[]`                     |
| `app.contextPath`                              | Context path appended for health/readiness checks                                                                    | `/`                      |
| `app.cmdWrapper`                               | Additional commands to run prior to starting App. Useful to run wrappers before startup command                      | `""`                     |


## Rqworker parameters

Parameters specific to the `rqworkers` service of your Label Studio Enterprise deployment.

| Parameter                                        | Description                                                                                     | Default                                |
|--------------------------------------------------|-------------------------------------------------------------------------------------------------|----------------------------------------|
| `rqworker.enabled`                               | Enable rqworker pod                                                                             | `true`                                 |
| `rqworker.NameOverride`                          | String to partially override release template name                                              | `""`                                   |
| `rqworker.FullnameOverride`                      | String to fully override release template name                                                  | `""`                                   |
| `rqworker.deploymentStrategy.type`               | Deployment strategy type                                                                        | `Recreate`                             |
| `rqworker.extraEnvironmentVars`                  | A map of extra environment variables to set                                                     | `{}`                                   |
| `rqworker.extraEnvironmentSecrets`               | A map of extra environment secrets to set                                                       | `{}`                                   |
| `rqworker.nodeSelector`                          | labels for pod assignment, formatted as a multi-line string or YAML map                         | `{}`                                   |
| `rqworker.annotations`                           | k8s annotations to attach to the rqworker pods                                                  | `{}`                                   |
| `rqworker.extraLabels`                           | extra k8s labels to attach                                                                      | `{}`                                   |
| `rqworker.affinity`                              | Affinity for pod assignment                                                                     | `{}`                                   |
| `rqworker.tolerations`                           | Toleration settings for pod                                                                     | `[]`                                   |
| `rqworker.queues.high.replicas`                  | Rqworker queue "high" replicas amount                                                           | `1`                                    |
| `rqworker.queues.high.args`                      | Rqworker queue "high" launch arguments                                                          | `"high"`                               |
| `rqworker.queues.low.replicas`                   | Rqworker queue "low" replicas amount                                                            | `1`                                    |
| `rqworker.queues.low.args`                       | Rqworker queue "low" launch arguments                                                           | `"low"`                                |
| `rqworker.queues.default.replicas`               | Rqworker queue "default" replicas amount                                                        | `1`                                    |
| `rqworker.queues.default.args`                   | Rqworker queue "default" launch arguments                                                       | `"default"`                            |
| `rqworker.queues.critical.replicas`              | Rqworker queue "critical" replicas amount                                                       | `1`                                    |
| `rqworker.queues.critical.args`                  | Rqworker queue "critical" launch arguments                                                      | `"critical"`                           |
| `rqworker.queues.all.replicas`                   | Rqworker queue "all" replicas amount                                                            | `1`                                    |
| `rqworker.queues.all.args`                       | Rqworker queue "all" launch arguments                                                           | `"low", "default", "critical", "high"` |
| `rqworker.dnsPolicy`                             | Pod DNS policy                                                                                  | `ClusterFirst`                         |
| `rqworker.enableServiceLinks`                    | Service environment variables                                                                   | `false`                                |
| `rqworker.shareProcessNamespace`                 | Enable shared process namespace in a pod                                                        | `false`                                |
| `rqworker.automountServiceAccountToken`          | Automount service account token for the server service account                                  | `true`                                 |
| `rqworker.readinessProbe.enabled`                | Enable redinessProbe                                                                            | `false`                                |
| `rqworker.readinessProbe.path`                   | Path for reasinessProbe                                                                         | `/version`                             |
| `rqworker.readinessProbe.failureThreshold`       | When a probe fails, Kubernetes will try failureThreshold times before giving up                 | `2`                                    |
| `rqworker.readinessProbe.initialDelaySeconds`    | Number of seconds after the container has started before probe initiates                        | `60`                                   |
| `rqworker.readinessProbe.periodSeconds`          | How often (in seconds) to perform the probe                                                     | `5`                                    |
| `rqworker.readinessProbe.successThreshold`       | Minimum consecutive successes for the probe to be considered successful after having failed     | `1`                                    |
| `rqworker.readinessProbe.timeoutSeconds`         | Number of seconds after which the probe times out                                               | `3`                                    |
| `rqworker.livenessProbe.enabled`                 | Enable livenessProbe                                                                            | `false`                                |
| `rqworker.livenessProbe.path`                    | Path for livenessProbe                                                                          | `/health`                              |
| `rqworker.livenessProbe.failureThreshold`        | When a probe fails, Kubernetes will try failureThreshold times before giving up                 | `2`                                    |
| `rqworker.livenessProbe.initialDelaySeconds`     | Number of seconds after the container has started before probe initiates                        | `60`                                   |
| `rqworker.livenessProbe.periodSeconds`           | How often (in seconds) to perform the probe                                                     | `5`                                    |
| `rqworker.livenessProbe.successThreshold`        | Minimum consecutive successes for the probe to be considered successful after having failed     | `1`                                    |
| `rqworker.livenessProbe.timeoutSeconds`          | Number of seconds after which the probe times out                                               | `3`                                    |
| `rqworker.serviceAccount.create`                 | Enable the creation of a ServiceAccount for rqworker pod                                        | `true`                                 |
| `rqworker.serviceAccount.name`                   | Name of the created ServiceAccount                                                              | `""`                                   |
| `rqworker.podSecurityContext.enabled`            | Enable pod Security Context                                                                     | `true`                                 |
| `rqworker.podSecurityContext.fsGroup`            | Group ID for the pod                                                                            | `1001`                                 |
| `rqworker.containerSecurityContext.enabled`      | Enable container security context                                                               | `true`                                 |
| `rqworker.containerSecurityContext.runAsUser`    | User ID for the container                                                                       | `1001`                                 |
| `rqworker.containerSecurityContext.runAsNonRoot` | Avoid privilege escalation to root user                                                         | `true`                                 |
| `rqworker.serviceAccount.annotations`            | Custom annotations for app ServiceAccount                                                       | `{}`                                   |
| `rqworker.extraVolumes`                          | Array to add extra volumes                                                                      | `[]`                                   |
| `rqworker.extraVolumeMounts`                     | Array to add extra mounts (normally used with extraVolumes)                                     | `[]`                                   |
| `rqworker.topologySpreadConstraints`             | Topology Spread Constraints for pod assignment                                                  | `[]`                                   |
| `rqworker.rbac.create`                           | Specifies whether RBAC resources should be created for rqworker service                         | `false`                                |
| `rqworker.rbac.rules`                            | Custom RBAC rules to set for rqworker service		                                                 | `[]`                                   |
| `rqworker.cmdWrapper`                            | Additional commands to run prior to starting App. Useful to run wrappers before startup command | `""`                                   |

<div class="enterprise-only">

## Label Studio Enterprise parameters

| Parameter                                 | Description                                                                        | Default   |
|-------------------------------------------|------------------------------------------------------------------------------------|-----------|
| `enterprise.enabled`                      | Enable Enterprise features                                                         | `false`   |
| `enterprise.enterpriseLicense.secretName` | Name of an existing secret holding the Label Studio Enterprise license information | `""`      |
| `enterprise.enterpriseLicense.secretKey`  | Key of an existing secret holding the enterprise license information               | `license` |

</div>

## Sub-charts parameters

| Parameter                  | Description                                                                                             | Default       |
|----------------------------|---------------------------------------------------------------------------------------------------------|---------------|
| `postgresql.enabled`       | Enable Postgresql sub-chart                                                                             | `true`        |
| `postgresql.architecture`  | PostgreSQL architecture (standalone or replication)                                                     | `standalone`  |
| `postgresql.image.tag`     | PostgreSQL image tag                                                                                    | `13.8.0`      |
| `postgresql.auth.username` | Name for a custom user to create	                                                                       | `labelstudio` |
| `postgresql.auth.password` | Password for the custom user to create. Ignored if `auth.existingSecret` with key password is provided	 | `labelstudio` |
| `postgresql.auth.database` | Name for a custom database to create	                                                                   | `labelstudio` |
| `redis.enabled`            | Enable Redis sub-chart                                                                                  | `false`       |
| `redis.architecture`       | Redis architecture. Allowed values: `standalone` or `replication`	                                      | `standalone`  |
| `redis.auth.enabled`       | Enable password authentication	                                                                         | `false`       |

## Other parameters
| Parameter                 | Description                                      | Default         |
|---------------------------|--------------------------------------------------|-----------------|
| upgradeCheck.enabled      | Enable upgradecheck                              | `false`         |
| ci                        | Indicate that deployment running for CI purposes | `false`         |
| clusterDomain             | Kubernetes Cluster Domain                        | `cluster.local` |
| checkConfig.skipEnvValues | Skip validation for env variables                | `false`         |

## The `global.extraEnvironmentVars` usage

The `global.extraEnvironmentVars` section can be used to configure environment properties of Label Studio.

Any key value put under this section translates to environment variables used to control Label Studio's configuration. Every key is upper-cased before setting the environment variable.

An example:

```yaml
global:
  extraEnvironmentVars:
     PG_USER: labelstudio
```

!!! note
    If you are deploying to a production environment, you should set `SSRF_PROTECTION_ENABLED: true`. See [Secure Label Studio](security#Enable-SSRF-protection-for-production-environments). 


