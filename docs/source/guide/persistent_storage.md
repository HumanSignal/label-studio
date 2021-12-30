---
title: Set up persistent storage 
badge: <i class='ent'/></i>
type: guide
order: 204
meta_title: Set up persistent storage with Label Studio Enterprise
meta_description: Configure persistent storage with Label Studio Enterprise hosted in the cloud to store uploaded data such as task data, user images, and more. 
---

If you host Label Studio Enterprise in the cloud, set up persistent storage for uploaded task data, user images, and more in the cloud.

Follow the steps relevant for your deployment:
* [Set up Amazon S3](#Set-up-Amazon-S3) for Label Studio Enterprise deployments in Amazon Web Services (AWS).
* [Set up Google Cloud Storage (GCS)](#Set-up-Google-Cloud-Storage) for Label Studio Enterprise deployments in GCS.
* [Set up Microsoft Azure](#Set-up-Microsoft-Azure) for Label Studio Enterprise deployments in Microsoft Azure. 

## Set up Amazon S3

Set up Amazon S3 as the persistent storage for uploaded Label Studio Enterprise assets. 

> If you want to secure the data stored in the S3 bucket at rest, you can [set up default server-side encryption for Amazon S3 buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html) following the steps in the Amazon Simple Storage Service User Guide. 

Start by [creating an S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html) following the Amazon Simple Storage Service User Guide steps.

After you set up an S3 bucket, set up the necessary IAM permissions to grant Label Studio Enterprise access to your bucket. There are two ways that you can manage access to your S3 bucket:
- Set up an **IAM role** (recommended)
- Or use **Access keys** 

Select the relevant tab and follow the steps for your desired option: 

<div class="code-tabs">
  <div data-name="IAM role">


IAM role [configured and provisioned OIDC provider is required](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
Pass your newly created IAM role to our app and workers pods as annotation in your lse-values.yaml file:
```yaml
global:
  persistence:
    enabled: true
    type: s3
    config:
      s3:
        bucket: "my-awesome-bucket"
        region: "us-east-2"
app:
  serviceAccount:
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::<ACCOUNT_ID>:role/label-studio-bucket-access

rqworker:
  serviceAccount:
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::<ACCOUNT_ID>:role/label-studio-bucket-access
```

  </div>

  <div data-name="Access keys">

Follow the AWS documentation steps for [Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) to create an IAM user with programmatic access. This type of user is granted an access key to access AWS services.
While creating the IAM user, for the Set permissions option, choose to Attach existing policies directly.
Select Create policy and attach the policy from the Storage for LSE
When you finish creating the user, save the username and access key somewhere secure.
Pass your newly created AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY role to our app and workers in your lse-values.yaml file:
```yaml
global:
  persistence:
    enabled: true
    type: s3
    config:
      s3:
        accessKey: "AKZXNXASDLHG3165FRCE3"
        secretKey: "eKESFDgjkdsfkgbdsjKelRhEe5GSd0lZ5A/Ya"
        bucket: "my-awesome-bucket"
        region: "us-east-2"
```


  </div>
</div>



If you don't have an OIDC provider set up for your IAM role
Similar steps as in https://github.com/heartexlabs/label-studio/blob/master/docs/source/guide/custom_metric.md#deployed-in-eks-without-an-oidc-provider but different policy (https://docs.pachyderm.com/latest/deploy-manage/deploy/aws-deploy-pachyderm/#add-an-iam-role-and-policy-to-your-service-account)





## Set up Google Cloud Storage


Create bucket
Create a test bucket in GCS with uniform access control for that. 

Create IAM Service Account in the menu “Iam & Admin -> Service Accounts”
To enable this account to create, access and delete objects in the bucket with uniform access control, we set the permissions of this account to the pre-defined role Storage Object Admin. With this role we exactly gain the desired permissions. Click “Add condition” right to the role in the permissions dialogue. There you can enter a condition name and the condition itself. In our case we will restirct the Storage Object Admin role to objects that belong to our test bucket heartex-example-bucket-123456.

Condition type	
Name
Operator
Starts with
Value
projects/_/buckets/heartex-example-bucket-123456


Alternatively you can enter a so-called CEL expression to set the condition. For this also refer to the overview of IAM conditions in the official docs. The CEL for our condition would be: resource.name.startsWith('projects/_/buckets/heartex-example-bucket-123456')


There are 2 ways how to connect to your bucket: WorkLoad Identity or Access keys
Workload Identity is the recommended way to access Google Cloud services from applications running within GKE. Ensure that your GKE cluster has enabled WorkloadIdentity:https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity



<div class="code-tabs">
  <div data-name="Workload Identity">

Create and Bind a Kubernetes Service Account
Create the following set of variables:
```
GCP_SA=<SERVICE_ACCOUNT_NAME_FROM_THE_PREVIOUS_STEP>
APP_SA="serviceAccount:${GCP_PROJECT_ID}.svc.id.goog[${K8S_NAMESPACE}/${HELM_RELEASE_NAME}-lse-app]"
WORKER_SA="serviceAccount:${GCP_PROJECT_ID}.svc.id.goog[${K8S_NAMESPACE}/${HELM_RELEASE_NAME}-lse-rqworker]"
```
Bind roles:
```
gcloud iam service-accounts add-iam-policy-binding ${GCP_SA} \
    --role roles/iam.workloadIdentityUser \
    --member "${APP_SA}"
gcloud iam service-accounts add-iam-policy-binding ${GCP_SA} \
    --role roles/iam.workloadIdentityUser \
    --member "${WORKER_SA}"
```
Pass your service account and other configuration in your lse-values.yaml:
```
global:
  persistence:
    enabled: true
    type: gcs
    config:
      gcs:
        projectID: "123123project"
        bucket: "heartex-example-bucket-123456"
app:
  serviceAccount:
    annotations:
      iam.gke.io/gcp-service-account: "<SERVICE_ACCOUNT>"

rqworker:
  serviceAccount:
    annotations:
      iam.gke.io/gcp-service-account: "<SERVICE_ACCOUNT>"
```


  </div>

  <div data-name="Service Account Keys">
   Create a service account key from the UI and download the JSON.


Put your json, projectID and bucket in your lse-values.yaml:
```
global:
  persistence:
    enabled: true
    type: gcs
    config:
      gcs:
        projectID: "123123project"
        applicationCredentialsJSON: "YOUR_JSON"
        bucket: "heartex-example-bucket-123456"
```
  </div>
</div>



## Set up Microsoft Azure 