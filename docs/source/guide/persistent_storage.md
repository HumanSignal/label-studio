---
title: Set up persistent storage
type: guide
tier: all
order: 87
order_enterprise: 87
meta_title: Set up persistent storage with Label Studio
meta_description: Configure persistent storage with Label Studio hosted in the cloud to store uploaded data such as task data, user images, and more.
section: "Install & Setup"
---

If you host Label Studio in the cloud, you want to set up persistent storage for uploaded task data, user images, and more in the same cloud service as your deployment.

Follow the steps relevant for your deployment. If you use Docker Compose, select the cloud service you want to use as persistent storage:
* [Set up Amazon S3](#Set-up-Amazon-S3) for Label Studio deployments in Amazon Web Services (AWS).
* [Set up Google Cloud Storage (GCS)](#Set-up-Google-Cloud-Storage) for Label Studio deployments in Google Cloud Platform.
* [Set up Microsoft Azure Storage](#Set-up-Microsoft-Azure-Storage) for Label Studio deployments in Microsoft Azure.

## Set up Amazon S3

Set up Amazon S3 as the persistent storage for Label Studio hosted in AWS or using Docker Compose.

### Create an S3 bucket

Start by [creating an S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html) following the Amazon Simple Storage Service User Guide steps.

!!! note 
    If you want to secure the data stored in the S3 bucket at rest, you can [set up default server-side encryption for Amazon S3 buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html) following the steps in the Amazon Simple Storage Service User Guide.

### Configure CORS for the S3 bucket

!!! note 
    In the case if you're going to use direct file upload feature and store media files like audio, video, csv you should complete this step.

Set up Cross-Origin Resource Sharing (CORS) access to your bucket. See [Configuring cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html) in the Amazon S3 User Guide. Use or modify the following example:
```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "*"
    ],
    "ExposeHeaders": [
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Configure the S3 bucket
After you create an S3 bucket, set up the necessary IAM permissions to grant Label Studio access to your bucket. There are four ways that you can manage access to your S3 bucket:
- Set up an **IAM role** with an OIDC provider (**recommended**).
- Use **access keys**.
- Set up an **IAM role** without an OIDC provider.
- Use **access keys with Docker Compose**.

Select the relevant tab and follow the steps for your desired option:

<div class="code-tabs">
  <div data-name="IAM role (OIDC)">

!!! note 
    To set up an IAM role using this method, you must have a configured and provisioned OIDC provider for your cluster. See [Create an IAM OIDC provider for your cluster](https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html) in the Amazon EKS User Guide.


1. Follow the steps to [create an IAM role and policy for your service account](https://docs.aws.amazon.com/eks/latest/userguide/create-service-account-iam-policy-and-role.html) in the Amazon EKS User Guide.
2. Use the following IAM Policy, replacing `<YOUR_S3_BUCKET>` with the name of your bucket:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR_S3_BUCKET>"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR_S3_BUCKET>/*"
      ]
    }
  ]
}
```

3. Create an **IAM role as a Web Identity** using the cluster OIDC provider as the identity provider:
   - Create a new **Role** from your IAM Console.
   - Select the **Web identity** Tab.
   - In the **Identity Provider** drop-down, select the OpenID Connect provider URL of your EKS and `sts.amazonaws.com` as the Audience.
   - Attach the newly created permission to the Role and name it.
   - Retrieve the Role arn for the next step.
4. After you create an IAM role, add it as an annotation in your `ls-values.yaml` file.
   Optionally, you can choose a folder by specifying `folder` (default is `""` or omit this argument):
```yaml
global:
  persistence:
    enabled: true
    type: s3
    config:
      s3:
        bucket: "<YOUR_BUCKET_NAME>"
        region: "<YOUR_BUCKET_REGION>"
        folder: ""
app:
  serviceAccount:
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME_FROM_STEP_3>

rqworker:
  serviceAccount:
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME_FROM_STEP_3>
```

  </div>

  <div data-name="Access keys">

1. Create an IAM user with **Programmatic access**. See [Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) in the AWS Identity and Access Management User Guide.
2. When creating the user, for the **Set permissions** option, choose to **Attach existing policies directly**.
3. Select **Create policy** and attach the following policy, replacing `<YOUR_S3_BUCKET>` with the name of your bucket:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR_S3_BUCKET>"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR_S3_BUCKET>/*"
      ]
    }
  ]
}
```

4. After you create the user, save the username and access key somewhere secure.
5. Update your `ls-values.yaml` file with your newly-created access key ID and secret key as `<YOUR_ACCESS_KEY_ID>` and `<YOUR_SECRET_ACCESS_KEY>`.
   Optionally, you can choose a folder by specifying `folder` (default is `""` or omit this argument):
```yaml
global:
  persistence:
    enabled: true
    type: s3
    config:
      s3:
        accessKey: "<YOUR_ACCESS_KEY_ID>"
        secretKey: "<YOUR_SECRET_ACCESS_KEY>"
        bucket: "<YOUR_BUCKET_NAME>"
        region: "<YOUR_BUCKET_REGION>"
        folder: ""
```

!!! note 
    Optionally, you can use already existing Kubernetes secret and a key.


1. Create a Kubernetes secret with your AWS access keys:
```shell
kubectl create secret generic <YOUR_SECRET_NAME> --from-literal=accesskey=<YOUR_ACCESS_KEY_ID> --from-literal=secretkey=<YOUR_SECRET_ACCESS_KEY>
```
2. Update your `ls-values.yaml` file with your newly-created kubernetes secret:
```yaml
global:
  persistence:
    enabled: true
    type: s3
    config:
      s3:
        accessKeyExistingSecret: "<YOUR_SECRET_NAME>"
        accessKeyExistingSecretKey: "accesskey"
        secretKeyExistingSecret: "<YOUR_SECRET_NAME>"
        secretKeyExistingSecretKey: "secretkey"
        bucket: "<YOUR_BUCKET_NAME>"
        region: "<YOUR_BUCKET_REGION>"
```

  </div>

  <div data-name="IAM role (EKS node)">

To create an IAM role without using OIDC in EKS, follow these steps.

1. In the AWS console UI, go to **EKS > Clusters > `YOUR_CLUSTER_NAME` > Node Group**.
2. Select the name of `YOUR_NODE_GROUP` with Label Studio deployed.
3. On the **Details** page, locate and select the option for Node IAM Role ARN and choose to **Attach existing policies directly**.
3. Select **Create policy** and attach the following policy, replacing `<YOUR_S3_BUCKET>` with the name of your bucket:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR_S3_BUCKET>"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR_S3_BUCKET>/*"
      ]
    }
  ]
}
```

4. After you add an IAM policy, configure your `ls-values.yaml` file.
   Optionally, you can choose a folder by specifying `folder` (default is `""` or omit this argument):
```yaml
global:
  persistence:
    enabled: true
    type: s3
    config:
      s3:
        bucket: "<YOUR_BUCKET_NAME>"
        region: "<YOUR_BUCKET_REGION>"
        folder: ""
```

  </div>

  <div data-name="Docker Compose">

1. Create an IAM user with **Programmatic access**. See [Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) in the AWS Identity and Access Management User Guide.
2. When creating the user, for the **Set permissions** option, choose to **Attach existing policies directly**.
3. Select **Create policy** and attach the following policy, replacing `<YOUR_S3_BUCKET>` with the name of your bucket:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR_S3_BUCKET>"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR_S3_BUCKET>/*"
      ]
    }
  ]
}
```

4. After you create the user, save the username and access key somewhere secure.
5. Update your `env.list` file, replacing `<YOUR_ACCESS_KEY_ID>` and `<YOUR_SECRET_ACCESS_KEY>` with your newly-created access key ID and secret key. Optionally, you can specify a folder using `STORAGE_AWS_FOLDER` (default is `""` or omit this argument):
```shell
STORAGE_TYPE=s3
STORAGE_AWS_ACCESS_KEY_ID="<YOUR_ACCESS_KEY_ID>"
STORAGE_AWS_SECRET_ACCESS_KEY="<YOUR_SECRET_ACCESS_KEY>"
STORAGE_AWS_BUCKET_NAME="<YOUR_BUCKET_NAME>"
STORAGE_AWS_REGION_NAME="<YOUR_BUCKET_REGION>"
STORAGE_AWS_FOLDER=""
```

  </div>
</div>

## Set up Google Cloud Storage

Set up Google Cloud Storage (GCS) as the persistent storage for Label Studio hosted in Google Cloud Platform (GCP) or Docker Compose.

### Create a GCS bucket

1. Start by creating a bucket. See [Creating storage buckets](https://cloud.google.com/storage/docs/creating-buckets) in the Google Cloud Storage guide. For example, a bucket called `heartex-example-bucket-123456`.
2. When choosing the [access control method for the bucket](https://cloud.google.com/storage/docs/access-control), choose **uniform access control**.
3. Create an IAM Service Account. See [Creating and managing service accounts](https://cloud.google.com/iam/docs/creating-managing-service-accounts) in the Google Cloud Storage guide.
4. Select the predefined **Storage Object Admin** IAM role to add to the service account so that the account can create, access, and delete objects in the bucket.
5. Add a condition to the role that restricts the role to access only objects that belong to the bucket you created. You can add a condition in one of two ways:
    - Select **Add Condition** when setting up the service account IAM role, then use the **Condition Builder** to specify the following values:
      - Condition type: `Name`
      - Operator: `Starts with`
      - Value: `projects/_/buckets/heartex-example-bucket-123456`
    - Or, **use a Common Expression Language** (CEL) to specify an IAM condition. For example, set the following: `resource.name.startsWith('projects/_/buckets/heartex-example-bucket-123456')`. See [CEL for Conditions in Overview of IAM Conditions](https://cloud.google.com/iam/docs/conditions-overview#cel) in the Google Cloud Storage guide.

### Configure CORS for the GCS bucket

!!! note 
    In the case if you're going to use direct file upload feature and store media files like audio, video, csv you should complete this step.

Set up CORS access to your bucket. See [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors#configure-cors-bucket) in the Google Cloud User Guide. Use or modify the following example:
```shell
echo '[
   {
      "origin": ["*"],
      "method": ["GET","PUT","POST","DELETE","HEAD"],
      "responseHeader": ["Content-Type","Access-Control-Allow-Origin"],
      "maxAgeSeconds": 3600
   }
]' > cors-config.json
```

Replace `YOUR_BUCKET_NAME` with your actual bucket name in the following command to update CORS for your bucket:
```shell
gsutil cors set cors-config.json gs://YOUR_BUCKET_NAME
```

### Configure the GCS bucket

You can connect Label Studio to your GCS bucket using **Workload Identity** or **Access keys**.

After you create a bucket and set up IAM permissions, connect Label Studio to your GCS bucket. There are three ways that you can connect to your bucket:
- Use Workload Identity to allow workloads in GKE to access your GCS bucket by impersonating the service account you created (**recommended**).
- Create a service account key to use the service account outside Google Cloud.
- Create a service account key to use with Docker Compose.

<div class="code-tabs">
<div data-name="Workload Identity">

!!! note 
    Make sure that Workload Identity is enabled on your GKE cluster and that you meet the necessary prerequisites. See [Using Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) in the Google Kubernetes Engine guide.

1. Set up the following environment variables, specifying the service account you created as the `GCP_SA` variable, and replacing the other references in `<>` as needed:
```shell
GCP_SA=<Service-Account-You-Created>
APP_SA="serviceAccount:<GCP_PROJECT_ID>.svc.id.goog[<K8S_NAMESPACE>/<HELM_RELEASE_NAME>-lse-app]"
WORKER_SA="serviceAccount:<GCP_PROJECT_ID>.svc.id.goog[<K8S_NAMESPACE>/<HELM_RELEASE_NAME>-lse-rqworker]"
```

2. Create an IAM policy binding between the Kubernetes service account on your cluster and the GCS service account you created, allowing the K8s service account for the Label Studio app and the related rqworkers to impersonate the other service account. From the command line, run the following:
```shell
gcloud iam service-accounts add-iam-policy-binding ${GCP_SA} \
    --role roles/iam.workloadIdentityUser \
    --member "${APP_SA}"
gcloud iam service-accounts add-iam-policy-binding ${GCP_SA} \
    --role roles/iam.workloadIdentityUser \
    --member "${WORKER_SA}"
```

3. After binding the service accounts, update your `ls-values.yaml` file to include the values for the service account and other configurations. Update the `projectID`, `bucket`, and replace the`<GCP_SERVICE_ACCOUNT>` with the relevant values for your deployment.
   Optionally, you can choose a folder by specifying `folder` (default is `""` or omit this argument):
```yaml
global:
  persistence:
    enabled: true
    type: gcs
    config:
      gcs:
        projectID: "<YOUR_PROJECT_ID>"
        bucket: "<YOUR_BUCKET_NAME>"
        folder: ""
app:
  serviceAccount:
    annotations:
      iam.gke.io/gcp-service-account: "<GCP_SERVICE_ACCOUNT>"

rqworker:
  serviceAccount:
    annotations:
      iam.gke.io/gcp-service-account: "<GCP_SERVICE_ACCOUNT>"
```

</div>
<div data-name="Service Account Key">

You can use a service account key that you create, or if you already have a Kubernetes secret and key, follow [the steps below](#Use-an-existing-Kubernetes-secret-and-key) to use those.

#### Create a new service account key
1. Create a service account key from the UI and download the JSON. Follow the steps for [Creating and managing service account keys](https://cloud.google.com/iam/docs/creating-managing-service-account-keys) in the Google Cloud Identity and Access Management guide.

2. After downloading the JSON for the service account key, update or create references to the JSON, your projectID, and your bucket in your `ls-values.yaml` file.
   Optionally, you can choose a folder by specifying `folder` (default is `""` or omit this argument):
```yaml
global:
  persistence:
    enabled: true
    type: gcs
    config:
      gcs:
        projectID: "<YOUR_PROJECT_ID>"
        applicationCredentialsJSON: "<YOUR_JSON>"
        bucket: "<YOUR_BUCKET_NAME>"
        folder: ""
```

#### Use an existing Kubernetes secret and key

1. Create a Kubernetes secret with your GCS service account JSON file, replacing `<PATH_TO_JSON>` with the path to the service account JSON file:
```shell
kubectl create secret generic <YOUR_SECRET_NAME> --from-file=key_json=<PATH_TO_JSON>
```

2. Update your `ls-values.yaml` file with your newly-created Kubernetes secret:
```yaml
global:
   persistence:
      enabled: true
      type: gcs
      config:
         gcs:
            projectID: "<YOUR_PROJECT_ID>"
            applicationCredentialsJSONExistingSecret: "<YOUR_SECRET_NAME>"
            applicationCredentialsJSONExistingSecretKey: "key_json"
            bucket: "<YOUR_BUCKET_NAME>"
```

</div>
<div data-name="Docker Compose">

1. Create a service account key from the UI and download the JSON. Follow the steps for [Creating and managing service account keys](https://cloud.google.com/iam/docs/creating-managing-service-account-keys) in the Google Cloud Identity and Access Management guide.
2. After downloading the JSON for the service account key, update or create references to the JSON, your projectID, and your bucket in your `env.list` file.
   Optionally, you can choose a folder by specifying `STORAGE_GCS_FOLDER` (default is `""` or omit this argument):
```shell
STORAGE_TYPE=gcs
STORAGE_GCS_BUCKET_NAME="<YOUR_BUCKET_NAME>"
STORAGE_GCS_PROJECT_ID="<YOUR_PROJECT_ID>"
STORAGE_GCS_FOLDER=""
GOOGLE_APPLICATION_CREDENTIALS="/opt/heartex/secrets/key.json"
```

3. Place the downloaded JSON file from step 1 in the same directory as your `env.list` file.

4. Append the following entry in `docker-compose.yml` file as the path for `app.volumes`:
```yaml
- ./service-account-file.json:/opt/heartex/secrets/key.json:ro
```

</div>
</div>


## Set up Microsoft Azure Storage

Create a Microsoft Azure Storage container to use as persistent storage with Label Studio.

### Create a Storage container

1. Create an Azure storage account. See [Create a storage account](https://docs.microsoft.com/en-us/azure/storage/common/storage-account-create?tabs=azure-portal) in the Microsoft Azure product documentation.

!!! note 
    Make sure that you set **Stock Keeping Unit (SKU)** to `Premium_LRS` and the **kind** parameter to `BlockBlobStorage`. This configuration results in storage that uses solid state drives (SSDs) rather than standard hard disk drives (HDDs). If you set this parameter to an HDD-based storage option, your instance might be too slow and could malfunction.

2. Find the generated key in the **Storage accounts > Access keys** section in the [Azure Portal](https://portal.azure.com/) or by running the following command:
```shell
az storage account keys list --account-name=${STORAGE_ACCOUNT}
```

3. Create a storage container within your storage account by following the steps to [Upload, download, and list blobs with the Azure portal](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-portal) in the Microsoft Azure product documentation, or run the following command:
```shell
az storage container create --name <YOUR_CONTAINER_NAME> \
          --account-name <YOUR_STORAGE_ACCOUNT> \
          --account-key "<YOUR_STORAGE_KEY>"
```

### Configure CORS for the Azure bucket

!!! note 
    In the case if you're going to use direct file upload feature and store media files like audio, video, csv you should complete this step.

Set up CORS access to your bucket. See [Configuring cross-origin resource sharing (CORS)](https://docs.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services#enabling-cors-for-azure-storage) in the Azure User Guide. Use or modify the following example:
```xml
<Cors>
    <CorsRule>
        <AllowedOrigins>*</AllowedOrigins>
        <AllowedMethods>GET,PUT,POST,DELETE,HEAD</AllowedMethods>
        <AllowedHeaders>x-ms-blob-content-type</AllowedHeaders>
        <ExposedHeaders>x-ms-*</ExposedHeaders>
        <MaxAgeInSeconds>3600</MaxAgeInSeconds>
    </CorsRule>
<Cors>
```

### Configure the Azure container

You can connect Label Studio to your Azure container using account keys in Kubernetes or account keys in Docker Compose. Choose the option relevant to your Label Studio deployment.

<div class="code-tabs">
  <div data-name="Kubernetes">

Update your `ls-values.yaml` file with the `YOUR_CONTAINER_NAME`, `YOUR_STORAGE_ACCOUNT`, and `YOUR_STORAGE_KEY` that you created.
Optionally, you can choose a folder by specifying `folder` (default is `""` or omit this argument):
```yaml
global:
  persistence:
    enabled: true
    type: azure
    config:
      azure:
        storageAccountName: "<YOUR_STORAGE_ACCOUNT>"
        storageAccountKey: "<YOUR_STORAGE_KEY>"
        containerName: "<YOUR_CONTAINER_NAME>"
        folder: ""
```

If you have an existing key, you can use that instead to create a Kubernetes secret.
1. Create a Kubernetes secret with your Azure access key:
```shell
kubectl create secret generic <YOUR_SECRET_NAME> --from-literal=storageaccountname=<YOUR_STORAGE_ACCOUNT> --from-literal=storageaccountkey=<YOUR_STORAGE_KEY>
```
2. Update your `ls-values.yaml` file with your newly-created Kubernetes secret:
```yaml
global:
   persistence:
      enabled: true
      type: azure
      config:
         azure:
            storageAccountNameExistingSecret: "<YOUR_SECRET_NAME>"
            storageAccountNameExistingSecretKey: "storageaccountname"
            storageAccountKeyExistingSecret: "<YOUR_SECRET_NAME>"
            storageAccountKeyExistingSecretKey: "storageaccountkey"
            containerName: "<YOUR_CONTAINER_NAME>"
```

  </div>

  <div data-name="Docker Compose">

Update your `env.list` file with the `YOUR_CONTAINER_NAME`, `YOUR_STORAGE_ACCOUNT`, and `YOUR_STORAGE_KEY` that you created.
Optionally, you can choose a folder by specifying `STORAGE_AZURE_FOLDER` (default is `""` or omit this argument):
```shell
STORAGE_TYPE=azure
STORAGE_AZURE_ACCOUNT_NAME="<YOUR_STORAGE_ACCOUNT>"
STORAGE_AZURE_ACCOUNT_KEY="<YOUR_STORAGE_KEY>"
STORAGE_AZURE_CONTAINER_NAME="<YOUR_CONTAINER_NAME>"
STORAGE_AZURE_FOLDER=""
```

  </div>
</div>
