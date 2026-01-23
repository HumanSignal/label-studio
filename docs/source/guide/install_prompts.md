---
title: Install Prompts in an on-prem environment (optional)
short: Install Prompts
type: guide
tier: enterprise
order: 0
order_enterprise: 71
meta_title: Install Prompts
meta_description: Install Prompts in a Label Studio Enterprise on-prem environment
section: "Install & Setup"
parent: "install_k8s"
parent_enterprise: "install_enterprise_k8s"
---

Installing Prompts in an on-prem environment requires installing Adala, our data labeling agent microservice.

You only need to complete these steps if you want to use Prompts. For more information, see our [Prompts overview](prompts_overview).

!!! note
    Prompts are only supported for Kubernetes deployments. If you are using Docker, you will need to migrate to a Kubernetes deployment to use Prompts. See [Deploy Label Studio Enterprise on Kubernetes](install_enterprise_k8s.html) for more information.


## Prerequisites

- Kubernetes cluster **v1.24** or later
- Helm **v3.8.0** or later
- Docker CLI (for logging into Docker Hub)

## Resource requirements

Before installing, ensure your Kubernetes cluster can provide the following minimum resources for Adala:

| Resource | Requirement |
| --- | --- |
| CPU | 6 cores |
| Memory | 12 GB |

## 1. Authenticate to Docker Hub and validate access

You will need your Docker Hub username and password. If you do not have them, [request access from the HumanSignal team](mailto:support@humansignal.com).

Log in to DockerHub to access the private OCI repository:

```bash

docker login -u CUSTOMER_USERNAME
```

When prompted, enter your Docker Hub password.

Then verify your credentials and access:

```bash
helm pull oci://registry-1.docker.io/heartexlabs/adala
```

Expected output:

```bash
Pulled: registry-1.docker.io/heartexlabs/adala:X.X.X
Digest: sha256:***************************************************
```

## 2. Create a Kubernetes secret for image pulling

Create a Kubernetes secret to allow your cluster to pull private Adala images:

```bash
kubectl create secret docker-registry heartex-pull-key \
  --docker-server=https://index.docker.io/v2/ \
  --docker-username=CUSTOMER_USERNAME \
  --docker-password=CUSTOMER_PASSWORD
```

## 3. Prepare your custom values file

Create a file named `custom.values.yaml` with the following contents:

```yaml
adala-app:
  deployment:
    image:
      tag: 20250428.151611-master-592e818
      pullSecrets:
        - heartex-pull-key
adala-worker:
  deployment:
    image:
      tag: 20250428.151611-master-592e818
      pullSecrets:
        - heartex-pull-key
```

!!! note
    Replace the `image.tag` with the appropriate version if necessary.


## 4. Create a dedicated namespace for Adala

Create a dedicated namespace `prompt` for Adala:

```bash
kubectl create namespace prompt
```

## 5. Install the Adala Helm chart

Run the following command to install **Adala** using your custom values:

```bash
helm install lse oci://registry-1.docker.io/heartexlabs/adala --values custom.values.yaml
```

## 6. Validate that Adala is running

Check if all pods in the `prompt` namespace are in the **Running** or **Completed** state:

```bash
kubectl get pods -n prompt
```

You should see output where all pods have `STATUS` set to `Running`, for example:

```
NAME                                  READY   STATUS    RESTARTS       AGE
adala-adala-app-d4564ffd7-gtmhx       1/1     Running   0              100m
adala-adala-kafka-controller-0        1/1     Running   0              110m
adala-adala-kafka-controller-1        1/1     Running   0              111m
adala-adala-kafka-controller-2        1/1     Running   0              113m
adala-adala-redis-master-0            1/1     Running   0              125m
adala-adala-worker-5d87f97f76-mq952   1/1     Running   0              111m

```

If any pod is not running, you can investigate further:

```bash

kubectl describe pod <pod-name> -n prompt
```

or

```bash
kubectl logs <pod-name> -n prompt
```

## 7. Update the Label Studio `values.yaml` file

You will need to update the `global` section of your Label Studio Enterprise `values.yaml` file to include the following:

* Add the Adala endpoint, which will allow Label Studio to connect to Adala. 
* Add the Prompts feature flag, to enable Prompts visibility within Label Studio. 


```yaml
global:
  extraEnvironmentVars:
    PROMPTER_ADALA_URL: http://adala-adala-app.prompt:8000
  featureFlags:
    fflag_feat_all_dia_835_prompter_workflow_long: true
```

Note the following for `PROMPTER_ADALA_URL`:

- `prompt` is the namespace where Adala is installed.
- `adala-adala-app` is the name of the Adala service automatically created by the Helm release.
- Port `8000` is the default port where Adala listens.

After updating the values file, redeploy Label Studio to apply the changes.