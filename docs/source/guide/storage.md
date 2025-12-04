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

<div class="opensource-only">

| Storage | Community | Enterprise |
|---|---|---|
| [Amazon S3](#Amazon-S3) | ✅ | ✅ |
| [Amazon S3 with IAM role](https://docs.humansignal.com/guide/storage#Set-up-an-S3-connection-with-IAM-role-access) | ❌ | ✅ |
| [Google Cloud Storage](#Google-Cloud-Storage) | ✅ | ✅ |
| [Google Cloud Storage WIF Auth](https://docs.humansignal.com/guide/storage#Google-Cloud-Storage-with-Workload-Identity-Federation-WIF) | ❌ | ✅ |
| [Microsoft Azure Blob Storage](#Microsoft-Azure-Blob-storage) | ✅ | ✅ |
| [Microsoft Azure Blob Storage with Service Principal](https://docs.humansignal.com/guide/storage#Azure-Blob-Storage-with-Service-Principal-authentication) | ❌ | ✅ |
| [Databricks Files (UC Volumes)](https://docs.humansignal.com/guide/storage#Databricks-Files-UC-Volumes) | ❌ | ✅ |
| [Redis database](#Redis-database)| ✅ | ✅ |
| [Local storage](#Local-storage) | ✅ | ✅ |
 
</div>

<div class="enterprise-only">

| Storage | Community | Enterprise |
|---|---|---|
| [Amazon S3](#Amazon-S3) | ✅ | ✅ |
| [Amazon S3 with IAM role](#Set-up-an-S3-connection-with-IAM-role-access) | ❌ | ✅ |
| [Google Cloud Storage](#Google-Cloud-Storage) | ✅ | ✅ |
| [Google Cloud Storage WIF Auth](#Google-Cloud-Storage-with-Workload-Identity-Federation-WIF) | ❌ | ✅ |
| [Microsoft Azure Blob Storage](#Microsoft-Azure-Blob-storage) | ✅ | ✅ |
| [Microsoft Azure Blob Storage with Service Principal](#Azure-Blob-Storage-with-Service-Principal-authentication) | ❌ | ✅ |
| [Databricks Files (UC Volumes)](#Databricks-Files-UC-Volumes) | ❌ | ✅ |
| [Redis database](#Redis-database)| ✅ | ✅ |
| [Local storage](#Local-storage) (on-prem only) | ✅ | ✅ |

</div>


## Troubleshooting

When working with an external cloud storage connection, keep the following in mind:

* For Source storage:
   * When **Files** import method is selected, Label Studio doesn’t import the data stored in the bucket, but instead creates *references* to the objects. Therefore, you have full access control on the data to be synced and shown on the labeling screen.
   * When **Tasks** import method is selected, bucket files are assumed to be immutable; the only way to push an updated file's state to Label Studio is to upload it with a new filename to storage or delete all tasks that are associated with that file and resync.
* Sync operations with external buckets only goes one way. It either creates tasks from objects on the bucket (Source storage) or pushes annotations to the output bucket (Target storage). Changing something on the bucket side doesn't guarantee consistency in results.
* We recommend using a separate bucket folder for each Label Studio project. 
* Storage Regions: To minimize latency and improve efficiency, store data in cloud storage buckets that are geographically closer to your team rather than near the Label Studio server.

<div class="opensource-only">

For more troubleshooting information, see [Troubleshooting Label Studio](troubleshooting).

</div>

<div class="enterprise-only">

For more troubleshooting information, see [Troubleshooting Import, Export, & Storage](https://support.humansignal.com/hc/en-us/sections/16982163062029-Import-Export-Storage) in the HumanSignal support center.

</div>


## How external storage connections and sync work

You can add source storage connections to sync data from an external source to a Label Studio project, and add target storage connections to sync annotations from Label Studio to external storage. Each source and target storage setup is project-specific. You can connect multiple buckets, containers, databases, or directories as source or target storage for a project. 

### Source storage

Label Studio does not automatically sync data from source storage. If you upload new data to a connected cloud storage bucket, sync the storage connection using the UI to add the new labeling tasks to Label Studio without restarting. You can also use the API to set up or sync storage connections. See [Label Studio API](https://api.labelstud.io/api-reference/introduction/getting-started) and locate the relevant storage connection type. 

Task data synced from cloud storage is not stored in Label Studio. Instead, the data is accessed using presigned URLs. You can also secure access to cloud storage using VPC and IP restrictions for your storage. For details, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storages).

#### Source storage permissions

* If you set the import method to "Files", Label Studio backend will only need LIST permissions and won't download any data from your buckets.

* If you set the import method to "Tasks", Label Studio backend will require GET permissions to read JSON files and convert them to Label Studio tasks. 

When your users access labeling, the backend will attempt to resolve URI (e.g., s3://) to URL (https://) links. URLs will be returned to the frontend and loaded by the user's browser. To load these URLs, the browser will require HEAD and GET permissions from your Cloud Storage. The HEAD request is made at the beginning and allows the browser to determine the size of the audio, video, or other files. The browser then makes a GET request to retrieve the file body.

#### Source storage Sync and URI resolving

Source storage functionality can be divided into two parts:
* Sync - when Label Studio scans your storage and imports tasks from it.
* URI resolving - when the Label Studio backend requests Cloud Storage to resolve URI links (e.g., `s3://bucket/1.jpg`) into HTTPS (`https://aws.amazon.com/bucket/1.jpg`). This way, user's browsers are able to load media. 

<img src="/images/source-cloud-storages.png" class="make-intense-zoom">



#### Import method

!!! info
    The "Treat every bucket object as a source file" option was renamed and reintroduced as the "Import method" dropdown.

Label Studio Source Storages feature an "Import method" dropdown. This setting enables two different methods of loading tasks into Label Studio.

###### Tasks

When set to "Tasks", tasks in JSON, JSONL/NDJSON or Parquet format can be loaded directly from storage buckets into Label Studio. This approach is particularly helpful when dealing with complex tasks that involve multiple media sources.

<img src="/images/source-storages-treat-off.png" class="make-intense-zoom">

You may put multiple tasks inside the same JSON file, but not mix task formats inside the same file.

{% details <b>Example with bare tasks</b> %}


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

Or:

`tasks.json`
```
[
  {
    "image": "s3://bucket/1.jpg",
    "text": "opossums are awesome"
  },
  {
    "image": "s3://bucket/2.jpg",
    "text": "cats are awesome"
  }
]
```

{% enddetails %}

<br>

{% details <b>Example with tasks, annotations and predictions</b> %}

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

Or:

`tasks_with_predictions_and_annotations.json`
```
[
  {
      "data": {
          "image": "s3://bucket/1.jpg",
          "text": "opossums are awesome"
      },
      "annotations": [...],  
      "predictions": [...]
  },
  {
      "data": {
        "image": "s3://bucket/2.jpg",
        "text": "cats are awesome"
      }
      "annotations": [...],  
      "predictions": [...]
  }
]
```

{% enddetails %}

<br>

{% details <b>Example with JSONL</b> %}

`tasks.jsonl`
```
{ "image": "s3://bucket/1.jpg", "text": "opossums are awesome" }
{ "image": "s3://bucket/2.jpg", "text": "cats are awesome" }
```

{% enddetails %}

In Label Studio Enterprise and Starter Cloud editions, Parquet files can also be used to import tasks in the same way as JSON and JSONL.

<br>

###### Files

When set to "Files", Label Studio automatically lists files from the storage bucket and constructs tasks. This is only possible for simple labeling tasks that involve a single media source (such as an image, text, etc.).* 

<img src="/images/source-storages-treat-on.png" class="make-intense-zoom">


#### Pre-signed URLs vs. Storage proxies

There are two secure mechanisms in which Label Studio fetches media data from cloud storage: via pre-signed URLS and via proxy. Which one you use depends on whether you have **Use pre-signed URLs** toggled on or off when setting up your source storage. **Use pre-signed URLs** is used by default. Proxy storage is enabled when **Use pre-signed URLs** is OFF.

<div class="enterprise-only">

!!! note
    You can control whether your organization allows the use of storage proxy at the organization level: navigate to your organization's Billing page and look for the "Enable Storage Proxy" toggle. 

    When "Enable Storage Proxy" is disabled, users in your organization will not be able to create or modify source storage connections that have "Presigned URLs" turned OFF. This restriction ensures that all storage connections must use presigned URLs when the "Enable Storage Proxy" at the organization level is OFF.

</div>

<br/>

{% details <b>See more details</b> %}

##### Pre-signed URLs

In this scenario, your browser receives an HTTP 303 redirect to a time-limited S3/GCS/Azure presigned URL. This is the default behavior. 

The main benefit to using pre-signed URLs is if you want to ensure that your media files are isolated **from** the Label Studio network as much as possible. 

<img src="/images/storages/storage-proxy-presigned.png" style="max-width:600px; margin: 0 auto" alt="Diagram of presigned URL flow">

The permissions required for this are already included in the cloud storage configuration documentation below. 


##### Proxy storage

When in proxy mode, the Label Studio backend fetches objects server-side and streams them directly to the browser.

<img src="/images/storages/storage-proxy.png" style="max-width:600px; margin: 0 auto" alt="Diagram of proxy flow">

This has multiple benefits, including:

- **Security**
    - Access to media files is further restricted based on Label Studio user roles and project access. 
    - This access is applied to cached files. This means that even if the media is cached, access will be restricted to that file if a user's access to the task is revoked.  
    - Data stays within the Label Studio network boundary. This is especially useful for on-prem environments who want to maintain a single entry point for their network traffic.
- **Configuration**
    - No CORS settings are needed. 
    - No pre-signed permissions are needed. 

To allow proxy storage, you need to ensure your permissions include the following: 

{% details <b>AWS S3</b> %}

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}

```

{% enddetails %}

<br>

{% details <b>Google Cloud Storage</b> %}

- `storage.objects.get` - Read object data and metadata
- `storage.objects.list` - List objects in the bucket (if using prefix)

{% enddetails %}

<br>

{% details <b>Azure Blob Storage</b> %}

Add the **Storage Blob Data Reader** role, which includes:
- `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read`
- `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/getTags/action`

{% enddetails %}

<br>

!!! note Note for on-prem deployments
    Large media files are streamed in sequential 8 MB chunks, which are split into different GET requests. This can result in frequent requests to the backend to get the next portion of data and uses additional resources.

    You can configure this using the following environment variables:

    * `RESOLVER_PROXY_MAX_RANGE_SIZE` - Defaults to 8 MB, and defines the largest chunk size returned per request. 
    * `RESOLVER_PROXY_TIMEOUT` - Defaults to 20 seconds, and defines the maximum time uWSGI workers spend on a single request.

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
5. In the **Storage Name** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the S3 bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Region Name** field, specify the AWS region name. For example `us-east-1`.
    - (Optional) In the **S3 Endpoint** field, specify an S3 endpoint if you want to override the URL created by S3 to access your bucket.
    - In the **Access Key ID** field, specify the access key ID of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Secret Access Key** field, specify the secret key of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Session Token** field, specify a session token of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Import method** dropdown, choose how to import your data:
        - **Files** - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT). Use this if your bucket contains BLOB storage files such as JPG, MP3, or similar file types.
        - **Tasks** - Treat each JSON, JSONL, or Parquet as a task definition (one or more tasks per file). Use this if you have multiple JSON files in the bucket with one task per JSON file.
    - (Optional) Enable **Scan all sub-folders** to include files from all nested folders within your S3 bucket prefix.
    - In the **Use pre-signed URLs (On) / Proxy through Label Studio (Off)** toggle, choose how media is loaded:
        - **ON** (Pre-signed URLs) - All data bypasses the platform and user browsers directly read data from storage.
        - **OFF** (Proxy) - The platform proxies media using its own backend.  
    - Set the **Expire pre-signed URLs (minutes)** counter to control how long pre-signed URLs remain valid.
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/s-3/sync).

### Set up target storage connection in the Label Studio UI
After you [configure access to your S3 bucket](#Configure-access-to-your-S3-bucket), do the following to set up Amazon S3 as a target storage connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Target Storage**.  
4. In the dialog box that appears, select **Amazon S3** as the storage type.
5. In the **Storage Name** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the S3 bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining parameters:
    - In the **Region Name** field, specify the AWS region name. For example `us-east-1`.
    - (Optional) In the **S3 Endpoint** field, specify an S3 endpoint if you want to override the URL created by S3 to access your bucket.
    - In the **Access Key ID** field, specify the access key ID of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Secret Access Key** field, specify the secret key of the temporary security credentials for an AWS account with access to your S3 bucket.
    - In the **Session Token** field, specify a session token of the temporary security credentials for an AWS account with access to your S3 bucket.
    - <div class="enterprise-only">(Optional) Enable **Can delete objects from storage** if you want to delete annotations stored in the S3 bucket when they are deleted in Label Studio. The storage credentials associated with the bucket must include the ability to delete bucket objects. Leave disabled to not take any action on annotations if they are deleted in Label Studio. </div>
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync export storage](https://api.labelstud.io/api-reference/api-reference/export-storage/s-3/sync)

<div class="opensource-only">

### S3 connection with IAM role access 

In Label Studio Enterprise, you can use an IAM role configured with an external ID to access S3 bucket contents securely. An 'external ID' is a unique identifier that enhances security by ensuring that only trusted entities can assume the role, reducing the risk of unauthorized access. See how to [Set up an S3 connection with IAM role access](https://docs.humansignal.com/guide/storage#Set-up-an-S3-connection-with-IAM-role-access)</span> in the Enterprise documentation.

</div>

<div class="enterprise-only">

###  Set up an S3 connection with IAM role access

If you want to use a revocable method to grant Label Studio access to your Amazon S3 bucket, use an IAM role and its temporary security credentials instead of an access key ID and secret. This added layer of security is only available in Label Studio Enterprise. For more details about security in Label Studio and Label Studio Enterprise, see [Secure Label Studio](security.html).

#### Set up an IAM role in Amazon AWS

!!! note "Notice for Label Studio Cloud users"
    <ul><li><p>On <strong>April 7th 2025</strong>, new storage connections will require an update to the AWS principal in your IAM role policy.</p>

    <p>If you set up your IAM role prior to April 7th, 2025 and you have already been using it with Label Studio, you must <b>add</b> the following to your principal list before you can set up new storage connection in Label Studio projects: 
        
    <p><code>"arn:aws:iam::490065312183:role/label-studio-app-production"</code></p>

    <p>For example:</p>

    <p><img src="/images/storages/s3-trust-policy.png" alt="screenshot"></p>

    <p>(See step 3 below.)</p>
        
    <p>Adding the new principal ensures you can create new connections. <b>Keeping the old principal ensures that pre-existing storage connections can continue to load data.</b> </p>
        
    <p>Existing S3 IAM role-based-access storages added to Label Studio will continue to work as is without any changes necessary. This change is only required if you are setting up new connections.</p></li>
    
    <li><p>On <strong>July 7th 2025</strong>, we will no longer support the legacy IAM user, and all policies should be updated to the new IAM role.</p></li></ul> 

Set up an IAM role in Amazon AWS to use with Label Studio.

1. From Label Studio, go to **Organization** page to retrieve your organization's `External ID`. You must be an Owner or Admin to view the Organization page.
2. Follow the [Amazon AWS documentation to create an IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user.html) in your AWS account. 

    Make sure to require an external ID and do not require multi-factor authentication when you set up the role. Select an existing permissions policy, or create one that allows programmatic access to the bucket.
3. Create a trust policy using the external ID. Use the following example: 

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::490065312183:role/label-studio-app-production"
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

!!! attention
    If your bucket is already connected to a Label Studio project, and that connection was created before April 7, 2025,  you will need to add the new role (listed above) along with your old user to continue using your existing project. You also must maintain the old role so that pre-existing projects can continue to load data from AWS. 

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
5. In the **Storage Name** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the S3 bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Region Name** field, specify the AWS region name. For example `us-east-1`.
    - In the **S3 Endpoint** field, specify an S3 endpoint if you want to override the URL created by S3 to access your bucket.
    - In the **Role ARN** field, specify the Amazon Resource Name (ARN) of the IAM role that you created to grant access to Label Studio.
    - In the **External ID** field, specify the external ID that identifies Label Studio to your AWS account. You can find the external ID on your **Organization** page.
    - In the **Import method** dropdown, choose how to import your data:
        - **Files** - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT). Use this if your bucket contains BLOB storage files such as JPG, MP3, or similar file types.
        - **Tasks** - Treat each JSON, JSONL, or Parquet as a task definition (one or more tasks per file). Use this if you have multiple JSON files in the bucket with one task per JSON file.
    - Enable **Scan all sub-folders** to include files from all nested folders within your S3 bucket prefix.
    - In the **Use pre-signed URLs (On) / Proxy through Label Studio (Off)** toggle, choose how media is loaded:
      - **ON** (Pre-signed URLs) - All data bypasses the platform and user browsers directly read data from storage.
      - **OFF** (Proxy) - The platform proxies media using its own backend.  
    - Set the **Expire pre-signed URLs (minutes)** counter to control how long pre-signed URLs remain valid.
8. Click **Add Storage**.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/s-3/sync).

#### Create a target storage connection to S3 in the Label Studio UI
In the Label Studio UI, do the following to set up a target storage connection to save annotations in an S3 bucket with IAM role access set up:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Target Storage**.  
4. In the dialog box that appears, select **Amazon S3 (IAM role access)** as the storage type.
5. In the **** field, type a name for the storage to appear in the Label Studio UI.
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

### IP Filtering and VPN for Enhanced Security for S3 storage

To maximize security and data isolation behind a VPC, restrict access to the Label Studio backend and internal network users by setting IP restrictions for storage, allowing only trusted networks to perform task synchronization and generate pre-signed URLs. Additionally, establish a secure connection between storage and users' browsers by configuring a VPC private endpoint or limiting storage access to specific IPs or VPCs. 

Read more about [Source storage behind your VPC](security.html#Source-storage-behind-your-VPC).

<details>
<summary>Bucket Policy Example for S3 storage</summary>
<br>

!!! warning
    These example bucket policies explicitly deny access to any requests outside the allowed IP addresses. Even the user that entered the bucket policy can be denied access to the bucket if the user doesn't meet the conditions. Therefore, make sure to review the bucket policy carefully before saving it. If you get accidentally locked out, see [How to regain access to an Amazon S3 bucket](https://repost.aws/knowledge-center/s3-accidentally-denied-access).

 **Helpful Resources**:
   - [AWS Documentation: VPC Endpoints for Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html)
   - [AWS Documentation: How to Configure VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/endpoint-services-overview.html)

Go to your S3 bucket and then **Permissions > Bucket Policy** in the AWS management console. Add the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyAccessUnlessFromSaaSIPsForListAndGet",
            "Effect": "Deny",
            "Principal": {
                "AWS": "arn:aws:iam::490065312183:role/label-studio-app-production"
            },
            "Action": [
                "s3:ListBucket",
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ],
            "Condition": {
                "NotIpAddress": {
                    "aws:SourceIp": [
                      //// IP ranges for app.humansignal.com from the documentation
                        "x.x.x.x/32",
                        "x.x.x.x/32",
                        "x.x.x.x/32"
                    ]
                }
            }
        },
//// Optional
        {
            "Sid": "DenyAccessUnlessFromVPNForGetObject",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*",
            "Condition": {
                "NotIpAddress": {
                    "aws:SourceIp": "YOUR_VPN_SUBNET/32"
                }
            }
        }
    ]
}
```
</details>

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

### Google Cloud Storage with application credentials 

#### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Google Cloud Storage** as the storage type.
5. In the **** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the GCS bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining optional parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Import method** dropdown, choose how to import your data:
        - **Files** - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT). Use this if your bucket contains BLOB storage files such as JPG, MP3, or similar file types.
        - **Tasks** - Treat each JSON, JSONL, or Parquet as a task definition (one or more tasks per file). Use this if you have multiple JSON files in the bucket with one task per JSON file.
    - In the **Use pre-signed URLs (On) / Proxy through Label Studio (Off)** toggle, choose how media is loaded:
      - **ON** (Pre-signed URLs) - All data bypasses the platform and user browsers directly read data from storage.
      - **OFF** (Proxy) - The platform proxies media using its own backend.  
    - Set the **Expire pre-signed URLs (minutes)** counter to control how long pre-signed URLs remain valid.
8. In the **Google Application Credentials** field, add a JSON file with the GCS credentials you created to manage authentication for your bucket. 

    **On-prem users:** Alternatively, you can use the `GOOGLE_APPLICATION_CREDENTIALS` environment variable and/or set up Application Default Credentials, so that users do not need to configure credentials manually. See [Application Default Credentials for enhanced security](#Application-Default-Credentials-for-enhanced-security-for-GCS) below.
9. Click **Add Storage**.
10.  Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_gcs_sync_create).

#### Application Default Credentials for enhanced security for GCS

If you use Label Studio on-premises with Google Cloud Storage, you can set up [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) to provide cloud storage authentication globally for all projects, so users do not need to configure credentials manually.

The recommended way to to do this is by using the `GOOGLE_APPLICATION_CREDENTIALS` environment variable. For example:

```bash
  export GOOGLE_APPLICATION_CREDENTIALS=json-file-with-GCP-creds-23441-8f8sd99vsd115a.json
  ```

<div class="enterprise-only">

### Google Cloud Storage with Workload Identity Federation (WIF)

You can also use Workload Identity Federation (WIF) pools with Google Cloud Storage. 

Unlike with application credentials, WIF allows you to use temporary credentials. Each time you make a request to GCS, Label Studio connects to your identity pool to request temporary credentials. 

For more information about WIF, see [Google Cloud - Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation).

#### Service account permissions

Before you begin, you will need a service account that has the following permissions

- Bucket: **Storage Admin** (`roles/storage.admin`)
- Project: **Service Account Token Creator** (`roles/iam.serviceAccountTokenCreator`)
- Project: **Storage Object Viewer** (`roles/storage.viewer`)
  
See [Create service accounts](https://cloud.google.com/iam/docs/service-accounts-create?hl=en) in the Google Cloud documentation.

#### Create a Workload Identity Pool

There are several methods you can use to create a WIF pool. 

<details>
<summary>Using Terraform</summary>
<br>

An example script is provided below. Ensure all required variables are set: 

* GCP project variables:

  * `var.gcp_project_name`

  * `var.gcp_region`

* SaaS provided by HumanSignal:

  * `var.aws_account_id` = `490065312183`

  * `var.aws_role_name` = `label-studio-app-production` 

Then run:
    
```bash
terraform init
terraform plan
terraform apply
```
    
Once applied, you will have a functioning Workload Identity Pool that trusts the Label Studio AWS IAM Role.

```json
## Variables
/* AWS variables are so that AWS-hosted Label Studio resources can reach out to request credentials */

variable "gcp_project_name" {
  type        = string
  description = "GCP Project name"
}

variable "gcp_region" {
  type        = string
  description = "GCP Region"
}

variable "label_studio_gcp_sa_name" {
  type        = string
  description = "GCP Label Studio Service Account Name"
}

variable "aws_account_id" {
  type        = string
  description = "AWS Project ID"
}

variable "aws_role_name" {
  type        = string
  description = "AWS Role name"
}

variable "external_ids" {
  type        = list(string)
  default = []
  description = "List of external ids"
}

## Outputs

output "GCP_WORKLOAD_ID" {
  value = google_iam_workload_identity_pool_provider.label-studio-provider-jwt.workload_identity_pool_id
}

output "GCP_WORKLOAD_PROVIDER" {
  value = google_iam_workload_identity_pool_provider.label-studio-provider-jwt.workload_identity_pool_provider_id
}

## Main

provider "google" {
  project = var.gcp_project_name
  region  = var.gcp_region
}

resource "random_id" "random" {
  byte_length = 4
}

locals {
  aws_assumed_role = "arn:aws:sts::${var.aws_account_id}:assumed-role/${var.aws_role_name}"

  external_id_condition = (
    length(var.external_ids) > 0
    ? format("(attribute.aws_role == \"%s\") && (attribute.external_id in [%s])",
      local.aws_assumed_role,
      join(", ", formatlist("\"%s\"", var.external_ids))
    )
    : format("(attribute.aws_role == \"%s\")", local.aws_assumed_role)
  )
}

resource "google_iam_workload_identity_pool" "label-studio-pool" {
  workload_identity_pool_id = "label-studio-pool-${random_id.random.hex}"
  project                   = var.gcp_project_name
}

resource "google_iam_workload_identity_pool_provider" "label-studio-provider-jwt" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.label-studio-pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "label-studio-jwt-${random_id.random.hex}"

  attribute_condition = local.external_id_condition

  attribute_mapping = {
    "google.subject"        = "assertion.arn"
    "attribute.aws_account" = "assertion.account"
    "attribute.aws_role"    = "assertion.arn.contains('assumed-role') ? assertion.arn.extract('{account_arn}assumed-role/') + 'assumed-role/' + assertion.arn.extract('assumed-role/{role_name}/') : assertion.arn"
    "attribute.external_id" = "assertion.external_id"
  }

  aws {
    account_id = var.aws_account_id
  }
}

data "google_service_account" "existing_sa" {
  account_id = var.label_studio_gcp_sa_name
}

resource "google_service_account_iam_binding" "label-studio-sa-oidc" {
  service_account_id = data.google_service_account.existing_sa.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.label-studio-pool.name}/attribute.aws_role/${local.aws_assumed_role}"
  ]
}
```

</details>

<details>
<summary>Using the gcloud command line</summary>
<br>

Replace the bracketed variables (`[PROJECT_ID]`, `[POOL_ID]`, `[PROVIDER_ID]`, etc.) with your own values.

Make sure you escape quotes or use single quotes when necessary.

1. Create the Workload Identity pool:
   
   ```shell
   gcloud iam workload-identity-pools create [POOL_ID] \
  --project=[PROJECT_ID] \
  --location="global" \
  --display-name="[POOL_DISPLAY_NAME]"
   ```
   Where:

   * `[POOL_ID]` is the ID that you want to assign to your WIF pool (for example, `label-studio-pool-abc123`). Note this because you will need to reuse it later. 
   * `[PROJECT_ID]` is the ID of your Google Cloud project. 
   * `[POOL_DISPLAY_NAME]` is a human-readable name for your pool (optional, but recommended).

1. Create the provider for AWS.

    This allows AWS principals that have the correct external ID and AWS role configured to impersonate the Google Cloud service account. This is necessary because the Label Studio resources making the request are hosted in AWS. 

    ```shell
    gcloud iam workload-identity-pools providers create-aws [PROVIDER_ID] \
    --workload-identity-pool="[POOL_ID]" \
    --account-id="490065312183" \
    --attribute-condition="attribute.aws_role==\"arn:aws:sts::490065312183:assumed-role/label-studio-app-production\"" \
    --attribute-mapping="google.subject=assertion.arn,attribute.aws_account=assertion.account,attribute.aws_role=assertion.arn,attribute.external_id=assertion.external_id"

    ```
    Where: 

    * `[PROVIDER_ID]` is a provider ID (for example, `label-studio-app-production`).  
    * `[POOL_ID]`: The pool ID you provided in step 1. 

2. Grant the [service account](#Service-account-permissions) that you created earlier the `iam.workloadIdentityUser` role.

    ```shell
    gcloud iam service-accounts add-iam-policy-binding [SERVICE_ACCOUNT_EMAIL] \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/[PROJECT_NUMBER]/locations/global/workloadIdentityPools/[POOL_ID]/attribute.aws_role/arn:aws:sts::490065312183:assumed-role/label-studio-app-production"
    ```

    Where: 

    * `[SERVICE_ACCOUNT_EMAIL]` is the email associated with you GCS service account (for example, `my-service-account@[PROJECT_ID].iam.gserviceaccount.com`).
    * `[PROJECT_NUMBER]`: Your Google project number. This is different than the project ID. You can find the project number with the following command:

        `gcloud projects describe $PROJECT_ID --format="value(projectNumber)"`
    * `[POOL_ID]`: The pool ID you provided in step 1. 

Before setting up your connection in Label Studio, note what you provided for the following variables (you will be asked to provide them):

* `[POOL_ID]` 
* `[PROVIDER_ID]` 
* `[SERVICE_ACCOUNT_EMAIL]`
* `[PROJECT_NUMBER]`
* `[PROJECT_ID]` 

</details>

<details>
<summary>Using the Google Cloud Console</summary>
<br>

Before you begin, ensure you are in the correct project:

![Screenshot of the GCS console with project highlighted](/images/storages/gcs-project.png)

1. From the Google Cloud Console, navigate to [**IAM & Admin > Workload Identity Pools**](https://console.cloud.google.com/iam-admin/workload-identity-pools). 

2. Click **Get Started** to enable the APIs. 

3. Under **Create an identity pool**, complete the following fields: 

    * **Name**: This is the pool ID (for example, `label-studio-pool-abc123`). Note this ID because you will need it again later. 
    * **Description**: This is the display name for the pool (for example, "Label Studio Pool"). 

4. Under **Add a provider pool**, complete the following fields:

    * **Select a provider**: Select AWS. This is the location where the Label Studio components responsible for issuing requests are stored. 
    * **Provider name**: Enter `Label Studio App Production` (you can use a different display name, but you need to ensure that the corresponding provider ID is still `label-studio-app-production`)
    * **Provider ID**: Enter `label-studio-app-production`.
    * **AWS Account ID**: Enter `490065312183`.

5. Under **Configure provider attributes**, enter the following: 

    * Click **Add condition** and then enter the following: 

        `attribute.aws_role=="arn:aws:sts::490065312183:assumed-role/label-studio-app-production"`

    * Click **Edit mapping** and then add the following: 

        - `google.subject = assertion.arn`
        - `attribute.aws_role = assertion.arn.contains('assumed-role') ? assertion.arn.extract('{account_arn}assumed-role/') + 'assumed-role/' + assertion.arn.extract('assumed-role/{role_name}/') : assertion.arn` (this might be filled in by default)
        - `attribute.aws_account = assertion.account`
        - `attribute.external_id = assertion.external_id`

6. Click **Save**. 

7. Go to **IAM & Admin > Service Accounts** and find the service account you want to allow AWS (Label Studio) to impersonate. See [Service account permissions](#Service-account-permissions) above. 

8. From the **Principals with access** tab, click **Grant Access**. 

    ![Screenshot of grant access button](/images/storages/gcs-grant-access.png)

9. In the **New principals** field, add the following:

    `principalSet://iam.googleapis.com/projects/[PROJECT_NUMBER]/locations/global/workloadIdentityPools/[POOL_ID]/attribute.aws_role/arn:aws:sts::490065312183:assumed-role/label-studio-app-production`

    Where:

    * `[PROJECT_NUMBER]` - Replace this with your Google project number. This is different than the project ID. To find the project number, go to **IAM & Admin > Settings**.
    * `[POOL_ID]` - Replace this with the pool ID (the **Name** you entered in step 3 above, e.g. `label-studio-pool-abc123`).

9. Under **Assign Roles**, use the search field in the **Role** drop-down menu to find the **Workload Identity User** role. 

    ![Screenshot of principal window](/images/storages/gcs-principal.png)

10. Click **Save**

Before setting up your connection in Label Studio, note the following (you will be asked to provide them)

* Your pool ID - available from **IAM & Admin > Workload Identity Pools** 
* Your provider ID - available from **IAM & Admin > Workload Identity Pools** (this should be `label-studio-app-production`)
* Your service account email - available from **IAM & Admin > Service Accounts**. Select the service account and the email is listed under **Details**.  
* Your Google project number - available from **IAM & Admin > Settings**
* Your Google project ID - available from **IAM & Admin > Settings**

</details>

#### Set up the connection in Label Studio

From your Label Studio project, go to **Settings > Storage** to add your source or target storage. 

Select the **GCS (WIF auth)** storage type and then complete the following fields:

<div class="noheader rowheader">

| | |
| ------------------------------------------ | ------------------------------------------------- |
| Bucket Name                                | Enter the name of the Google Cloud bucket. |
| Bucket Prefix                              | Optionally, enter the folder name within the bucket that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  |
| File Name Filter                           | Optionally, specify a regular expression to filter bucket objects. |
| Import method | Choose how to interpret your data:<br/>**Files** - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT). Use this if your bucket contains BLOB storage files such as JPG, MP3, or similar file types.<br/>**Tasks** - Treat each JSON, JSONL, or Parquet as a task definition (one or more tasks per file). Use this if you have multiple JSON files in the bucket with one task per JSON file. |
| [Use pre-signed URLs](#Pre-signed-URLs-vs-storage-proxies)                        | **ON** - Label Studio generates a pre-signed URL to load media. <br /> **OFF** - The platform proxies media using its own backend. |
| Pre-signed URL counter                     | Adjust the counter for how many minutes the pre-signed URLs are valid. |
| Workload Identity Pool ID                  | This is the ID you specified when creating the Work Identity Pool. You can find this in Google Cloud Console under **IAM & Admin > Workload Identity Pools**. |
| Workload Identity Provider ID              | This is the ID you specified when setting up the provider. You can find this in Google Cloud Console under **IAM & Admin > Workload Identity Pools**. |
| Service Account Email | This is the email associated with the service account you set up as part of the prerequisites. You can find it in the **Details** page of the service account under **IAM & Admin > Service Accounts**. For example, `labelstudio@random-string-382222.iam.gserviceaccount.com`.  |
| Google Project ID | Your Google project ID. You can find this in Google Cloud Console under **IAM & Admin > Settings**.  |
| Google Project Number | Your Google project number. You can find this in Google Cloud Console under **IAM & Admin > Settings**. |

</div>

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_gcs_sync_create).

</div>


### Add storage with the Label Studio API

[See our API documentation.](/api/#tag/Storage:-GCS)


### IP filtering for enhanced security for GCS

Google Cloud Storage offers [bucket IP filtering](https://cloud.google.com/storage/docs/ip-filtering-overview) as a powerful security mechanism to restrict access to your data based on source IP addresses. This feature helps prevent unauthorized access and provides fine-grained control over who can interact with your storage buckets.

Read more about [Source storage behind your VPC](security.html#Source-storage-behind-your-VPC).

**Common Use Cases:**
- Restrict bucket access to only your organization's IP ranges
- Allow access only from specific VPC networks in your infrastructure
- Secure sensitive data by limiting access to known IP addresses
- Control access for third-party integrations by whitelisting their IPs

<details>
<summary>How to Set Up IP Filtering</summary>
<br>

1. First, create your GCS bucket through the console or CLI
2. Create a JSON configuration file to define IP filtering rules. You have two options:
   For public IP ranges:
```json
{
  "mode": "Enabled", 
  "publicNetworkSource": {
    "allowedIpCidrRanges": [
      "xxx.xxx.xxx.xxx", // Your first IP address
      "xxx.xxx.xxx.xxx", // Your second IP address
      "xxx.xxx.xxx.xxx/xx" // Your IP range in CIDR notation
    ]
  }
}
```

<div class="enterprise-only">

!!! note
    If you're using Label Studio Enterprise at app.humansignal.com and accessing it from your office network:
    - Add Label Studio Enterprise outgoing IP addresses (see [IP ranges](saas.html#IP-range))
    - Add your office network IP range (e.g. 192.168.1.0/24)
    - If both Label Studio Enterprise and your office are on the same VPN network (e.g. 10.0.0.0/16), you only need to add that VPN subnet

</div>

For VPC network sources:
```json
{
  "mode": "Enabled",
  "vpcNetworkSources": [
    {
      "network": "projects/PROJECT_ID/global/networks/NETWORK_NAME",
      "allowedIpCidrRanges": [
        RANGE_CIDR
      ]
    }
  ]
}
```

3. Apply the IP filtering rules to your bucket using the following command:
```bash
gcloud alpha storage buckets update gs://BUCKET_NAME --ip-filter-file=IP_FILTER_CONFIG_FILE
```

4. To remove IP filtering rules when no longer needed:
```bash
gcloud alpha storage buckets update gs://BUCKET_NAME --clear-ip-filter
```

#### Limitations to Consider
- Maximum of 200 IP CIDR blocks across all rules
- Maximum of 25 VPC networks in the IP filter rules
- Not supported for dual-regional buckets
- May affect access from certain Google Cloud services

[Read more about GCS IP filtering](https://cloud.google.com/storage/docs/ip-filtering-overview)

</details>


##  Microsoft Azure Blob storage

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
5. In the **** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the Azure Blob container, and if relevant, the container prefix to specify an internal folder or container.
7. Adjust the remaining optional parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Account Name** field, specify the account name for the Azure storage. You can also set this field as an environment variable,`AZURE_BLOB_ACCOUNT_NAME`.
    - In the **Account Key** field, specify the secret key to access the storage account. You can also set this field as an environment variable,`AZURE_BLOB_ACCOUNT_KEY`.
    - Set **Import method** to **"Files"** if your bucket contains BLOB storage files such as JPG, MP3, or similar file types. This setting creates a URL for each bucket object to use for labeling, for example `azure-blob://container-name/image.jpg`. Set this option to **"Tasks"** if you have multiple JSON/JSONL/Parquet files in the bucket with tasks. 
    - Choose whether to disable [**Use pre-signed URLs**](#Pre-signed-URLs-vs-storage-proxies), or [shared access signatures](https://docs.microsoft.com/en-us/rest/api/storageservices/delegate-access-with-shared-access-signature). 
      - **ON** - Label Studio generates a pre-signed URL to load media. 
      - **OFF** - The platform proxies media using its own backend.    
    - Adjust the counter for how many minutes the shared access signatures are valid.
8. Click **Add Storage**.
9. Repeat these steps for **Target Storage** to sync completed data annotations to a container.

After adding the storage, click **Sync** to collect tasks from the container, or make an API call to [sync import storage](/api#operation/api_storages_azure_sync_create).

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_azure_create) then [sync the import storage](/api#operation/api_storages_azure_sync_create). 
- See [Create export storage](/api#operation/api_storages_export_azure_create) and after annotating, [sync the export storage](/api#operation/api_storages_export_azure_sync_create).


<div class="enterprise-only">


### Azure Blob Storage with Service Principal authentication

You can use Azure Service Principal authentication to securely connect Label Studio Enterprise to Azure Blob Storage without using storage account keys. Service Principal authentication provides enhanced security through Entra ID (formerly "Azure Active Directory") identity and access management, allowing for fine-grained permissions and audit capabilities.

Service Principal authentication is a secure method that uses Azure AD identity to authenticate applications. Unlike storage account keys that provide full access to the storage account, Service Principal authentication allows you to grant specific permissions and can be easily revoked or rotated.

For more information, see [Microsoft - Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals).

#### Prerequisites

- Azure subscription and Storage Account
- Permission to create App Registrations and assign roles on the Storage Account
- A private container for your data (create one if needed)

#### Set up a Service Principal in Azure

1. **Add an App Registration:** 
   1. From the Azure portal, search or select **Entra ID**.
   2. Select **Add > App registration**. 
2. **Register the application:**
   1. Provide a name (e.g., "LabelStudio-ServicePrincipal").
   2. Select the account type appropriate for your organization. 
   3. Leave the redirect URI blank.
   4. Click **Register**. 
3. **Copy required information:** 
   1. From the Overview page, copy the following fields: <br/><br/>
    * **Directory (tenant) ID**
    * **Application (client) ID**
4. **Create a client secret:** 
   1. While still on the overview page for your new app, expand the **Manage** menu on the left. Select **Certificates & secrets**.
   2. Click **New client secret**. 
   3. Provide a description and select an expiration date. Click **Add**.
   4. Copy the **Value** field. (You will only have one chance to copy this value and then it will be hidden.)
5. **Grant Storage access:** 
   1. Go to the storage account you created as part of the prerequisites. 
   2. On the left, select **Access control (IAM)**. 
   3. Select **Add role assignment**.  
   4. Use the search field to locate **Storage Blob Data Contributor**. Click the role to highlight it. 
   5. Select the **Members** tab above. 
   6. With **User, group, or service principal** selected, click **Select members**. 
   7. Use the search field provided to locate the name of the app you created earlier.
   8. Click **Select**
   9. Click **Review + assign**. 
6. **Create a container:** 
   1. While still on the page for your storage account, click **Data storage** on the left. 
   2. Select **Containers** 
   3. You may already have a container with files, but if you do not, create a new one with private access. 

!!! warning
    If you plan to use pre-signed URLs, configure CORS on the Storage Account Blob service. See below.

<br/>

{% details <b>Configure CORS for the Azure storage account</b> %}

If you plan to use pre-signed URLs, configure CORS on the Storage Account Blob service.  

1. In the Azure portal, navigate to the page for the storage account. 
2. From the menu on the left, scroll down to **Settings > Resource sharing (CORS)**. 
3. Under **Blob service** add the following rule:

   * **Allowed origins:** `https://app.humansignal.com` (or the domain you are using)
   * **Allowed methods:** `GET, HEAD, OPTIONS` 
   * **Allowed headers:** `*` 
   * **Exposed headers:** `*` 
   * **Max age:** `3600` 

4. Click **Save**. 

{% enddetails %}

#### Set up connection in the Label Studio UI

From Label Studio, open your project and select **Settings > Cloud Storage** > **Add Source Storage**.

Select **Azure Blob Storage with Service Principal** and click **Next**.

##### Configure Connection

Complete the following fields and then click **Test connection**:

<div class="noheader rowheader">

| | |
| --- | --- |
| Storage Title | Enter a name for the storage connection to appear in Label Studio. | 
| Storage Name | Enter the name of your Azure storage account. |
| Container Name | Enter the name of a container within the Azure storage account. |
| Tenant ID | Specify the **Directory (tenant) ID** from your App Registration. |
| Client ID | Specify the **Application (client) ID** from your App Registration. |
| Client Secret | Specify the **Value** of the client secret you copied earlier. |
| **Use pre-signed URLs / Proxy through the platform** | Enable or disable pre-signed URLs. [See more.](#Pre-signed-URLs-vs-Storage-proxies) |
| Expiration minutes | Adjust the counter for how many minutes the pre-signed URLs are valid. |

</div>

##### Import Settings & Preview

Complete the following fields and then click **Load preview** to ensure you are syncing the correct data:

<div class="noheader rowheader">

| | |
| --- | --- |
| Bucket Prefix | Optionally, enter the folder name within the container that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  | 
| Import Method | Select whether you want create a task for each file in your container or whether you would like to use a JSON/JSONL/Parquet file to define the data for each task. |
| File Name Filter | Specify a regular expression to filter bucket objects. Use `.*` to collect all objects. |
| Scan all sub-folders | Enable this option to perform a recursive scan across subfolders within your container. |

</div>


##### Review & Confirm

If everything looks correct, click **Save & Sync** to sync immediately, or click **Save** to save your settings and sync later.

#### Create a target storage connection in the Label Studio UI

Repeat the steps from the previous section but using **Add Target Storage**. Use the same fields:
- **Storage Name**, **Container Name/Prefix**, **Tenant ID**, **Client ID**, **Client Secret**.

After adding, click **Sync** (or use the API) to push exports.

#### Required permissions

- Source: `Microsoft.Storage/storageAccounts/blobServices/containers/read`, `.../containers/blobs/read`
- Target: `.../containers/blobs/read`, `.../containers/blobs/write`, `.../containers/read`, `.../containers/blobs/delete` (optional)

These are included in the built-in **Storage Blob Data Contributor** role.

#### Validate and troubleshoot

- After adding the storage, the connection is checked. If it fails, verify:
  - Tenant ID, Client ID, Client Secret values (no extra spaces; secret not expired)
  - Storage account and container names (case-sensitive)
  - Role assignment: App Registration has Storage Blob Data Contributor on the Storage Account
  - CORS is set when using pre-signed URLs; try proxy mode if testing

</div>

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
    - In the **Import method** dropdown, choose how to import your data:
        - **Files** - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT). Use this if your database contains BLOB storage files such as JPG, MP3, or similar file types.
        - **Tasks** - Treat each JSON, JSONL, or Parquet as a task definition (one or more tasks per file). Use this if you have multiple JSON files in the database with one task per JSON file.
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

Without these settings, Local storage and URLs in tasks that point to local files won't work. Keep in mind that serving data from the local file system can be a **security risk**. See [Set environment variables](https://labelstud.io/guide/start#Set-environment-variables) for more about using environment variables.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.
  
<img src="/images/local-storage-settings.png" alt="Screenshot of the storage settings modal described in the preceding steps." class="gif-border">
  
4. In the dialog box that appears, select **Local Files** as the storage type.
5. In the **** field, type a name for the storage to appear in the Label Studio UI.
6. Specify an **Absolute local path** to the directory with your files. The local path must be an absolute path and include the `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` value. 

    For example, if `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/home/user`, then your local path must be `/home/user/dataset1`. For more about that environment variable, see [Run Label Studio on Docker and use local storage](https://labelstud.io/guide/start#Run-Label-Studio-on-Docker-and-use-Local-Storage).  

!!! note
    If you are using Windows, ensure that you use backslashes when entering your **Absolute local path**.  

1. (Optional) In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
2. (Optional) In the **Import method** dropdown, choose how to import your data:
   - **Files** - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT). Use this if you want to create Label Studio tasks from media files automatically. Use this option for labeling configurations with one source tag.
   - **Tasks** - Treat each JSON, JSONL, or Parquet as a task definition (one or more tasks per file). Use this if you want to import tasks in Label Studio JSON format directly from your storage. Use this option for complex labeling configurations with HyperText or multiple source tags.    
3. Click **Add Storage**.
4.  Repeat these steps for **Add Target Storage** to use a local file directory for exporting.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_localfiles_sync_create).

### Tasks with local storage file references 
In cases where your tasks have multiple or complex input sources, such as multiple object tags in the labeling config or a HyperText tag with custom data values, you must prepare tasks manually. 

In those cases, you have to repeat all stages above to create local storage, but skip *optional* stages. Your **Absolute local path** have to lead to directory with files (not tasks) that you want to include by task, it also can contain other directories or files, you will specified them inside task. 

Differences with instruction above: 
- **7. File Filter Regex** - stay empty (because you will specify it inside tasks)
- **8. Import method** - select **"Tasks"** (because you will specify file references inside your JSON task definitions)

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
If you're using Label Studio in Docker, you need to mount the local directory that you want to access as a volume when you start the Docker container. See [Run Label Studio on Docker and use local storage](https://labelstud.io/guide/start#Run-Label-Studio-on-Docker-and-use-Local-Storage).

<div class="opensource-only">

!!! note "Community Edition auto-detection for Docker"
    In the open source Community Edition, if `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` and `LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED` are not set, Label Studio automatically looks in the current working directory for folders named `mydata` or `label-studio-data`.
    When you use the official Docker image, the application runs from `/label-studio`, so you can mount a host folder to `/label-studio/mydata` or `/label-studio/label-studio-data` inside the container to enable local file serving without additional configuration.

</div>




## Databricks Files (UC Volumes)

<div class="enterprise-only">

Connect Label Studio Enterprise to Databricks Unity Catalog (UC) Volumes to import files as tasks and export annotations as JSON back to your volumes. This connector uses the Databricks Files API and operates only in proxy mode (presigned URLs are not supported by Databricks).

### Prerequisites
- A Databricks workspace URL (Workspace Host), for example `https://adb-12345678901234.1.databricks.com` (or Azure domain).

    See [Create a workspace](https://docs.databricks.com/aws/en/admin/workspace/) and [Get identifiers for workspace objects](https://docs.databricks.com/aws/en/workspace/workspace-details#workspace-url).
- A Databricks Personal Access Token (PAT) with permission to access the Files API. 

    You can generate tokens from **Settings > Developer**. See [Databricks personal access token authentication](https://docs.databricks.com/en/dev-tools/auth/pat.html). 
- A UC Volume path under `/Volumes/<catalog>/<schema>/<volume>` with files you want to label. 
  
    See [What are Unity Catalog volumes?](https://docs.databricks.com/aws/en/volumes/).

### Create a source storage connection in the Label Studio UI

From Label Studio, open your project and select **Settings > Cloud Storage > Add Source Storage**.

Select **Databricks Files (UC Volumes)** and click **Next**.

#### Configure Connection

Complete the following fields and then click **Test connection**:

<div class="noheader rowheader">

| | |
| --- | --- |
| Storage Title | Enter a name for the storage connection to appear in Label Studio. | 
| Workspace Host | Enter your workspace URL, for example `https://<workspace-identifier>.cloud.databricks.com` |
| Access Token | Enter your personal access token that you generated in Databricks. |
| Catalog <br> Schema <br> Volume | Specify your volume path (UC coordinates). You can find this from the **Catalog Explorer** in Databricks (see screenshot below). |

</div>

![Screenshot of Databricks UI and LS UI](/images/storages/databricks-volume.png)

#### Import Settings & Preview

Complete the following fields and then click **Load preview** to ensure you are syncing the correct data:

<div class="noheader rowheader">

| | |
| --- | --- |
| Bucket Prefix | Optionally, enter the directory name within the volume that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  | 
| Import Method | Select whether you want create a task for each file in your container or whether you would like to use a JSON/JSONL/Parquet file to define the data for each task. |
| File Name Filter | Specify a regular expression to filter bucket objects. Use `.*` to collect all objects. |
| Scan all sub-folders | Enable this option to perform a recursive scan across subfolders within your container. |

</div>

#### Review & Confirm

If everything looks correct, click **Save & Sync** to sync immediately, or click **Save** to save your settings and sync later.

!!! note "URI schema"
    To reference Databricks files directly in task JSON (without using source storage), use Label Studio’s Databricks URI scheme:
    
    `dbx://Volumes/<catalog>/<schema>/<volume>/<path>`
    
    Example:
    
    `{ "image": "dbx://Volumes/main/default/dataset/images/1.jpg" }`
    


!!! note "Troubleshooting"
    - If your file preview returns zero files, verify the path under `/Volumes/<catalog>/<schema>/<volume>/<prefix?>` and your PAT permissions.
    - Ensure the Workspace Host has no trailing slash and matches your workspace domain.
    - If previews work but media fails to load, confirm proxy mode is allowed for your organization in Label Studio (**Organization > Usage & License > Features**) and network egress allows Label Studio to reach Databricks.


!!! warning "Proxy and security"
    This connector streams data **through the Label Studio backend** with HTTP Range support. Databricks does not support presigned URLs, so this option is also not available in Label Studio.

### Create a target storage connection in the Label Studio UI

Repeat the steps from the previous section but using **Add Target Storage**. Use the same workspace host, token, and volume path (UC coordinates). 

For your **Bucket Prefix**, set an export folder to use (e.g., `exports/${project_id}`) and determine whether you want to allow files to be deleted from target storage. 

When file deletion is enabled, if you delete an annotation in Label Studio (via UI or API), Label Studio will also delete the corresponding exported JSON file from your target storage for this storage connection. 

Note that this only affects files that were exported by that target storage, not your source media or tasks. Your PAT permissions must also allow deletion.

After adding, click **Sync** to export annotations as JSON files to your target volume.

</div>

<div class="opensource-only">

### Use Databricks Files in Label Studio Enterprise

Databricks Unity Catalog (UC) Volumes integration is available in Label Studio Enterprise. It lets you:

- Import files directly from UC Volumes under `/Volumes/<catalog>/<schema>/<volume>`
- Stream media securely via the platform proxy (no presigned URLs)
- Export annotations back to your Databricks Volume as JSON

Learn more and see the full setup guide in the Enterprise documentation: 

[Databricks Files (UC Volumes)](https://docs.humansignal.com/guide/storage#Databricks-Files-UC-Volumes). 

If your organization needs governed access to Databricks data with Unity Catalog, consider [Label Studio Enterprise](https://humansignal.com/).

</div>



## Troubleshooting cloud storage

<div class="opensource-only">

For more troubleshooting information, see [Troubleshooting Label Studio](troubleshooting).

</div>

<div class="enterprise-only">

For more troubleshooting information, see [Troubleshooting Import, Export, & Storage](https://support.humansignal.com/hc/en-us/sections/16982163062029-Import-Export-Storage) in the HumanSignal support center.

</div>
