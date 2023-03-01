---
title: Sync data from external storage
short: Cloud storage setup 
type: guide
order: 302
meta_title: Cloud and External Storage Integration
meta_description: Label Studio Documentation for integrating Amazon AWS S3, Google Cloud Storage, Microsoft Azure, Redis, and local file directories with Label Studio to collect data labeling tasks and sync annotation results into your machine learning pipelines for machine learning and data science projects.
---

Integrate popular cloud and external storage systems with Label Studio to collect new items uploaded to the buckets, containers, databases, or directories and return the annotation results so that you can use them in your machine learning pipelines.

Set up the following cloud and other storage systems with Label Studio:
- [Amazon S3](#Amazon-S3)
- [Google Cloud Storage](#Google-Cloud-Storage)
- [Microsoft Azure Blob storage](#Microsoft-Azure-Blob-storage)
- [Redis database](#Redis-database)
- [Local storage](#Local-storage)

If something goes wrong, check the [troubleshooting section](#Troubleshoot-CORS-and-access-problems). 

## How external storage connections and sync work

You can add source storage connections to sync data from an external source to a Label Studio project, and add target storage connections to sync annotations from Label Studio to external storage. Each source and target storage setup is project-specific. You can connect multiple buckets, containers, databases, or directories as source or target storage for a project. 

### Source storage

Label Studio does not automatically sync data from source storage. If you upload new data to a connected cloud storage bucket, sync the storage connection using the UI to add the new labeling tasks to Label Studio without restarting. You can also use the API to set up or sync storage connections. See [Label Studio API](/api) and locate the relevant storage connection type. 

Task data synced from cloud storage is not stored in Label Studio. Instead, the data is accessed using a URL. You can also secure access to cloud storage using cloud storage credentials. For details, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

#### Source storage permissions

* If you enable the "Treat every bucket object as a source file" option, Label Studio backend will only need LIST permissions and won't download any data from your buckets.

* If you disable this option in your storage settings, Label Studio backend will require GET permissions to read JSON files and convert them to Label Studio tasks. 

When your users access labeling, the backend will attempt to resolve URI (e.g., s3://) to URL (https://) links. URLs will be returned to the frontend and loaded by the user's browser. To load these URLs, the browser will require HEAD and GET permissions from your Cloud Storage. The HEAD request is made at the beginning and allows the browser to determine the size of the audio, video, or other files. The browser then makes a GET request to retrieve the file body.


### Target storage

When annotators click **Submit** or **Update** while labeling tasks, Label Studio saves annotations in the Label Studio database. 

If you configure target storage, annotations are sent to target storage after you click **Sync** for the configured target storage connection. The target storage receives a JSON-formatted export of each annotation. See [Label Studio JSON format of annotated tasks](export.html#Label-Studio-JSON-format-of-annotated-tasks) for details about how exported tasks appear in  target storage.

If you're using Label Studio Enterprise with Amazon S3, you can also delete annotations in target storage when they are deleted in Label Studio. See [Set up target storage connection in the Label Studio UI](storage.html#Set-up-target-storage-connection-in-the-Label-Studio-UI) for more details.

#### Target storage permissions

To use this type of storage, you must have PUT permission, and DELETE permission is optional.


## Amazon S3

Connect your [Amazon S3]((https://aws.amazon.com/s3)) bucket to Label Studio to retrieve labeling tasks or store completed annotations. 

For details about how Label Studio secures access to cloud storage, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

### Configure access to your S3 bucket
Before you set up your S3 bucket or buckets with Label Studio, configure access and permissions. These steps assume that you're using the same AWS role to manage both source and target storage with Label Studio. If you only use S3 for source storage, Label Studio does not need PUT access to the bucket. 

1. Enable programmatic access to your bucket. [See the Amazon Boto3 configuration documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration) for more on how to set up access to your S3 bucket. 

> Note: A session token is only required in case of temporary security credentials. See the AWS Identity and Access Management documentation on [Requesting temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html). 

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
> `"s3:PutObject"` is only needed for target storage connections, and `"s3:DeleteObject` is only needed for target storage connections in Label Studio Enterprise where you want to allow deleted annotations in Label Studio to also be deleted in the target S3 bucket.  
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
    - Choose whether to disable **Use pre-signed URLs**. For example, if you host Label Studio in the same AWS network as your storage buckets, you can disable presigned URLs and have direct access to the storage using `s3://` links.
    - Adjust the counter for how many minutes the pre-signed URLs are valid.
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_s3_sync_create).

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
    - <i class='ent'></i> (Optional) Enable **Can delete objects from storage** if you want to delete annotations stored in the S3 bucket when they are deleted in Label Studio. The storage credentials associated with the bucket must include the ability to delete bucket objects. Leave disabled to not take any action on annotations if they are deleted in Label Studio. 
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync export storage](/api#operation/api_storages_export_s3_sync_create).


### <i class='ent'></i> Set up an S3 connection with IAM role access

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
> `"s3:DeleteObject` is only needed for target storage connections where you want deleted annotations in Label Studio to also be deleted in the target S3 bucket.  


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
    - Choose whether to disable **Use pre-signed URLs**. For example, if you host Label Studio in the same AWS network as your storage buckets, you can disable presigned URLs and have direct access to the storage using `s3://` links.
    - Adjust the counter for how many minutes the pre-signed URLs are valid.
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](https://app.heartex.com/docs/api#operation/api_storages_s3s_sync_create).

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

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync export storage](https://app.heartex.com/docs/api#operation/api_storages_export_s3s_sync_create).

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
    - Choose whether to disable **Use pre-signed URLs**. For example, if you host Label Studio in the same network as your storage buckets, you can disable presigned URLs and have direct access to the storage.
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

##  Microsoft Azure Blob storage

Connect your [Microsoft Azure Blob storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) container with Label Studio. For details about how Label Studio secures access to cloud storage, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

### Prerequisites
You must set two environment variables in Label Studio to connect to Azure Blob storage:
- `AZURE_BLOB_ACCOUNT_NAME` to specify the name of the storage account.
- `AZURE_BLOB_ACCOUNT_KEY` to specify the secret key for the storage account.

Configure the specific Azure Blob container that you want Label Studio to use in the UI.

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
    - Choose whether to disable **Use pre-signed URLs**, or [shared access signatures](https://docs.microsoft.com/en-us/rest/api/storageservices/delegate-access-with-shared-access-signature). For example, if you host Label Studio in the same network as your storage containers, you can disable presigned URLs and have direct access to the storage.
    - Adjust the counter for how many minutes the shared access signatures are valid.
8. Click **Add Storage**.
9. Repeat these steps for **Target Storage** to sync completed data annotations to a container.

After adding the storage, click **Sync** to collect tasks from the container, or make an API call to [sync import storage](/api#operation/api_storages_azure_sync_create).

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_azure_create) then [sync the import storage](/api#operation/api_storages_azure_sync_create). 
- See [Create export storage](/api#operation/api_storages_export_azure_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_azure_sync_create).

## Redis database

You can also store your tasks and annotations in a [Redis database](https://redis.io/). You must store the tasks and annotations in different databases. You might want to use a Redis database if you find that relying on a file-based cloud storage connection is slow for your datasets. 

Currently, this configuration is only supported if you host the Redis database in the default mode, with the default IP address. 

Label Studio does not manage the Redis database for you. See the [Redis Quick Start](https://redis.io/topics/quickstart) for details about hosting and managing your own Redis database. Because Redis is an in-memory database, data saved in Redis does not persist. To make sure you don't lose data, set up [Redis persistence](https://redis.io/topics/persistence) or use another method to persist the data, such as using Redis in the cloud with [Microsoft Azure](https://azure.microsoft.com/en-us/services/cache/) or [Amazon AWS](https://aws.amazon.com/redis/).

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
   <img src="/images/local-storage-settings.png" alt="Screenshot of the storage settings modal described in the preceding steps." width=670 height=490 style="border: 1px solid #eee">
4. In the dialog box that appears, select **Local Files** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify an **Absolute local path** to the directory with your files. The local path must be an absolute path and include the `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` value. 
   For example, if `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/home/user`, then your local path must be `/home/user/dataset1`. For more about that environment variable, see [Run Label Studio on Docker and use local storage](start.html#Run_Label_Studio_on_Docker_and_use_local_storage).    
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
<img src="/images/local-storage-settings2.png" alt="Screenshot of the local storage settings for user task." width=670 height=490 style="border: 1px solid #eee">

Click **Add Storage**, but not use synchronization (don't touch button **Sync Storage**) after storage creation, to avoid automatic task creation from storage files.

Path to all your files inside task will start with string `/data/local-files/?d=`, also you have to add to this string full path to each file, that start from the first directory in **Absolute local path** of local storage after your `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT`. In our example it is `dataset1`. For example, to specify multiple data types in the Label Studio JSON format, specifically an audio files `1.wav`, `2.wav` inside `audio` folder and an image files `1.jpg`, `2.jpg` inside `images` folder:
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
There are several ways to add your hand made task: API, web interface, another storage. The simplest one is to use **Import** button inside project main page. Drag and drop your json file inside window, after this push blue button **Import**.
<img src="/images/upload-task.png" alt="Task upload via web." width="100%">

#### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_localfiles_create) then [sync the import storage](/api#operation/api_storages_localfiles_sync_create). 
- See [Create export storage](/api#operation/api_storages_export_localfiles_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_localfiles_sync_create).

### Set up local storage with Docker
If you're using Label Studio in Docker, you need to mount the local directory that you want to access as a volume when you start the Docker container. See [Run Label Studio on Docker and use local storage](start.html#Run-Label-Studio-on-Docker-and-use-local-storage).

### Local Storage with Custom Task Format
This video tutorial demonstrates how to setup Local Storage from scratch and import json tasks in a complex task format that are linked to the Local Storage files.

<iframe class="video-border" width="100%" height="400vh" src="https://www.youtube.com/embed/lo6ncQajbdU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Troubleshoot CORS and access problems

Troubleshoot some common problems when using cloud or external storage with Label Studio. 

### I can't see the data in my tasks

Check your web browser console for errors.

- If you see CORS problems, make sure you have CORS set up properly. 
     <img src='/images/cors-error-2.png' style="opacity: 0.9; max-width: 500px">
  
    - For Amazon S3, see [Configuring and using cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) in the Amazon S3 User Guide.
    - For GCS, see [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors) in the Google Cloud Storage documentation.
    - For Microsoft Azure, see [Cross-Origin Resource Sharing (CORS) support for Azure Storage](https://docs.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services) in the Microsoft Azure documentation. 

!!! note
    1. Make sure to apply the correct role and permissions for your Service Account. For example, Service Account Role "roles/iam.serviceAccountTokenCreator" to the Service Account.
    
    2. If the name of the Service Account `labelstudio` is using the error displayed in the DEBUG logs, then you can enable them using the `--log-level DEBUG` flag in the `label-studio start` command.

- If you see 403 errors, make sure you configured the correct credentials. 
    - For Amazon S3, see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) in the Amazon AWS Command Line Interface User Guide.
    - For GCS, see [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) in the Google Cloud Storage documentation. Your account must have the `Service Account Token Creator` role. 
    
- For Amazon S3, make sure you specified the correct region when creating a bucket. If needed, change the region in your source or target storage settings or the `.aws/config` file, otherwise you might have problems accessing your bucket objects.
    For example, update the following: `~/.aws/config`
    
    ```
    [default]
    region=us-east-2  # change to the region of your bucket
    ```
- For Amazon S3, make sure that the credentials that you used to set up the source or target storage connection are still valid. If you see 403 errors in the browser console, and you set up the correct permissions for the bucket, you might need to update the Access Key ID, Secret Access Key, and Session ID. See the AWS Identity and Access Management documentation on [Requesting temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html). 

### Tasks or annotations do not sync

If you're pressing the **Sync** button but tasks do not sync, or you can't see the new tasks in the Data Manager, check the following:

- Make sure you specified the correct credentials.
    - For Amazon S3, see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) in the Amazon AWS Command Line Interface User Guide. Also be sure to check that they work from the [aws client](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).
    - For GCS, see [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) in the Google Cloud Storage documentation. Your account must have the **Service Account Token Creator** and **Storage Object Viewer** roles and **storage.buckets.get** access permission. See [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) and [IAM permissions for Cloud Storage](https://cloud.google.com/storage/docs/access-control/iam-permissions) in the Google Cloud Storage documentation. Also, if you're using a service account to authorize access to the Google Cloud Platform, make sure to activate it. See [gcloud auth activate-service-account](https://cloud.google.com/sdk/gcloud/reference/auth/activate-service-account) in the Google Cloud SDK: Command Line Interface documentation.
    
- Make sure that files exist under the specified bucket or container prefix, and that your file filter regex matches the files. When you set the prefix, subfolders are not recursively scanned.

### Tasks don't load the way I expect

If the tasks sync to Label Studio but don't appear the way that you expect, maybe with URLs instead of images or with one task where you expect to see many, check the following:
- If you're placing JSON files in [cloud storage](storage.html), place 1 task in each JSON file in the storage bucket. If you want to upload a JSON file from local storage into Label Studio, you can place multiple tasks in one JSON file. 
- If you're syncing image or audio files, make sure **Treat every bucket object as a source file** is enabled. 
