---
title: Sync data from external storage
short: Add project storage 
type: guide
tier: all
order: 151
order_enterprise: 151
meta_title: Cloud and External Storage Integration
meta_description: "Label Studio Documentation for integrating Amazon AWS S3, Google Cloud Storage, Microsoft Azure, Redis, and local file directories with Label Studio."
section: "Import & Export"

---

Integrate popular cloud and external storage systems with Label Studio to collect new items uploaded to the buckets, containers, databases, or directories and return the annotation results so that you can use them in your machine learning pipelines.

Set up the following cloud and other storage systems with Label Studio:
- [Amazon S3](#Amazon-S3)
- [Google Cloud Storage](#Google-Cloud-Storage)
- [Microsoft Azure Blob storage - Account Key](#Microsoft-Azure-Blob-storag-Account-Key)
- [Microsoft Azure Blob storage - Service Principal](#Microsoft-Azure-Blob-storage-Service-Principal)
- [Redis database](#Redis-database)
- [Local storage](#Local-storage) <div class="enterprise-only">(for On-prem only)</div>

## Troubleshooting

When working with an external cloud storage connection, keep the following in mind:

* Label Studio doesn’t import the data stored in the bucket, but instead creates *references* to the objects. Therefore, you must have full access control on the data to be synced and shown on the labeling screen.
* Sync operations with external buckets only goes one way. It either creates tasks from objects on the bucket (Source storage) or pushes annotations to the output bucket (Target storage). Changing something on the bucket side doesn’t guarantee consistency in results.
* We recommend using a separate bucket folder for each Label Studio project.

For more troubleshooting information, see [Troubleshooting Import, Export, & Storage](https://support.humansignal.com/hc/en-us/sections/16982163062029-Import-Export-Storage) in the HumanSignal support center. 

## How external storage connections and sync work

You can add source storage connections to sync data from an external source to a Label Studio project, and add target storage connections to sync annotations from Label Studio to external storage. Each source and target storage setup is project-specific. You can connect multiple buckets, containers, databases, or directories as source or target storage for a project. 

### Source storage

Label Studio does not automatically sync data from source storage. If you upload new data to a connected cloud storage bucket, sync the storage connection using the UI to add the new labeling tasks to Label Studio without restarting. You can also use the API to set up or sync storage connections. See [Label Studio API](https://api.labelstud.io/api-reference/introduction/getting-started) and locate the relevant storage connection type. 

Task data synced from cloud storage is not stored in Label Studio. Instead, the data is accessed using a URL. You can also secure access to cloud storage using cloud storage credentials. For details, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

#### Source storage permissions

* If you enable the "Treat every bucket object as a source file" option, Label Studio backend will only need LIST permissions and won't download any data from your buckets.

* If you disable this option in your storage settings, Label Studio backend will require GET permissions to read JSON files and convert them to Label Studio tasks. 

When your users access labeling, the backend will attempt to resolve URI (e.g., s3://) to URL (https://) links. URLs will be returned to the frontend and loaded by the user's browser. To load these URLs, the browser will require HEAD and GET permissions from your Cloud Storage. The HEAD request is made at the beginning and allows the browser to determine the size of the audio, video, or other files. The browser then makes a GET request to retrieve the file body.

#### Source storage Sync and URI resolving

Source storage functionality can be divided into two parts:
* Sync - when Label Studio scans your storage and imports tasks from it.
* URI resolving - when the Label Studio backend requests Cloud Storage to resolve URI links (e.g., `s3://bucket/1.jpg`) into HTTPS (`https://aws.amazon.com/bucket/1.jpg`). This way, user's browsers are able to load media. 

<img src="/images/source-cloud-storages.png" class="make-intense-zoom">

#### Treat every bucket object as a source file

Label Studio Source Storages feature an option called "Treat every bucket object as a source file." This option enables two different methods of loading tasks into Label Studio.

###### Off

When disabled, tasks in JSON format can be loaded directly from storage buckets into Label Studio. This approach is particularly helpful when dealing with complex tasks that involve multiple media sources.

<img src="/images/source-storages-treat-off.png" class="make-intense-zoom">

###### On

When enabled, Label Studio automatically lists files from the storage bucket and constructs tasks. This is only possible for simple labeling tasks that involve a single media source (such as an image, text, etc.).* 

<img src="/images/source-storages-treat-on.png" class="make-intense-zoom">


#### One Task - One JSON File 

If you plan to load JSON tasks from the Source Storage (`Treat every bucket object as a source file = No`), you must place only one task as the **dict** per one JSON file. Otherwise, Label Studio will not load your data properly.

{% details <b>Example with tasks in separate JSON files</b> %}


`task_01.json`
```
{
  "image": "s3://bucket/1.jpg",
  "text": "opossums are awesome"
}
```

`task_02.json`
```
{
  "image": "s3://bucket/2.jpg",
  "text": "cats are awesome"
}
```

{% enddetails %}

<br>

{% details <b>Example with tasks, annotations and predictions in separate JSON files</b> %}

`task_with_predictions_and_annotations_01.json`
```
{
    "data": {
        "image": "s3://bucket/1.jpg",
        "text": "opossums are awesome"
    },
    "annotations": [...],  
    "predictions": [...]
}
```

`task_with_predictions_and_annotations_02.json`
```
{
    "data": {
      "image": "s3://bucket/2.jpg",
      "text": "cats are awesome"
    }
    "annotations": [...],  
    "predictions": [...]
}
```

{% enddetails %}

<br>

{% details <b>Python script to split a single JSON file with multiple tasks</b> %}

 Python script to split a single JSON file containing multiple tasks into separate JSON files, each containing one task:

```python
import sys
import json

input_json = sys.argv[1]
with open(input_json) as inp:
    tasks = json.load(inp)

for i, v in enumerate(tasks):
    with open(f'task_{i}.json', 'w') as f:
        json.dump(v, f)
```

{% enddetails %}


### Target storage

When annotators click **Submit** or **Update** while labeling tasks, Label Studio saves annotations in the Label Studio database. 

If you configure target storage, annotations are sent to target storage after you click **Sync** for the configured target storage connection. The target storage receives a JSON-formatted export of each annotation. See [Label Studio JSON format of annotated tasks](export.html#Label-Studio-JSON-format-of-annotated-tasks) for details about how exported tasks appear in  target storage.

You can also delete annotations in target storage when they are deleted in Label Studio. See [Set up target storage connection in the Label Studio UI](storage.html#Set-up-target-storage-connection-in-the-Label-Studio-UI) for more details.

#### Target storage permissions

To use this type of storage, you must have PUT permission, and DELETE permission is optional.


## Amazon S3

Connect your [Amazon S3](https://aws.amazon.com/s3/) bucket to Label Studio to retrieve labeling tasks or store completed annotations. 

For details about how Label Studio secures access to cloud storage, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

### Configure access to your S3 bucket
Before you set up your S3 bucket or buckets with Label Studio, configure access and permissions. These steps assume that you're using the same AWS role to manage both source and target storage with Label Studio. If you only use S3 for source storage, Label Studio does not need PUT access to the bucket. 

1. Enable programmatic access to your bucket. [See the Amazon Boto3 configuration documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration) for more on how to set up access to your S3 bucket. 

!!! note 
    A session token is only required in case of temporary security credentials. See the AWS Identity and Access Management documentation on [Requesting temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html). 

2. Assign the following role policy to an account you set up to retrieve source tasks and store annotations in S3, replacing `<your_bucket_name>` with your bucket name:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::<your_bucket_name>",
                "arn:aws:s3:::<your_bucket_name>/*"
            ]
        }
    ]
}
```

!!! note 
    `"s3:PutObject"` is only needed for target storage connections, and `"s3:DeleteObject"` is only needed for target storage connections in Label Studio Enterprise where you want to allow deleted annotations in Label Studio to also be deleted in the target S3 bucket.  
3. Set up cross-origin resource sharing (CORS) access to your bucket, using a policy that allows GET access from the same host name as your Label Studio deployment. See [Configuring cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html) in the Amazon S3 User Guide. Use or modify the following example:
```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3000
    }
]
```


### Set up connection in the Label Studio UI
After you [configure access to your S3 bucket](#Configure-access-to-your-S3-bucket), do the following to set up Amazon S3 as a data source connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Amazon S3** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the S3 bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Region Name** field, specify the AWS region name. For example `us-east-1`.
    - (Optional) In the **S3 Endpoint** field, specify an S3 endpoint if you want to override the URL created by S3 to access your bucket.
    - In the **Access Key ID** field, specify the access key ID of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Secret Access Key** field, specify the secret key of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Session Token** field, specify a session token of the temporary security credentials for an AWS account with access to your S3 bucket.
    - (Optional) Enable **Treat every bucket object as a source file** if your bucket contains BLOB storage files such as JPG, MP3, or similar file types. This setting creates a URL for each bucket object to use for labeling. Leave this option disabled if you have multiple JSON files in the bucket with one task per JSON file.
    - (Optional) Enable **Recursive scan** to perform recursive scans over the bucket contents if you have nested folders in your S3 bucket.
    - Choose whether to disable **Use pre-signed URLs**. 
        - All s3://... links will be resolved on the fly and converted to https URLs, if this option is on. 
        - All s3://... objects will be preloaded into Label Studio tasks as base64 codes, if this option is off. It's not recommended way, because Label Studio task payload will be huge and UI will slow down. Also it requires GET permissions from your storage. 
    - Adjust the counter for how many minutes the pre-signed URLs are valid.
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/s-3/sync).

### Set up target storage connection in the Label Studio UI
After you [configure access to your S3 bucket](#Configure-access-to-your-S3-bucket), do the following to set up Amazon S3 as a target storage connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Target Storage**.  
4. In the dialog box that appears, select **Amazon S3** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the S3 bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining parameters:
    - In the **Region Name** field, specify the AWS region name. For example `us-east-1`.
    - (Optional) In the **S3 Endpoint** field, specify an S3 endpoint if you want to override the URL created by S3 to access your bucket.
    - In the **Access Key ID** field, specify the access key ID of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Secret Access Key** field, specify the secret key of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Session Token** field, specify a session token of the temporary security credentials for an AWS account with access to your S3 bucket.
    - <div class="enterprise-only">(Optional) Enable **Can delete objects from storage** if you want to delete annotations stored in the S3 bucket when they are deleted in Label Studio. The storage credentials associated with the bucket must include the ability to delete bucket objects. Leave disabled to not take any action on annotations if they are deleted in Label Studio. </div>
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync export storage](https://api.labelstud.io/api-reference/api-reference/export-storage/s-3/sync).

<div class="enterprise-only">

###  Set up an S3 connection with IAM role access

If you want to use a revocable method to grant Label Studio access to your Amazon S3 bucket, use an IAM role and its temporary security credentials instead of an access key ID and secret. This added layer of security is only available in Label Studio Enterprise. For more details about security in Label Studio and Label Studio Enterprise, see [Secure Label Studio](security.html).

#### Set up an IAM role in Amazon AWS
Set up an IAM role in Amazon AWS to use with Label Studio.

1. In the Label Studio UI, open the **Organization** page to get an `External ID` to use for the IAM role creation in Amazon AWS. You must be an administrator to view the Organization page.
2. Follow the [Amazon AWS documentation to create an IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user.html) in your AWS account. <br/>Make sure to require an external ID and do not require multi-factor authentication when you set up the role. Select an existing permissions policy, or create one that allows programmatic access to the bucket.
3. Create a trust policy using the external ID. Use the following example: 
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::490065312183:user/rw_bucket"
        ]
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": [
            "<YOUR-ORG-ExternalId>"
          ]
        }
      }
    }
  ]
}
```
4. After you create the IAM role, note the Amazon Resource Name (ARN) of the role. You need it to set up the S3 source storage in Label Studio.
5. Assign role policies to the role to allow it to access your S3 bucket. Replace `<your_bucket_name>` with your S3 bucket name. Use the following role policy for S3 source storage:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
            ],
            "Resource": [
                "arn:aws:s3:::<your_bucket_name>",
                "arn:aws:s3:::<your_bucket_name>/*"
            ]
        }
    ]
}
```
Use the following role policy for S3 target storage:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::<your_bucket_name>",
                "arn:aws:s3:::<your_bucket_name>/*"
            ]
        }
    ]
}
```

!!! note 
    `"s3:DeleteObject"` is only needed for target storage connections where you want deleted annotations in Label Studio to also be deleted in the target S3 bucket.  


For more details about using an IAM role with an external ID to provide access to a third party (Label Studio), see the Amazon AWS documentation [How to use an external ID when granting access to your AWS resources to a third party](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html).

#### Create the connection to S3 in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Amazon S3 (IAM role access)** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the S3 bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Region Name** field, specify the AWS region name. For example `us-east-1`.
    - In the **S3 Endpoint** field, specify an S3 endpoint if you want to override the URL created by S3 to access your bucket.
    - In the **Role ARN** field, specify the Amazon Resource Name (ARN) of the IAM role that you created to grant access to Label Studio.
    - In the **External ID** field, specify the external ID that identifies Label Studio to your AWS account. You can find the external ID on your **Organization** page.
    - Enable **Treat every bucket object as a source file** if your bucket contains BLOB storage files such as JPG, MP3, or similar file types. This setting creates a URL for each bucket object to use for labeling. Leave this option disabled if you have multiple JSON files in the bucket with one task per JSON file.
    - Enable **Recursive scan** to perform recursive scans over the bucket contents if you have nested folders in your S3 bucket.
    - Choose whether to disable **Use pre-signed URLs**. If your tasks contain s3://... links, they must be pre-signed in order to be displayed in the browser.
    - Adjust the counter for how many minutes the pre-signed URLs are valid.
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/s-3/sync).

#### Create a target storage connection to S3 in the Label Studio UI
In the Label Studio UI, do the following to set up a target storage connection to save annotations in an S3 bucket with IAM role access set up:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Target Storage**.  
4. In the dialog box that appears, select **Amazon S3 (IAM role access)** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the S3 bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining parameters:
    - In the **Region Name** field, specify the AWS region name. For example `us-east-1`.
    - In the **S3 Endpoint** field, specify an S3 endpoint if you want to override the URL created by S3 to access your bucket.
    - In the **Role ARN** field, specify the Amazon Resource Name (ARN) of the IAM role that you created to grant access to Label Studio.
    - In the **External ID** field, specify the external ID that identifies Label Studio to your AWS account. You can find the external ID on your **Organization** page.
    - (Optional) Enable **Can delete objects from storage** if you want to delete annotations stored in the S3 bucket when they are deleted in Label Studio. The storage credentials associated with the bucket must include the ability to delete bucket objects. Leave disabled to not take any action on annotations if they are deleted in Label Studio.
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync export storage](https://api.labelstud.io/api-reference/introduction/getting-started).

</div>

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_s3_create) then [sync the import storage](/api#operation/api_storages_s3_sync_create).
- See [Create export storage](/api#operation/api_storages_export_s3_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_s3_sync_create).

## Google Cloud Storage

Dynamically import tasks and export annotations to Google Cloud Storage (GCS) buckets in Label Studio. For details about how Label Studio secures access to cloud storage, see [Secure access to cloud storage](security.html/#Secure-access-to-cloud-storage).

### Prerequisites

To connect your [GCS](https://cloud.google.com/storage) bucket with Label Studio, set up the following:
- **Enable programmatic access to your bucket.** See [Cloud Storage Client Libraries](https://cloud.google.com/storage/docs/reference/libraries) in the Google Cloud Storage documentation for how to set up access to your GCS bucket.
- **Set up authentication to your bucket.** Your account must have the **Service Account Token Creator** and **Storage Object Viewer** roles and **storage.buckets.get** access permission. See [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) and [IAM permissions for Cloud Storage](https://cloud.google.com/storage/docs/access-control/iam-permissions) in the Google Cloud Storage documentation. 
- If you're using a service account to authorize access to the Google Cloud Platform, make sure to activate it. See [gcloud auth activate-service-account](https://cloud.google.com/sdk/gcloud/reference/auth/activate-service-account) in the Google Cloud SDK: Command Line Interface documentation.
- Set up cross-origin resource sharing (CORS) access to your bucket, using a policy that allows GET access from the same host name as your Label Studio deployment. See [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors#configure-cors-bucket) in the Google Cloud User Guide. Use or modify the following example:
```shell
echo '[
   {
      "origin": ["*"],
      "method": ["GET"],
      "responseHeader": ["Content-Type","Access-Control-Allow-Origin"],
      "maxAgeSeconds": 3600
   }
]' > cors-config.json
```

Replace `YOUR_BUCKET_NAME` with your actual bucket name in the following command to update CORS for your bucket:
```shell
gsutil cors set cors-config.json gs://YOUR_BUCKET_NAME
```

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Google Cloud Storage** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the GCS bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining optional parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - Enable **Treat every bucket object as a source file** if your bucket contains BLOB storage files such as JPG, MP3, or similar file types. This setting creates a URL for each bucket object to use for labeling, such as `gs://my-gcs-bucket/image.jpg`. Leave this option disabled if you have multiple JSON files in the bucket with one task per JSON file.
    - Choose whether to disable **Use pre-signed URLs**. If your tasks contain gs://... links, they must be pre-signed in order to be displayed in the browser.
    - Adjust the counter for how many minutes the pre-signed URLs are valid.
8. In the **Google Application Credentials** field, add a JSON file with the GCS credentials you created to manage authentication for your bucket. You can also use the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to specify this file. For example:
```bash
  export GOOGLE_APPLICATION_CREDENTIALS=json-file-with-GCP-creds-23441-8f8sd99vsd115a.json
  ```
9. Click **Add Storage**.
10. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_gcs_sync_create).

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_gcs_create) then [sync the import storage](/api#operation/api_storages_gcs_sync_create). 
- See [Create export storage](/api#operation/api_storages_export_gcs_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_gcs_sync_create).

##  Microsoft Azure Blob storage - Account Key

Connect your [Microsoft Azure Blob storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) container with Label Studio. For details about how Label Studio secures access to cloud storage, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

### Prerequisites
You must set two environment variables in Label Studio to connect to Azure Blob storage:
- `AZURE_BLOB_ACCOUNT_NAME` to specify the name of the storage account.
- `AZURE_BLOB_ACCOUNT_KEY` to specify the secret key for the storage account.

Configure the specific Azure Blob container that you want Label Studio to use in the UI. In most cases involving CORS issues, the GET permission (*/GET/*/Access-Control-Allow-Origin/3600) is necessary within the Resource Sharing tab:

<img src="/images/azure-storage-cors.png" class="gif-border">

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Microsoft Azure** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the Azure Blob container, and if relevant, the container prefix to specify an internal folder or container.
7. Adjust the remaining optional parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Account Name** field, specify the account name for the Azure storage. You can also set this field as an environment variable,`AZURE_BLOB_ACCOUNT_NAME`.
    - In the **Account Key** field, specify the secret key to access the storage account. You can also set this field as an environment variable,`AZURE_BLOB_ACCOUNT_KEY`.
    - Enable **Treat every bucket object as a source file** if your bucket contains BLOB storage files such as JPG, MP3, or similar file types. This setting creates a URL for each bucket object to use for labeling, for example `azure-blob://container-name/image.jpg`. Leave this option disabled if you have multiple JSON files in the bucket with one task per JSON file. 
    - Choose whether to disable **Use pre-signed URLs**, or [shared access signatures](https://docs.microsoft.com/en-us/rest/api/storageservices/delegate-access-with-shared-access-signature). If your tasks contain azure-blob://... links, they must be pre-signed in order to be displayed in the browser.    
    - Adjust the counter for how many minutes the shared access signatures are valid.
8. Click **Add Storage**.
9. Repeat these steps for **Target Storage** to sync completed data annotations to a container.

After adding the storage, click **Sync** to collect tasks from the container, or make an API call to [sync import storage](/api#operation/api_storages_azure_sync_create).

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_azure_create) then [sync the import storage](/api#operation/api_storages_azure_sync_create). 
- See [Create export storage](/api#operation/api_storages_export_azure_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_azure_sync_create).


##  Microsoft Azure Blob storage - Service Principal

You can connect your [Microsoft Azure Blob storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) container with Label Studio with a service principal authentication. Service Principal can provide more granular Access Controls for your organization. For details about how Label Studio secures access to cloud storage, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

### Prerequisites
You must set two environment variables in Label Studio to connect to Azure Blob storage:
- `AZURE_BLOB_ACCOUNT_NAME` to specify the name of the storage account.
- `AZURE_CLIENT_ID` to specify the client id for the service principal.
- `AZURE_TENANT_ID` to specify the tenant id for the service principal.
- `AZURE_CLIENT_SECRET` to specify the secret id for the service principal.


Configure the specific Azure Blob container that you want Label Studio to use in the UI. In most cases involving CORS issues, the GET permission (*/GET/*/Access-Control-Allow-Origin/3600) is necessary within the Resource Sharing tab:

<img src="/images/azure-storage-cors.png" class="gif-border">


###### Create a Service Principal

1. Create a service principal via Azure docs [How to Create a Service Principal](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal).

###### Create a Service Principal Secret (Client Secret)
1. Create a new client secret by following the steps below
2. Browse to Identity > Applications > App registrations, then select your application.
3. Select Certificates & secrets.
4. Select Client secrets, and then select New client secret.
Provide a description of the secret, and a duration.
5. Select Add.

###### Create the Contributor Role Based Access Cotnrol

When you create a storage account, assign a Contributor role to your service principal - read more about [role assignment steps](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps).


### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.
4. In the dialog box that appears, select **Microsoft Azure** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the Azure Blob container, and if relevant, the container prefix to specify an internal folder or container.
7. Adjust the remaining optional parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Account Name** field, specify the account name for the Azure storage. You can also set this field as an environment variable,`AZURE_BLOB_ACCOUNT_NAME`.
    - In the **Client ID** field, specify the Client ID of the service principal to access the storage account. You can also set this field as an environment variable,`AZURE_CLIENT_ID`.
    - In the **Tenant ID** field, specify the Tenant ID of the service principal to access the storage account. You can also set this field as an environment variable,`AZURE_TENANT_ID`.
    - In the **Client Secret** field, specify the Client Secret of the service principal to access the storage account. You can also set this field as an environment variable,`AZURE_CLIENT_SECRET`.
    - Enable **Treat every bucket object as a source file** if your bucket contains BLOB storage files such as JPG, MP3, or similar file types. This setting creates a URL for each bucket object to use for labeling, for example `azure-spi://container-name/image.jpg`. Leave this option disabled if you have multiple JSON files in the bucket with one task per JSON file.
    - Choose whether to disable **Use pre-signed URLs**, or [shared access signatures](https://docs.microsoft.com/en-us/rest/api/storageservices/delegate-access-with-shared-access-signature). If your tasks contain azure-spi://... links, they must be pre-signed in order to be displayed in the browser.
    - Adjust the counter for how many minutes the shared access signatures are valid.
8. Click **Add Storage**.
9. Repeat these steps for **Target Storage** to sync completed data annotations to a container.

After adding the storage, click **Sync** to collect tasks from the container, or make an API call to [sync import storage](/api#operation/api_storages_azure_spi_sync_create).

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API.
- See [Create new import storage](/api#operation/api_storages_azure_spi_create) then [sync the import storage](/api#operation/api_storages_azure_spi_sync_create).
- See [Create export storage](/api#operation/api_storages_export_azure_spi_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_azure_spi_sync_create).

## Redis database

You can also store your tasks and annotations in a [Redis database](https://redis.io/). You must store the tasks and annotations in different databases. You might want to use a Redis database if you find that relying on a file-based cloud storage connection is slow for your datasets. 

Currently, this configuration is only supported if you host the Redis database in the default mode, with the default IP address. 

Label Studio does not manage the Redis database for you. See the [Redis Quick Start](https://redis.io/topics/quickstart) for details about hosting and managing your own Redis database. Because Redis is an in-memory database, data saved in Redis does not persist. To make sure you don't lose data, set up [Redis persistence](https://redis.io/topics/persistence) or use another method to persist the data, such as using Redis in the cloud with [Microsoft Azure](https://azure.microsoft.com/en-us/services/cache/) or [Amazon AWS](https://aws.amazon.com/redis/).

### Task format for Source Redis Storage

Label Studio only supports string values for Redis databases, which should represent Label Studio tasks in JSON format. 

For example:

```
'ls-task-1': '{"image": "http://example.com/1.jpg"}'
'ls-task-2': '{"image": "http://example.com/2.jpg"}'
...
```

```
> redis-cli -n 1
127.0.0.1:6379[1]> SET ls-task-1 '{"image": "http://example.com/1.jpg"}'
OK
127.0.0.1:6379[1]> GET ls-task-1
"{\"image\": \"http://example.com/1.jpg\"}"
127.0.0.1:6379[1]> TYPE ls-task-1
string
```


### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.   
4. In the dialog box that appears, select **Redis Database** as the storage type.
5. Update the Redis configuration parameters:
    - In the **Path** field, specify the path to the database. Used as the keys prefix, values under this path are scanned for tasks.
    - In the **Password** field, specify the server password. 
    - In the **Host** field, specify the IP of the server hosting the database, or `localhost`. 
    - In the **Port** field, specify the port that you can use to access the database. 
    - In the **File Filter Regex** field, specify a regular expression to filter database objects. Use `.*` to collect all objects.
    - Enable **Treat every bucket object as a source file** if your database contains files such as JPG, MP3, or similar file types. This setting creates a URL for each database object to use for labeling. Leave this option disabled if you have multiple JSON files in the database, with one task per JSON file. 
8. Click **Add Storage**.
9. Repeat these steps for **Target Storage** to sync completed data annotations to a database.

After adding the storage, click **Sync** to collect tasks from the database, or make an API call to [sync import storage](/api#operation/api_storages_redis_sync_create).


### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_redis_create) then [sync the import storage](/api#operation/api_storages_redis_sync_create). 
- See [Create export storage](/api#operation/api_storages_export_redis_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_redis_sync_create).


## Local storage

<div class="enterprise-only">

!!! note
    Local Storages are available for On-premise deployments only. The cloud version (app.heartex.com) doesn't support them.
  
</div>
  
If you have local files that you want to add to Label Studio from a specific directory, you can set up a specific local directory on the machine where LS is running as source or target storage. Label Studio steps through the directory recursively to read tasks.

### Prerequisites
Add these variables to your environment setup:
- `LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true`
- `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/home/user` (or `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=C:\\data\\media` for Windows).

Without these settings, Local storage and URLs in tasks that point to local files won't work. Keep in mind that serving data from the local file system can be a **security risk**. See [Set environment variables](start.html#Set_environment_variables) for more about using environment variables.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.
  
<img src="/images/local-storage-settings.png" alt="Screenshot of the storage settings modal described in the preceding steps." class="gif-border">
  
4. In the dialog box that appears, select **Local Files** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify an **Absolute local path** to the directory with your files. The local path must be an absolute path and include the `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` value. 

    For example, if `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/home/user`, then your local path must be `/home/user/dataset1`. For more about that environment variable, see [Run Label Studio on Docker and use local storage](start.html#Run_Label_Studio_on_Docker_and_use_local_storage).  

!!! note
    If you are using Windows, ensure that you use backslashes when entering your **Absolute local path**.  

7. (Optional) In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
8. (Optional) Toggle **Treat every bucket object as a source file**. 
   - Enable this option if you want to create Label Studio tasks from media files automatically, such as JPG, MP3, or similar file types. Use this option for labeling configurations with one source tag.
   - Disable this option if you want to import tasks in Label Studio JSON format directly from your storage. Use this option for complex labeling configurations with HyperText or multiple source tags.    
9. Click **Add Storage**.
10. Repeat these steps for **Add Target Storage** to use a local file directory for exporting.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_localfiles_sync_create).

### Tasks with local storage file references 
In cases where your tasks have multiple or complex input sources, such as multiple object tags in the labeling config or a HyperText tag with custom data values, you must prepare tasks manually. 

In those cases, you have to repeat all stages above to create local storage, but skip *optional* stages. Your **Absolute local path** have to lead to directory with files (not tasks) that you want to include by task, it also can contain other directories or files, you will specified them inside task. 

Differences with instruction above: 
- **7. File Filter Regex** - stay empty (because you will specify it inside tasks)
- **8. Treat every bucket object as a source file** - switch off (because you will specify it inside tasks)

Your window will look like this:
<img src="/images/local-storage-settings2.png" alt="Screenshot of the local storage settings for user task." class="gif-border">

Click **Add Storage**, but not use synchronization (don't touch button **Sync Storage**) after the storage creation, to avoid automatic task creation from storage files.

When referencing your files within a task, adhere to the following guidelines:
* "Absolute local path" must be a sub-directory of LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT (see [6](https://labelstud.io/guide/storage.html#Set-up-connection-in-the-Label-Studio-UI-4)). 
* All file paths must begin with `/data/local-files/?d=`.
* In the following example, the first directory is `dataset1`. For instance, if you have mixed data types in tasks, including 
    - audio files `1.wav`, `2.wav` within an `audio` folder and 
    - image files `1.jpg`, `2.jpg` within an `images` folder, 
  construct the paths as follows:

```
[{
 "id": 1,
 "data": {
    "audio": "/data/local-files/?d=dataset1/audio/1.wav",
    "image": "/data/local-files/?d=dataset1/images/1.jpg"
  }
},
{
 "id": 2,
 "data": {
    "audio": "/data/local-files/?d=dataset1/audio/2.wav",
    "image": "/data/local-files/?d=dataset1/images/2.jpg"
  }
}]
```

There are several ways to add your custom task: API, web interface, another storage. The simplest one is to use **Import** button on the Data Manager page. Drag and drop your json file inside the window, then click the blue **Import** button .

<img class="gif-border" src="/images/upload-task.png" alt="Task upload via web." width="100%">


### Local Storage with Custom Task Format
This video tutorial demonstrates how to setup Local Storage from scratch and import json tasks in a complex task format that are linked to the Local Storage files.

<iframe class="video-border" width="100%" height="400vh" src="https://www.youtube.com/embed/lo6ncQajbdU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>  

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_localfiles_create) then [sync the import storage](/api#operation/api_storages_localfiles_sync_create). 
- See [Create export storage](/api#operation/api_storages_export_localfiles_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_localfiles_sync_create).

### Set up local storage with Docker
If you're using Label Studio in Docker, you need to mount the local directory that you want to access as a volume when you start the Docker container. See [Run Label Studio on Docker and use local storage](start.html#Run-Label-Studio-on-Docker-and-use-local-storage).


### Troubleshooting cloud storage

See [Troubleshooting Import, Export, and Storage](https://support.humansignal.com/hc/en-us/sections/16982163062029-Import-Export-Storage) in the HumanSignal support center. 
