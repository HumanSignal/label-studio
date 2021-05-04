---
title: Sync data from external storage
type: guide
order: 302
meta_title: Cloud Storage Integration
meta_description: Label Studio Documentation for integrating Amazon AWS S3, Google Cloud Storage, Microsoft Azure, Redis, and local file directories with Label Studio to collect data labeling tasks and sync annotation results into your machine learning pipelines for machine learning and data science projects.
---

Integrate popular cloud storage systems with Label Studio to collect new items uploaded to the buckets and return the annotation results so that you can use them in your machine learning pipelines.

Set up the following cloud and other storage systems with Label Studio:
- [Amazon S3](#Amazon-S3)
- [Google Cloud Storage](#Google-Cloud-Storage)
- [Microsoft Azure Blob storage](#Microsoft-Azure-Blob-storage)
- [Redis database](#Redis-database)
- [Local storage](#Local-storage)

Each source and target storage setup is project-specific. You can connect multiple buckets as source or target storage for a project. 

If you upload new data to a connected cloud storage bucket, sync the storage connection to add the new labeling tasks to Label Studio without restarting. 

> Note: Choose your target storage carefully. When you start the labeling project, it must be empty or contain annotations that match previously created or imported tasks from source storage. Tasks are synced with annotations based on internal IDs, so if you accidentally connect to target storage with existing annotations with the same IDs, the connection might fail with undefined behavior.  

## Amazon S3

To connect your [S3](https://aws.amazon.com/s3) bucket with Label Studio, make sure you have programmatic access enabled. [See the Amazon Boto3 configuration documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration) for more on how to set up access to your S3 bucket.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Amazon S3** as the storage type.
5. Specify the name of the S3 bucket.
6. (Optional) Adjust the remaining parameters. See [Optional parameters](#Optional-parameters) on this page for more details.
7. Click **Add Storage**.
8. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

### Optional parameters

You can specify additional parameters from the Label Studio UI. 

| Parameter | Description | Default |
| --- | --- | --- |
| prefix | Specify an internal folder or container | empty | 
| regex | Specify a regular expression to filter bucket objects. Use `.*` to collect all objects. | Skips all bucket objects. |
| use_blob_urls | If true, treat every bucket object as a source file. Use for resources like JPG, MP3, or similar file types. If false, bucket objects are interpreted as tasks in Label Studio JSON format with one object per task. | false |


### Create connection on startup

For Label Studio versions earlier than 1.0.0, you can use command line arguments to start Label Studio and configure the connection to your S3 bucket, scan for existing tasks, and load them into the labeling app. 

> Starting in Label Studio 1.0.0 you can only configure cloud storage from the Label Studio UI because the settings are per-project. 

#### Read a bucket with JSON-formatted tasks

```bash
label-studio start my_project --init --source s3 --source-path my-s3-bucket
```

#### Write annotations to the bucket

```bash
label-studio start my_project --init --target s3-completions --target-path my-s3-bucket
```

### Troubleshoot CORS and access problems

If you have trouble accessing bucket objects in Label Studio, check your web browser console for errors.

- If you see CORS problems, see [Configuring and using cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) in the Amazon S3 User Guide.
 <img src='/images/cors-error-2.png' style="opacity: 0.9; max-width: 500px">

- Make sure you specified the region when creating a new bucket. Don't forget to change it in your source or target storage settings or the `.aws/config` file, otherwise you might have problems accessing your bucket objects.

    E.g.: `~/.aws/config`
    
    ```
    [default]
    region=us-east-2  # change to the region of your bucket
    ```

- If you're using an older version of Label Studio, upgrade to a version >= 0.7.5 that has a signature version s3v4 to support more AWS regions.

- If you see 403 errors, make sure you have the correct credentials configured. See [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) in the Amazon AWS Command Line Interface User Guide. 
 

### Working with Binary Large OBjects (BLOBs)

When you store BLOBs in your S3 bucket (like images or audio files), you might want to use them as is, by generating URLs pointing to those objects (e.g. `gs://my-s3-bucket/image.jpg`)

Label Studio lets you generate input tasks with corresponding URLs when you set up cloud storage sync in the Label Studio UI. Set the **treat every bucket object as a source file** option to true when setting up the cloud storage. 

For versions of Label Studio earlier than 1.0.0, you can generate task URLs from the command line by specifying `--source-params` when launching the app:

```bash
label-studio start my_project --init --source s3 --source-path my-s3-bucket --source-params "{\"data_key\": \"my-object-tag-$value\", \"use_blob_urls\": true, \"regex\": ".*"}"
```

You can also skip or leave the `"data_key"` parameter empty and Label Studio automatically generates input tasks from the first task key in the label config, which can be useful when you only have one object tag exposed.


## Google Cloud Storage

To connect your [GCS](https://cloud.google.com/storage) bucket with Label Studio, make sure you have programmatic access enabled. See [Cloud Storage Client Libraries](https://cloud.google.com/storage/docs/reference/libraries) in the Google Cloud Storage documentation for how to set up access to your GCS bucket.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Google Cloud Storage** as the storage type.
5. Specify the name of the GCS bucket.
6. (Optional) Adjust the remaining parameters. See [Optional parameters](#Optional-parameters-1) on this page for more details.
7. Click **Add Storage**.
8. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

### Optional parameters

You can specify additional parameters from the Label Studio UI.

| Parameter | Description | Default |
| --- | --- | --- |
| prefix | Specify an internal folder or container | empty | 
| regex | Specify a regular expression to filter bucket objects. Use `.*` to collect all objects. | Skips all bucket objects. |
| create_local_copy | If true, creates a local copy of the remote storage. | true |
| use_blob_urls | If true, treat every bucket object as a source file. Use for resources like JPG, MP3, or similar file types. If false, bucket objects are interpreted as tasks in Label Studio JSON format with one object per task. | false |


### Create connection on startup

For Label Studio versions earlier than 1.0.0, you can use command line arguments to start Label Studio, configure the connection to your GCS bucket, scan for existing tasks, and load them into the app for labeling.

> Starting in Label Studio 1.0.0 you can only configure cloud storage from the Label Studio UI because the settings are per-project. 

#### Read a bucket with JSON-formatted tasks

```bash
label-studio start my_project --init --source gcs --source-path my-gcs-bucket
```

#### Write annotations to a bucket

```bash
label-studio start my_project --init --target gcs-completions --source-path my-gcs-bucket
```

### Troubleshoot CORS and access problems

If you have trouble accessing bucket objects in Label Studio, check your web browser console for errors.

- If you see CORS problems, see [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors) in the Google Cloud Storage documentation.
 <img src='/images/cors-error-2.png' style="opacity: 0.9; max-width: 500px">
 
- If you see 403 errors, make sure you have the correct credentials configured. See [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) in the Google Cloud Storage documentation. 

### Working with Binary Large OBjects (BLOBs)

When you store BLOBs in your GCS bucket, like images or audio files, you might want to use them as is and generate URLs pointing to those objects. For example, `gs://my-gcs-bucket/image.jpg`. 

Label Studio lets you generate input tasks with corresponding URLs when you set up cloud storage sync in the Label Studio UI. Set the **treat every bucket object as a source file** option to true when setting up the cloud storage. 

For versions of Label Studio earlier than 1.0.0, you can generate task URLs from the command line by specifying `--source-params` when launching the app:

```bash
label-studio start my_project --init --source gcs --source-path my-gcs-bucket --source-params "{\"data_key\": \"my-object-tag-$value\", \"use_blob_urls\": true, \"regex\": ".*"}"
```

You can also skip or leave the `"data_key"` parameter empty and Label Studio automatically generates input tasks from the first task key in the label config, which can be useful when you only have one object tag exposed.


##  Microsoft Azure Blob storage

Connect your [Microsoft Azure Blob storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) container with Label Studio. 

You must set two environment variables in Label Studio to connect to Azure Blob storage:

- AZURE_BLOB_ACCOUNT_NAME - The name of the storage account
- AZURE_BLOB_ACCOUNT_KEY - The secret key to the storage account

Configure the specific Azure Blob container that you want Label Studio to use in the UI or with the command-line interface parameters.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.  
4. In the dialog box that appears, select **Microsoft Azure** as the storage type.
5. Specify the name of the Azure Blob container.
6. (Optional) Adjust the remaining parameters. See [Optional parameters](#Optional-parameters-2) on this page for more details.
7. Click **Add Storage**.
8. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

### Optional parameters

You can specify additional parameters from the Label Studio UI.

| Parameter | Description | Default |
| --- | --- | --- |
| prefix | Specify an internal folder or container | empty | 
| regex | Specify a regular expression to filter bucket objects. Use `.*` to collect all objects. | Skips all bucket objects. |
| create_local_copy | If true, creates a local copy of the remote storage. | true |
| use_blob_urls | If true, treat every bucket object as a source file. Use for resources like JPG, MP3, or similar file types. If false, bucket objects are interpreted as tasks in Label Studio JSON format with one object per task. | false |


### Create connection on startup

For Label Studio versions earlier than 1.0.0, you can use command line arguments to start Label Studio, configure the connection to your Azure Blob storage, scan for existing tasks, and load them into the app for labeling.

> Starting in Label Studio 1.0.0 you can only configure cloud storage from the Label Studio UI because the settings are per-project. 

#### Read an Azure storage container with JSON-formatted tasks

```bash
label-studio start my_project --init --source azure-blob --source-path my-az-container-name
```

#### Write annotations to an Azure storage container

```bash
label-studio start my_project --init --target azure-blob --source-path my-az-container-name
```

### Working with Binary Large OBjects (BLOBs)

When you store BLOBs in your Azure Storage Container (like images or audio files), you might want to use them as is, by generating URLs pointing to those objects (e.g. `azure-blob://container-name/image.jpg`)

Label Studio lets you generate input tasks with corresponding URLs when you set up cloud storage sync in the Label Studio UI. Set the **treat every bucket object as a source file** option to true when setting up the cloud storage. 

For versions of Label Studio earlier than 1.0.0, you can generate task URLs from the command line by specifying `--source-params` when launching the app:

```bash
label-studio start my_project --init --source azure-blob --source-path my-az-container-name --source-params "{\"data_key\": \"my-object-tag-$value\", \"use_blob_urls\": true, \"regex\": ".*"}"
```

You can also skip or leave the `"data_key"` parameter empty and Label Studio automatically generates input tasks from the first task key in the label config, which can be useful when you only have one object tag exposed.


## Redis database

You can also store your tasks and annotations in a [Redis database](https://redis.io/). You must store the tasks and annotations in different databases. 

You might want to use a Redis database if you find that relying on a file-based cloud storage connection is slow for your datasets. 

Currently, this is only supported if the Redis database is hosted in the default mode, with the default IP address. 

You can integrate Label Studio with Redis, but Label Studio does not manage the Redis database for you. See the [Redis Quick Start](https://redis.io/topics/quickstart) for details about hosting and managing your own Redis database.

Because Redis is an in-memory database, data saved in Redis does not persist. To make sure you don't lose data, set up [Redis persistence](https://redis.io/topics/persistence) or use another method to persist the data, such as using Redis in the cloud with [Microsoft Azure](https://azure.microsoft.com/en-us/services/cache/) or [Amazon AWS](https://aws.amazon.com/redis/).


### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. For a specific project, open **Settings > Cloud Storage**.
3. Click **Add Source Storage**.   
4. In the dialog box that appears, select **Redis Database** as the storage type.
5. (Optional) Update Redis configuration parameters. See [Optional Redis configuration parameters](#Optional-Redis-configuration-parameters) on this page for the list.
7. Click **Add Storage**.
8. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

### Optional Redis configuration parameters

You can specify additional parameters from the Label Studio UI.

| Parameter | Description | Default |
| --- | --- | --- |
| project_path | Path to the Label Studio project
| path | Specify the path to the database | None | 
| db | The Redis database to use | 1 (for source) or 2 (for target) | 
| host | IP of the server hosting the database | None |
| port | Port of the server hosting the database | None |
| password | Server password | None |

### Create connection on startup

Run the following command to launch Label Studio, configure the connection to your Redis database, scan for existing tasks, and load them into the app for labeling for a specific project.

```bash
label-studio start my_project --init --db redis 
```

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
4. In the dialog box that appears, select **Local Files** as the storage type. 
5. Specify **Local path** directory with your files. The local path must be an absolute path and include the LOCAL_FILES_DOCUMENT_ROOT. For example, if `LOCAL_FILES_DOCUMENT_ROOT=/home/user`, then your local path must be `/home/user/dataset1`. For more about that environment variable, see [Run Label Studio on Docker and use local storage](start.html#Run_Label_Studio_on_Docker_and_use_local_storage)
6. Toggle **Treat every bucket object as a source file**. 
   - Enable this option if you want to create Label Studio tasks from media files automatically. Use this option for labeling configurations with one source tag.
   - Disable this option if you want to import tasks in Label Studio JSON format directly from your storage. Use this option for complex labeling configurations with HyperText or multiple source tags.    
7. (Optional) Adjust the remaining parameters. See [Optional parameters](#Optional-parameters-3) on this page for more details.
8. Click **Save**.
9. Repeat these steps for **Add Target Storage** to use a local file directory for exporting.
 
<br>
<img src="/images/local-storage-settings.png" style="border: 1px solid #eee">

### Optional parameters

You can specify additional parameters from the Label Studio UI.

| Parameter | Description | Default |
| --- | --- | --- | 
| regex | Specify a regular expression to filter directory objects. Use `.*` to collect all objects. | Skips all directory objects. |
| use_blob_urls | If true, treat every directory object as a source file. Use for resources like JPG, MP3, or similar file types. If false, directory objects are interpreted as tasks in Label Studio JSON format with one object per task. | false |

### Set up local storage with Docker
If you're using Label Studio in Docker, you need to mount the local directory that you want to access as a volume when you start the Docker container. See [Run Label Studio on Docker and use local storage](start.html#Run-Label-Studio-on-Docker-and-use-local-storage).




