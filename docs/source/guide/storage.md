---
title: Sync data from external storage
type: guide
order: 302
meta_title: Cloud Storage Integration
meta_description: Label Studio Documentation for integrating Amazon AWS S3, Google Cloud Storage, Microsoft Azure, Redis, and local file directories with Label Studio to collect data labeling tasks and sync annotation results into your machine learning pipelines for machine learning and data science projects.
---

Integrate popular cloud and external storage systems with Label Studio to collect new items uploaded to the buckets, containers, databases, or directories and return the annotation results so that you can use them in your machine learning pipelines.

Set up the following cloud and other storage systems with Label Studio:
- [Amazon S3](#Amazon-S3)
- [Google Cloud Storage](#Google-Cloud-Storage)
- [Microsoft Azure Blob storage](#Microsoft-Azure-Blob-storage)
- [Redis database](#Redis-database)
- [Local storage](#Local-storage)

Each source and target storage setup is project-specific. You can connect multiple buckets, containers, databases, or directories as source or target storage for a project. 

If you upload new data to a connected cloud storage bucket, sync the storage connection to add the new labeling tasks to Label Studio without restarting. 

> Choose your target storage carefully. When you start the labeling project, the target storage must be empty or contain annotations that match previously created or imported tasks from source storage. Tasks are synced with annotations based on internal IDs, so if you accidentally connect to target storage with existing annotations with the same IDs, the connection might fail with undefined behavior.  

## Amazon S3

To connect your [S3](https://aws.amazon.com/s3) bucket with Label Studio, make sure you have programmatic access enabled. [See the Amazon Boto3 configuration documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration) for more on how to set up access to your S3 bucket.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Amazon S3** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
6. Specify the name of the S3 bucket, and if relevant, the bucket prefix to specify an internal folder or container.
7. Adjust the remaining optional parameters:
    - In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
    - In the **Region Name** field, specify the AWS region name. For example `us-east-1`.
    - In the **S3 Endpoint** field, specify an S3 endpoint.
    - In the **Access Key ID** field, specify the access key ID for your AWS account.
    - In the **Secret Access Key** field, specify the secret key for your AWS account.
    - In the **Session Token** field, specify a session token for your AWS account. 
    - Enable **Treat every bucket object as a source file** if your bucket contains BLOB storage files such as JPG, MP3, or similar file types. This setting creates a URL for each bucket object to use for labeling. Leave this option disabled if you have multiple JSON files in the bucket with one task per JSON file. 
    - Choose whether to disable **Use pre-signed URLs**. For example, if you host Label Studio in the same AWS network as your storage buckets, you can disable presigned URLs and have direct access to the storage using `s3://` links.
    - Adjust the counter for how many minutes the pre-signed URLs are valid.
8. Click **Add Storage**.
9. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_s3_sync_create).

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_s3_create). 
- See [Create export storage](/api#operation/api_storages_export_s3_create).

## Google Cloud Storage

Dynamically import tasks and export annotations to Google Cloud Storage (GCS) buckets in Label Studio. 

### Prerequisites

To connect your [GCS](https://cloud.google.com/storage) bucket with Label Studio, set up the following:
- **Enable programmatic access to your bucket.** See [Cloud Storage Client Libraries](https://cloud.google.com/storage/docs/reference/libraries) in the Google Cloud Storage documentation for how to set up access to your GCS bucket.
- **Set up authentication to your bucket.** Your account must have the **Service Account Token Creator** role. See [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) in the Google Cloud Storage documentation. Use the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to specify a JSON file with GCS credentials. For example:
```bash
  export GOOGLE_APPLICATION_CREDENTIALS=json-file-with-GCP-creds-23441-8f8sd99vsd115a.json
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
    - Choose whether to disable **Use pre-signed URLs**. For example, if you host Label Studio in the same network as your storage buckets, you can disable presigned URLs and have direct access to the storage.
    - Adjust the counter for how many minutes the pre-signed URLs are valid.
8. Click **Add Storage**.
9. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_gcs_sync_create).

### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_gcs_create). 
- See [Create export storage](/api#operation/api_storages_export_gcs_create).

##  Microsoft Azure Blob storage

Connect your [Microsoft Azure Blob storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) container with Label Studio. 

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
- See [Create new import storage](/api#operation/api_storages_azure_create). 
- See [Create export storage](/api#operation/api_storages_export_azure_create).

## Redis database

You can also store your tasks and annotations in a [Redis database](https://redis.io/). You must store the tasks and annotations in different databases. You might want to use a Redis database if you find that relying on a file-based cloud storage connection is slow for your datasets. 

Currently, this configuration is only supported if the Redis database is hosted in the default mode, with the default IP address. 

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
- See [Create new import storage](/api#operation/api_storages_redis_create). 
- See [Create export storage](/api#operation/api_storages_export_redis_create).

## Local storage
If you have local files that you want to add to Label Studio from a specific directory, you can set up a specific local directory on the machine where LS is running as source or target storage. Label Studio steps through the directory recursively to read tasks.

### Tasks with local storage file references 
In cases where your tasks have multiple or complex input sources, such as multiple object tags in the labeling config or a HyperText tag with custom data values, you must prepare tasks manually. 

In those cases, you can add local storage without syncing (to avoid automatic task creation from storage files) and specify the local files in your data values. For example, to specify multiple data types in the Label Studio JSON format, specifically an audio file `1.wav` and an image file `1.jpg`:
```
{
 "data": {
    "audio": "/data/local-files/?d=dataset1/1.wav",
    "image": "/data/local-files/?d=dataset1/1.jpg"
  }
}
```

### Prerequisites
Add these variables to your environment setup:
- `LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true`
- `LOCAL_FILES_DOCUMENT_ROOT=/home/user` (or `LOCAL_FILES_DOCUMENT_ROOT=C:\\data\\media` for Windows).

Without these settings, Local storage and URLs in tasks that point to local files won't work. Keep in mind that serving data from the local file system can be a **security risk**. See [Set environment variables](start.html#Set_environment_variables) for more about using environment variables.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.
   <img src="/images/local-storage-settings.png" alt="Screenshot of the storage settings modal described in the preceding steps." width=670 height=490 style="border: 1px solid #eee">
4. In the dialog box that appears, select **Local Files** as the storage type.
5. In the **Storage Title** field, type a name for the storage to appear in the Label Studio UI.
5. Specify an **Absolute local path** to the directory with your files. The local path must be an absolute path and include the `LOCAL_FILES_DOCUMENT_ROOT` value. 
   For example, if `LOCAL_FILES_DOCUMENT_ROOT=/home/user`, then your local path must be `/home/user/dataset1`. For more about that environment variable, see [Run Label Studio on Docker and use local storage](start.html#Run_Label_Studio_on_Docker_and_use_local_storage).    
6. (Optional) In the **File Filter Regex** field, specify a regular expression to filter bucket objects. Use `.*` to collect all objects.
7. (Optional) Toggle **Treat every bucket object as a source file**. 
   - Enable this option if you want to create Label Studio tasks from media files automatically, such as JPG, MP3, or similar file types. Use this option for labeling configurations with one source tag.
   - Disable this option if you want to import tasks in Label Studio JSON format directly from your storage. Use this option for complex labeling configurations with HyperText or multiple source tags.    
8. Click **Add Storage**.
9. Repeat these steps for **Add Target Storage** to use a local file directory for exporting.
 
After adding the storage, click **Sync** to collect tasks from the bucket, or make an API call to [sync import storage](/api#operation/api_storages_localfiles_sync_create).

#### Add storage with the Label Studio API
You can also create a storage connection using the Label Studio API. 
- See [Create new import storage](/api#operation/api_storages_localfiles_create). 
- See [Create export storage](/api#operation/api_storages_export_localfiles_create).

### Set up local storage with Docker
If you're using Label Studio in Docker, you need to mount the local directory that you want to access as a volume when you start the Docker container. See [Run Label Studio on Docker and use local storage](start.html#Run-Label-Studio-on-Docker-and-use-local-storage).



## Troubleshoot CORS and access problems

Troubleshoot some common problems when using cloud or external storage with Label Studio. 

### I can't see the data in my tasks
Check your web browser console for errors.

- If you see CORS problems, make sure you have CORS set up properly. 
     <img src='/images/cors-error-2.png' style="opacity: 0.9; max-width: 500px">
    - For Amazon S3, see [Configuring and using cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) in the Amazon S3 User Guide.
    - For GCS, see [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors) in the Google Cloud Storage documentation.
    - For Microsoft Azure, see [Cross-Origin Resource Sharing (CORS) support for Azure Storage](https://docs.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services) in the Microsoft Azure documentation. 
- If you see 403 errors, make sure you configured the correct credentials. 
    - For Amazon S3, see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) in the Amazon AWS Command Line Interface User Guide.
    - For GCS, see [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) in the Google Cloud Storage documentation. Your account must have the `Service Account Token Creator` role. 
    
- For Amazon S3, make sure you specified the correct region when creating a bucket. If needed, change the region in your source or target storage settings or the `.aws/config` file, otherwise you might have problems accessing your bucket objects.
    For example, update the following: `~/.aws/config`
    
    ```
    [default]
    region=us-east-2  # change to the region of your bucket
    ```

### Tasks do not sync

If you're pressing the **Sync** button but tasks do not sync, or you can't see the new tasks in the Data Manager, check the following:

- Make sure you specified the correct credentials.
    - For Amazon S3, see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) in the Amazon AWS Command Line Interface User Guide. Also be sure to check that they work from the [aws client](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).
    - For GCS, see [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) in the Google Cloud Storage documentation. Your account must have the `Service Account Token Creator` role. 
    
- Make sure that files exist under the specified bucket or container prefix, and that your file filter regex matches them. When you set the prefix, subfolders are not recursively scanned.

### Tasks don't load the way I expect

If the tasks sync to Label Studio but don't appear the way that you expect, maybe with URLs instead of images or with one task where you expect to see many, check the following:
- If you're placing JSON files in [cloud storage](storage.html), place 1 task in each JSON file in the storage bucket. If you want to upload a JSON file from your machine directly into Label Studio, you can place multiple tasks in one JSON file. 
- If you're syncing image or audio files, make sure **Treat every bucket object as a source file** is enabled. 
