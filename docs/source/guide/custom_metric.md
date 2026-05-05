---
title: Add a custom agreement metric to Label Studio
short: Custom metrics
tier: enterprise
type: guide
order: 0
order_enterprise: 310
meta_title: Add a Custom Agreement Metric for Labeling
meta_description: Label Studio Enterprise documentation about how to add a custom agreement metric to use for assessing annotator agreement or the quality of your annotation and prediction results for data labeling and machine learning projects.
section: "Review & Measure Quality"
parent: "stats"
parent_enterprise: "stats"
---

Write a custom agreement metric to assess the quality of the predictions and annotations in your Label Studio Enterprise project. 

Label Studio Enterprise contains a variety of [agreement metrics for your project](agreement_metrics), but if you want to evaluate annotations using a custom metric or a standard metric not available in Label Studio, you can write your own. 

!!! note
    This functionality is available out-of-the-box for Label Studio Enterprise Cloud users. 
    
    For Label Studio Enterprise on-prem environments, you must configure your cloud provider to allow Label Studio to deploy and invoke serverless functions. Label Studio supports [AWS Lambda](#AWS-Lambda) and [Google Cloud Functions](#Google-Cloud-Functions). For more information, see [On-prem deployments](#On-prem-deployments).   


Label Studio Enterprise includes various annotation and labeling statistics and the ability to add your own. The open source Community Edition of Label Studio does not contain these calculations. If you're using Label Studio Community Edition, see <a href="https://labelstud.io/guide/label_studio_compare.html">Label Studio Features</a> to learn more.

## Add your custom agreement metric to Label Studio

Custom agreement metrics are added at the project level under **Settings > Quality > Agreement > Custom Agreement Metric Code**.

!!! note 
    You must configure the labeling interface before you can add your custom agreement metric. 

**On-prem deployment using AWS Lambda**

| Field | Description |
| --- | --- |
| **Lambda Tags** | Add tags to the AWS Lambda function using the syntax `tag_name tag_value`. |
| **Lambda Prefix** | Select a prefix for the AWS Lambda function. |

**On-prem deployment using Google Cloud Functions**

Unlike with AWS Lambda, you cannot set a prefix or tags for the Google Cloud Functions function. See [How Label Studio manages your functions](#How-Label-Studio-manages-your-functions) below. 


## How to write your custom agreement metric

For more information about agreement metrics, see [Task agreement](stats).

You can use the agreement metric to compare two annotations, or one annotation with one prediction. Use the input parameters `annotation_1` and `annotation_2` to specify the annotations to compare, or annotation and prediction to compare. 

Add your code to the following function defined in Label Studio:
```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:
```

This function takes the following arguments:

| argument | format | description |
| --- | --- | --- |
| `annotation_1` | JSON object | The first annotation or prediction to compare when calculating agreement. Retrieved in [Label Studio JSON format](export.html#Label-Studio-JSON-format-of-annotated-tasks). |
| `annotation_2` | JSON object | The second annotation or prediction to compare when calculating agreement. Retrieved in [Label Studio JSON format](export.html#Label-Studio-JSON-format-of-annotated-tasks).
| `per_label` | boolean | Whether to perform an agreement calculation for each label in the annotation, or across the entire annotation result.  |
| `return` | float | The agreement score to assign, as a float point number between 0 and 1. |

For example, given the following labeling config:

```xml
<View>
  <Image name="image" value="$image"/>
  <Choices name="choice" toName="image" showInLine="true">
    <Choice value="Positive" />
    <Choice value="Negative" />
	<Choice value="Neutral" />
  </Choices>
</View>
```

The following agreement metric compares two annotations for a classification task with choice options of "Positive" and "Negative":

```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:

    # Retrieve two annotations in the Label Studio JSON format
    r1 = annotation_1["result"][0]["value"]["choices"][0]
    r2 = annotation_2["result"][0]["value"]["choices"][0]
    
    # Determine annotation agreement based on specific choice values
    if r1 == r2:
        # If annotations match and include the choice "Positive", return an agreement score of 0.99
        if r1 == "Positive":
            return 0.99
        # If annotations match and include the choice "Negative", return an agreement score of 0.7
        if r1 == "Negative":
            return 0.7
    # If annotations do not match, return an agreement score of 0
    else:
        return 0
```

If you set `per_label=True`, you can define a separate method or agreement score for each label. If you do this, you must return a separate score for each label. For example, for a classification task, you could use the following function to assign a weight and return a specific agreement score for each label used in an annotation:

```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:

    label_1 = annotation_1["result"][0]["value"]["choices"][0]
    label_2 = annotation_2["result"][0]["value"]["choices"][0]
    weight = {"Positive": 0.99, "Negative": 0.01}
    
    if label_1 == label_2:
        if per_label:
            return {label_1: weight[label_1]}
        else:
            return weight[label_1]
    else:
        if per_label:
            return {label_1: 0, label_2: 0}
        else:
            return 0
```

### Show logs

You can view logs for your custom agreement metric for troubleshooting purposes. 

For logs to generate, you must first have at least one task annotated by at least two annotators. 


## AWS Lambda (on-prem deployments)

If you have Label Studio Enterprise deployed in a private cloud (self-managed) Amazon Web Services (AWS) Elastic Compute Cluster (EC2) instance or Amazon Elastic Kubernetes Service (EKS), you must grant additional permissions so that Label Studio Enterprise can run custom agreement metrics in AWS Lambda. 

To set up the permissions, do the following: 
1. [Create an AWS IAM role](#Create-an-AWS-IAM-role-for-logging) to be used by the custom metric Lambda functions to store logs in Cloudwatch 
2. Set up permissions that grant access to AWS Lambda. How you do this depends on your deployment scenario:
   - [Deployed with Docker Compose running in EC2](#Deployed-with-Docker-Compose-running-in-EC2).
   - [Deployed in EKS with an OIDC provider](#Deployed-in-EKS-with-an-OIDC-provider).
   - [Deployed in EKS without an OIDC provider](#Deployed-in-EKS-without-an-OIDC-provider).

You must know the AWS account ID for the AWS account that you use to manage Label Studio Enterprise to perform these steps. 

### Step 1: Create an AWS IAM role for logging

Using your preferred method, create an AWS IAM role. 

1. Create an AWS IAM role named `LSE_CustomMetricsExecuteRole`. Follow the steps to create a role to delegate permissions to an AWS service in the AWS Identity and Access Management documentation for [Creating a role for an AWS service (console)](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html#roles-creatingrole-service-console).
2. Whether you create the role using the console or the AWS CLI, create or attach the following IAM policy to allow the role to store logs in Cloudwatch. Replace `YOUR_AWS_ACCOUNT` with your AWS account ID that has access to Label Studio Enterprise.
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "logs:CreateLogGroup",
            "Resource": "arn:aws:logs:*:YOUR_AWS_ACCOUNT:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:*:YOUR_AWS_ACCOUNT:log-group:/aws/lambda/custom-metric-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:PutRetentionPolicy"
            ],
           "Resource": [
               "arn:aws:logs:*:YOUR_AWS_ACCOUNT:log-group:/aws/lambda/custom-metric-*"
           ]
        }
    ]
}
```

#### Create an IAM policy to grant AWS Lambda permissions

To grant permissions to a specific user, role, or EKS node group used to manage Label Studio Enterprise access to interact with AWS Lambda, use the following IAM policy. Create an IAM policy called `LSE_AllowInteractLambda` and replace `YOUR_AWS_ACCOUNT` with your AWS account ID:
```json
{
   "Version": "2012-10-17",
   "Statement": [
      {
         "Sid": "VisualEditor0",
         "Effect": "Allow",
         "Action": "iam:PassRole",
         "Resource": "arn:aws:iam::YOUR_AWS_ACCOUNT:role/LSE_CustomMetricsExecuteRole"
      },
      {
         "Sid": "VisualEditor1",
         "Effect": "Allow",
         "Action": [
            "lambda:CreateFunction",
            "lambda:UpdateFunctionCode",
            "lambda:InvokeFunction",
            "lambda:GetFunction",
            "lambda:DeleteFunction",
            "lambda:TagResource",
            "lambda:ListTags"
         ],
         "Resource": [
            "arn:aws:lambda:*:YOUR_AWS_ACCOUNT:function:custom-metric-*"
         ]
      },
      {
         "Sid": "VisualEditor2",
         "Effect": "Allow",
         "Action": "lambda:ListFunctions",
         "Resource": "*"
      },
      {
         "Action": [
            "logs:CreateLogGroup",
            "logs:PutRetentionPolicy",
            "logs:TagResource",
            "logs:StartQuery",
            "logs:GetQueryResults"
         ],
         "Effect": "Allow",
         "Resource": [
            "arn:aws:logs:*:YOUR_AWS_ACCOUNT:log-group:/aws/lambda/custom-metric-*"
         ]
      }
   ]
}
```

### Step 2: Configure permissions between Label Studio Enterprise and AWS Lambda

After creating an IAM role to manage logs for the custom agreement metric, set up permissions to allow Label Studio Enterprise to interact with AWS Lambda. 

How you set up permissions depends on how you deployed Label Studio Enterprise in your self-managed cloud infrastructure:
- [Deployed with Docker Compose running in EC2](#Deployed-with-Docker-Compose-running-in-EC2)
- [Deployed in EKS with an OIDC provider](#Deployed-in-EKS-with-an-OIDC-provider)
- [Deployed in EKS without an OIDC provider](#Deployed-in-EKS-without-an-OIDC-provider)

#### Docker Compose running in EC2

If you deployed Label Studio Enterprise using Docker Compose in an AWS EC2 instance, do the following to finish setting up permissions for the custom agreement metric functionality:
1. Follow the AWS documentation steps for [Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) to create an IAM user with programmatic access. This type of user is granted an access key to access AWS services.
2. While creating the IAM user, for the **Set permissions** option, choose to **Attach existing policies directly**.
3. Select **Create policy** and attach the [`LSE_AllowInteractLambda` policy](#Create-an-IAM-policy-to-grant-AWS-Lambda-permissions).
4. When you finish creating the user, save the username and access key somewhere secure.
5. In the `docker-compose.yaml` file that you use to deploy Label Studio Enterprise, add the following environment variables in the `app` and `rqworkers` sections:

!!! attention "important" 
    Update:
    - `YOUR_AWS_ACCESS_KEY_ID`, `YOUR_AWS_SECRET_ACCESS_KEY` and `YOUR_AWS_ACCOUNT` with the credentials for the account created in step 1. 
    - `YOUR_AWS_REGION` with the AWS region that your EC2 instance exists in the following:
```
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
LS_LAMBDA_REGION_CUSTOM_METRICS=YOUR_AWS_REGION
LS_LAMBDA_ROLE_CUSTOM_METRICS=arn:aws:iam::YOUR_AWS_ACCOUNT:role/LSE_CustomMetricsExecuteRole
```

After you set up these permissions in your environment, you're ready to write your custom agreement metric and add it to Label Studio Enterprise:
1. [Write your custom agreement metric](#How-to-write-your-custom-agreement-metric).
2. [Add your custom agreement metric to Label Studio Enterprise](#Add-your-custom-agreement-metric-to-Label-Studio-Enterprise).

#### Deployed in EKS with an OIDC provider

If you deployed Label Studio Enterprise in Amazon Elastic Kubernetes Service (EKS) with OpenID Connect (OIDC) for identity and access management (IAM), do the following to finish setting up permissions for the custom agreement metric functionality:
1. Create an AWS IAM role named `LSE_ServiceAccountApp` following the steps to create a role to delegate permissions to an AWS service in the AWS Identity and Access Management documentation for [Creating a role for an AWS service (console)](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html#roles-creatingrole-service-console).
2. When relevant, attach the [`LSE_AllowInteractLambda` policy](#Create-an-IAM-policy-to-grant-AWS-Lambda-permissions) to the `LSE_ServiceAccountApp` role. 
3. Update your helm `values.yaml` file to include the following map. Replace `YOUR_AWS_ACCOUNT` with your AWS account ID:
```yaml
app:
  serviceAccount:
    annotations: 
      eks.amazonaws.com/role-arn: arn:aws:iam::YOUR_AWS_ACCOUNT:role/LSE_ServiceAccountApp
```
4. [Restart your Helm release](install_enterprise_k8s.html#Restart-Label-Studio-Enterprise-using-Helm).
   
After you set up these permissions in your environment, you're ready to write your custom agreement metric and add it to Label Studio Enterprise:
1. [Write your custom agreement metric](#How-to-write-your-custom-agreement-metric).
2. [Add your custom agreement metric to Label Studio Enterprise](#Add-your-custom-agreement-metric-to-Label-Studio-Enterprise).

#### Deployed in EKS without an OIDC provider

If you deployed Label Studio Enterprise in Amazon Elastic Kubernetes Service (EKS) and are not using OpenID Connect (OIDC) for identity and access management (IAM), do the following to finish setting up permissions for the custom agreement metric functionality:
1. In the AWS console UI, go to **EKS > Clusters > YOUR_CLUSTER_NAME > Node Group**.
2. Select the name of **YOUR_NODE_GROUP** with Label Studio Enterprise deployed.
3. On the **Details** page, locate and select the option for **Node IAM Role ARN**.
4. Create the AWS IAM policy [`LSE_AllowInteractLambda`](#Create-an-IAM-policy-to-grant-AWS-Lambda-permissions).
5. [Restart your Helm release](install_enterprise_k8s.html#Restart-Label-Studio-Enterprise-using-Helm).
   
After you set up these permissions in your environment, you're ready to write your custom agreement metric and add it to Label Studio Enterprise:
1. [Write your custom agreement metric](#How-to-write-your-custom-agreement-metric).
2. [Add your custom agreement metric to Label Studio Enterprise](#Add-your-custom-agreement-metric-to-Label-Studio-Enterprise).

## Google Cloud Functions (on-prem deployments)

If you deploy Label Studio Enterprise on Google Cloud Platform (GCP), you can run custom agreement metrics on [Google Cloud Functions (2nd gen)](https://cloud.google.com/functions/docs/concepts/version-comparison) instead of AWS Lambda.

Before you start, make sure you have your GCP project ID and know how Label Studio Enterprise is deployed (Compute Engine VM, GKE with Workload Identity, or GKE without Workload Identity).

### Step 1: Enable the required GCP APIs

Label Studio Enterprise requires the following APIs to be enabled in your GCP project:

- [Cloud Functions API](https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com) (`cloudfunctions.googleapis.com`)
- [Cloud Build API](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com) (`cloudbuild.googleapis.com`)
- [Cloud Storage API](https://console.cloud.google.com/apis/library/storage.googleapis.com) (`storage.googleapis.com`)
- [Cloud Logging API](https://console.cloud.google.com/apis/library/logging.googleapis.com) (`logging.googleapis.com`)
- [Artifact Registry API](https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com) (`artifactregistry.googleapis.com`)
- [Cloud Run API](https://console.cloud.google.com/apis/library/run.googleapis.com) (`run.googleapis.com`)

You can enable them using the `gcloud` CLI:
```bash
gcloud services enable \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  logging.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --project=YOUR_GCP_PROJECT
```

### Step 2: Create a runtime service account for Cloud Functions

Create a dedicated service account for your Cloud Functions to run as. It only needs the **Logs Writer** role.

1. Create the service account:
```bash
gcloud iam service-accounts create lse-custom-metrics-runtime \
  --display-name="LSE Custom Metrics Runtime" \
  --project=YOUR_GCP_PROJECT
```

2. Grant the Logs Writer role:
```bash
gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT \
  --member="serviceAccount:lse-custom-metrics-runtime@YOUR_GCP_PROJECT.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

You'll need this service account email (`lse-custom-metrics-runtime@YOUR_GCP_PROJECT.iam.gserviceaccount.com`) later for the `GCP_SERVICE_ACCOUNT_CUSTOM_METRICS` environment variable.

### Step 3: Grant permissions to the Label Studio Enterprise identity

The identity Label Studio Enterprise runs as needs to manage Cloud Functions and upload function source. This identity varies by deployment — your Compute Engine VM service account, a dedicated GCP service account bound via Workload Identity, or your GKE node pool service account. The deployment-specific sections below tell you which one to bind this role to.

Create a custom IAM role named `LSE_CustomMetricsDeployer` with the following permissions:

```yaml
title: LSE Custom Metrics Deployer
description: Allows Label Studio Enterprise to deploy and invoke custom metric Cloud Functions
stage: GA
includedPermissions:
  # Cloud Functions lifecycle
  - cloudfunctions.functions.create
  - cloudfunctions.functions.update
  - cloudfunctions.functions.delete
  - cloudfunctions.functions.get
  - cloudfunctions.functions.list
  # Source upload via generateUploadUrl
  - cloudfunctions.functions.generateUploadUrl
  # Source code download from GCS staging bucket
  - storage.objects.get
  - storage.objects.create
  # Cloud Functions invocation (2nd gen uses Cloud Run)
  - run.routes.invoke
  # View function execution logs
  - logging.logEntries.list
  - logging.logs.list
  # Act as the runtime service account
  - iam.serviceAccounts.actAs
```

You can create this role using the `gcloud` CLI:
```bash
gcloud iam roles create LSE_CustomMetricsDeployer \
  --project=YOUR_GCP_PROJECT \
  --title="LSE Custom Metrics Deployer" \
  --description="Allows Label Studio Enterprise to deploy and invoke custom metric Cloud Functions" \
  --permissions=cloudfunctions.functions.create,cloudfunctions.functions.update,cloudfunctions.functions.delete,cloudfunctions.functions.get,cloudfunctions.functions.list,cloudfunctions.functions.generateUploadUrl,storage.objects.get,storage.objects.create,run.routes.invoke,logging.logEntries.list,logging.logs.list,iam.serviceAccounts.actAs
```

Then bind it to the Label Studio Enterprise identity. Replace `LSE_IDENTITY` with the appropriate member (see the deployment-specific sections below):
```bash
gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT \
  --member="LSE_IDENTITY" \
  --role="projects/YOUR_GCP_PROJECT/roles/LSE_CustomMetricsDeployer"
```

!!! note
    Instead of a single custom role, you can also assign the following predefined roles: `roles/cloudfunctions.developer`, `roles/run.invoker`, `roles/storage.objectAdmin`, `roles/logging.viewer`, and `roles/iam.serviceAccountUser`. The custom role above follows the principle of least privilege.

#### Deployed with Docker Compose on a Compute Engine VM

If you deployed Label Studio Enterprise using Docker Compose on a Compute Engine VM:

1. Make sure the VM runs as a service account that has the `LSE_CustomMetricsDeployer` custom role (or the equivalent predefined roles) bound at the project level. If you need to create one, run:
```bash
gcloud iam service-accounts create lse-app \
  --display-name="LSE Application" \
  --project=YOUR_GCP_PROJECT

gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT \
  --member="serviceAccount:lse-app@YOUR_GCP_PROJECT.iam.gserviceaccount.com" \
  --role="projects/YOUR_GCP_PROJECT/roles/LSE_CustomMetricsDeployer"
```

2. Assign that service account to your Compute Engine instance.

3. In the `docker-compose.yaml` file you use to deploy Label Studio Enterprise, add the following environment variables to the `app` and `rqworkers` sections:

!!! attention "important"
    Replace `YOUR_GCP_PROJECT` with your GCP project ID and `YOUR_GCP_REGION` with your preferred region (for example, `us-central1`).

```
CUSTOM_METRIC_PROVIDER=gcp
GCP_PROJECT_CUSTOM_METRICS=YOUR_GCP_PROJECT
GCP_REGION_CUSTOM_METRICS=YOUR_GCP_REGION
GCP_SERVICE_ACCOUNT_CUSTOM_METRICS=lse-custom-metrics-runtime@YOUR_GCP_PROJECT.iam.gserviceaccount.com
```

!!! note
    On Compute Engine with a properly scoped service account, Label Studio uses [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials) automatically — no key file required.

#### Deployed in GKE with Workload Identity

If you're using GKE with [Workload Identity](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity):

1. Create a GCP service account for Label Studio Enterprise (if you haven't already):
```bash
gcloud iam service-accounts create lse-app \
  --display-name="LSE Application" \
  --project=YOUR_GCP_PROJECT
```

2. Bind the `LSE_CustomMetricsDeployer` custom role to the service account:
```bash
gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT \
  --member="serviceAccount:lse-app@YOUR_GCP_PROJECT.iam.gserviceaccount.com" \
  --role="projects/YOUR_GCP_PROJECT/roles/LSE_CustomMetricsDeployer"
```

3. Allow the Kubernetes service account to impersonate the GCP service account:
```bash
gcloud iam service-accounts add-iam-policy-binding \
  lse-app@YOUR_GCP_PROJECT.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:YOUR_GCP_PROJECT.svc.id.goog[YOUR_NAMESPACE/YOUR_K8S_SERVICE_ACCOUNT]"
```

4. Update your Helm `values.yaml` to annotate the Kubernetes service account and set the required environment variables:
```yaml
app:
  serviceAccount:
    annotations:
      iam.gke.io/gcp-service-account: lse-app@YOUR_GCP_PROJECT.iam.gserviceaccount.com
  extraEnvironmentVars:
    CUSTOM_METRIC_PROVIDER: gcp
    GCP_PROJECT_CUSTOM_METRICS: YOUR_GCP_PROJECT
    GCP_REGION_CUSTOM_METRICS: YOUR_GCP_REGION
    GCP_SERVICE_ACCOUNT_CUSTOM_METRICS: lse-custom-metrics-runtime@YOUR_GCP_PROJECT.iam.gserviceaccount.com

rqworker:
  extraEnvironmentVars:
    CUSTOM_METRIC_PROVIDER: gcp
    GCP_PROJECT_CUSTOM_METRICS: YOUR_GCP_PROJECT
    GCP_REGION_CUSTOM_METRICS: YOUR_GCP_REGION
    GCP_SERVICE_ACCOUNT_CUSTOM_METRICS: lse-custom-metrics-runtime@YOUR_GCP_PROJECT.iam.gserviceaccount.com
```

5. Restart your Helm release.

#### Deployed in GKE without Workload Identity

If you're using GKE without Workload Identity, your pods authenticate as the GKE node's service account, so that's the identity you'll grant permissions to.

1. Identify the service account used by your node pool. In the GCP console, go to **Kubernetes Engine > Clusters > YOUR_CLUSTER > Node Pools > YOUR_NODE_POOL > Security** and note the service account.

2. Bind the `LSE_CustomMetricsDeployer` custom role to the node pool's service account:
```bash
gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT \
  --member="serviceAccount:YOUR_NODE_SERVICE_ACCOUNT@YOUR_GCP_PROJECT.iam.gserviceaccount.com" \
  --role="projects/YOUR_GCP_PROJECT/roles/LSE_CustomMetricsDeployer"
```

3. Update your Helm `values.yaml` to set the required environment variables:
```yaml
app:
  extraEnvironmentVars:
    CUSTOM_METRIC_PROVIDER: gcp
    GCP_PROJECT_CUSTOM_METRICS: YOUR_GCP_PROJECT
    GCP_REGION_CUSTOM_METRICS: YOUR_GCP_REGION
    GCP_SERVICE_ACCOUNT_CUSTOM_METRICS: lse-custom-metrics-runtime@YOUR_GCP_PROJECT.iam.gserviceaccount.com

rqworker:
  extraEnvironmentVars:
    CUSTOM_METRIC_PROVIDER: gcp
    GCP_PROJECT_CUSTOM_METRICS: YOUR_GCP_PROJECT
    GCP_REGION_CUSTOM_METRICS: YOUR_GCP_REGION
    GCP_SERVICE_ACCOUNT_CUSTOM_METRICS: lse-custom-metrics-runtime@YOUR_GCP_PROJECT.iam.gserviceaccount.com
```

4. Restart your Helm release.


### Environment variable reference for GCP

| Variable | Description | Default |
| --- | --- | --- |
| `CUSTOM_METRIC_PROVIDER` | Set to `gcp` to use Google Cloud Functions instead of AWS Lambda. | `aws` |
| `GCP_PROJECT_CUSTOM_METRICS` | The GCP project ID where Cloud Functions are deployed. | (none, required) |
| `GCP_REGION_CUSTOM_METRICS` | The GCP region for Cloud Functions (e.g. `us-central1`, `europe-west1`). | `us-central1` |
| `GCP_SERVICE_ACCOUNT_CUSTOM_METRICS` | The email of the runtime service account that deployed Cloud Functions execute as. | (none, optional) |

### Cloud Function runtime configuration

Label Studio Enterprise deploys each custom metric Cloud Function with a fixed runtime configuration. These values are not user-configurable from the UI or environment variables and apply to every deployed function:

| Setting | Value |
| --- | --- |
| **Runtime** | Python 3.13 (`python313`) |
| **Entry point** | `agreement_handler` |
| **Memory** | 256 MB |
| **Request timeout** | 60 seconds |
| **Max instance count** | 1 |
| **Ingress** | Internal only (`ALLOW_INTERNAL_ONLY`) |

What this means for your metric code:

- Use Python 3.13–compatible code and imports.
- Keep the `agreement` function lightweight and stateless. Loading large models or running expensive computation can exceed the 256 MB / 60 s limits and fail scoring.
- Scoring requests are queued one-at-a-time per function. This is fine for background workers but means metrics aren't suited to interactive use.

##### Network connectivity

Custom metric functions are deployed with internal-only ingress, which affects how you reach them:

- **Same GCP project as Label Studio Enterprise:** Works out of the box. Internal traffic from your Compute Engine or GKE workloads is allowed by default.
- **Different VPC or project:** You'll need to set up internal connectivity first — Shared VPC, VPC peering, or a Serverless VPC Access connector — or scoring will fail.
- **Testing the function directly:** You can't invoke it from outside Google's network. `curl` from your laptop or the Cloud Console **Test** button will return `403 Forbidden`. To verify deployment, trigger scoring inside Label Studio Enterprise (for example, recalculate agreement on a project that uses the metric).

#### How Label Studio manages your functions

Label Studio creates one Cloud Function per project that uses a custom metric, reuses it across scoring runs, and resolves the function URL for you — there's no URL or function name to configure manually.

To find a function in the Google Cloud console:

1. Open **Cloud Functions** in your configured GCP project and region.
2. Look for functions named `custom-metric-<project_id>-<timestamp>`.
3. Open a function to view logs, deployment state, and the trigger URL.

##### Function lifecycle behavior

| Behavior | Description |
| --- | --- |
| **Deploy** | Creates a new function if no matching existing function is found. |
| **Update** | Updates the existing function when possible. |
| **Provider/metric change** | If you switch away from this metric/provider, Label Studio attempts to delete the previously managed GCP function. |
| **Runtime status in app** | The app reports states such as NotDeployed, Pending, Active, Failed, NotFound, Error. |
| **Discoverability and metadata** | Label Studio applies internal labels (metadata) to functions for project/org/host tracking. These labels are primarily for internal management and cloud-side filtering. The function HTTPS URL is resolved and cached automatically by Label Studio. |

!!! attention "important"
    Prefix and tags/labels are not currently exposed as user-facing fields in the UI for GCP. 
    
    Advanced users can only set such values through API-level metric parameters (if your organization exposes that workflow), not via standard settings screens.



