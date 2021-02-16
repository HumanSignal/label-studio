---
title: Cloud storages
type: guide
order: 103
---

Integrate popular cloud storage systems with Label Studio to collect new items uploaded to the buckets and return the annotation results so that you can use them in your machine learning pipelines.

You can configure the storage type, bucket, and prefixes when you start the Label Studio server, or while Label Studio is running on the **Settings** page.

You can configure one or both:

- _source storage_ (where tasks are stored)
- _target storage_ (where completions are stored)

The connection to both storage buckets is synced, so you can see new tasks after uploading them to the bucket without restarting Label Studio.

You can change parameters like the prefix or matching filename regex at any time from the Label Studio UI.

> Note: Choose your target storage carefully. When you start the labeling project, it must be empty or contain completions that match previously created or imported tasks from source storage. Tasks are synced with completions based on internal IDs (keys in `source.json`/`target.json` files in your project directory), so if you accidentally connect to the target storage with existing completions with the same IDs, the connection might fail with undefined behavior.  

Set up the following cloud and other storage systems with Label Studio:
- [Amazon S3](#amazon-s3)
- [Google Cloud Storage](#google-cloud-storage)
- [Microsoft Azure Blob storage](#microsoft-azure-blob-storage)
- [Redis database](#redis-database)

## Amazon S3

To connect your [S3](https://aws.amazon.com/s3) bucket with Label Studio, make sure you have programmatic access enabled. [See the Amazon Boto3 configuration documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration) for more on how to set up access to your S3 bucket.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. Open **Settings > Cloud storage sync**.
3. For **Source Storage**, click the gear icon. 
4. In the dialog box that appears, select **Amazon S3** as the storage type.
5. Specify the path to the S3 bucket.
6. (Optional) Adjust the remaining parameters. See [Optional parameters](#optional-parameters) on this page for more details.
7. Click **Apply & Sync Tasks**.
8. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

### Create connection on startup

The following commands launch Label Studio, configure the connection to your S3 bucket, scan for existing tasks, and load them into the labeling app.

#### Read a bucket with JSON-formatted tasks

```bash
label-studio start my_project --init --source s3 --source-path my-s3-bucket
```

#### Write completions to the bucket

```bash
label-studio start my_project --init --target s3-completions --target-path my-s3-bucket
```

### Troubleshoot CORS and access problems

If you have trouble accessing bucket objects in Label Studio, check your web browser console (Ctrl + Shift + i in Chromium) for errors.

* If you see CORS problems, see [Configuring and using cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) in the Amazon S3 User Guide.
 <img src='/images/cors-error-2.png' style="opacity: 0.9; max-width: 500px">

* Make sure you specified the region when creating a new bucket. Don't forget to change it in your `.aws/config` file, otherwise you will have problems accessing your bucket objects.

    E.g.: `~/.aws/config`
    
    ```
    [default]
    region=us-east-2  # change to the region of your bucket
    ```

* If you're using an older version of Label Studio, upgrade to a version >= 0.7.5 that has a signature version s3v4 to support more AWS regions.

* If you see 403 errors, make sure you have the correct credentials configured. See [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) in the Amazon AWS Command Line Interface User Guide. 
 

### Working with Binary Large OBjects (BLOBs)

When you store BLOBs in your S3 bucket (like images or audio files), you might want to use them as is, by generating URLs pointing to those objects (e.g. `gs://my-s3-bucket/image.jpg`)
Label Studio lets you generate input tasks with corresponding URLs automatically. You can do this by specifying `--source-params` when launching the app:

```bash
label-studio start my_project --init --source s3 --source-path my-s3-bucket --source-params "{\"data_key\": \"my-object-tag-$value\", \"use_blob_urls\": true, \"regex\": ".*"}"
```

You can also skip or leave the `"data_key"` parameter empty and Label Studio automatically generates input tasks from the first task key in the label config, which can be useful when you only have one object tag exposed.


### Optional parameters

You can specify additional parameters with a command line escaped JSON string via `--source-params` / `--target-params` or from the UI.

| Parameter | Description | Default |
| --- | --- | --- |
| prefix | Specify an internal folder or container | empty | 
| regex | Specify a regular expression to filter bucket objects. Use ".*" to collect all objects. | Skips all bucket objects. |
| create_local_copy | If true, creates a local copy of the remote storage. | true |
| use_blob_urls | If true, generate task data with URLs pointed to your bucket objects. Use for resources like JPG, MP3, or similar file types. If false, bucket objects are interpreted as tasks in Label Studio JSON format with one object per task. | false |


## Google Cloud Storage

To connect your [GCS](https://cloud.google.com/storage) bucket with Label Studio, make sure you have programmatic access enabled. See [Cloud Storage Client Libraries](https://cloud.google.com/storage/docs/reference/libraries) in the Google Cloud Storage documentation for how to set up access to your GCS bucket.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. Open **Settings > Cloud storage sync**.
3. For **Source Storage**, click the gear icon. 
4. In the dialog box that appears, select **Google Cloud Storage** as the storage type.
5. Specify the path to the GCS bucket.
6. (Optional) Adjust the remaining parameters. See [Optional parameters](#optional-parameters) on this page for more details.
7. Click **Apply & Sync Tasks**.
8. Repeat these steps for **Target Storage** to sync completed data annotations to a bucket.

### Create connection on startup

The following commands launch Label Studio, configure the connection to your GCS bucket, scan for existing tasks, and load them into the app for labeling.

#### Read a bucket with JSON-formatted tasks

```bash
label-studio start my_project --init --source gcs --source-path my-gcs-bucket
```

#### Write completions to a bucket

```bash
label-studio start my_project --init --target gcs-completions --source-path my-gcs-bucket
```

### Troubleshoot CORS and access problems

If you have trouble accessing bucket objects in Label Studio, check your web browser console (Ctrl + Shift + i in Chromium) for errors.

* If you see CORS problems, see [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors) in the Google Cloud Storage documentation.
 <img src='/images/cors-error-2.png' style="opacity: 0.9; max-width: 500px">
* If you see 403 errors, make sure you have the correct credentials configured. See [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) in the Google Cloud Storage documentation. 

### Working with Binary Large OBjects (BLOBs)

When you store BLOBs in your GCS bucket (like images or audio files), you might want to use them as is, by generating URLs pointing to those objects (e.g. `gs://my-gcs-bucket/image.jpg`)
Label Studio lets you generate input tasks with corresponding URLs automatically. You can do this by specifying `--source-params` when launching the app:

```bash
label-studio start my_project --init --source gcs --source-path my-gcs-bucket --source-params "{\"data_key\": \"my-object-tag-$value\", \"use_blob_urls\": true, \"regex\": ".*"}"
```

You can also skip or leave the `"data_key"` parameter empty and Label Studio automatically generates input tasks from the first task key in the label config, which can be useful when you only have one object tag exposed.


### Optional parameters

You can specify additional parameters with a command line escaped JSON string via `--source-params` / `--target-params` or from the UI.

| Parameter | Description | Default |
| --- | --- | --- |
| prefix | Specify an internal folder or container | empty | 
| regex | Specify a regular expression to filter bucket objects. Use ".*" to collect all objects. | Skips all bucket objects. |
| create_local_copy | If true, creates a local copy of the remote storage. | true |
| use_blob_urls | If true, generate task data with URLs pointed to your bucket objects. Use for resources like JPG, MP3, or similar file types. If false, bucket objects are interpreted as tasks in Label Studio JSON format with one object per task. | false |


##  Microsoft Azure Blob storage

Connect your [Microsoft Azure Blob storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) container with Label Studio. 

You must set two environment variables in Label Studio to connect to Azure Blob storage:

- AZURE_BLOB_ACCOUNT_NAME - The name of the storage account
- AZURE_BLOB_ACCOUNT_KEY - The secret key to the storage account

Configure the specific Azure Blob container that you want Label Studio to use in the UI or with the command-line interface parameters.

### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. Open **Settings > Cloud storage sync**.
3. For **Source Storage**, click the gear icon. 
4. In the dialog box that appears, select **Azure Blob Storage** as the storage type.
5. Specify the name of the Azure Blob container.
6. (Optional) Adjust the remaining parameters. See [Optional parameters](#optional-parameters) on this page for more details.
7. Click **Apply & Sync Tasks**.
8. Repeat these steps for **Target Storage** to sync completed data annotations to a container.

### Create connection on startup

The following commands launch Label Studio, configure the connection to your Azure Blob storage, scan for existing tasks, and load them into the app for labeling.

#### Read an Azure storage container with JSON-formatted tasks

```bash
label-studio start my_project --init --source azure-blob --source-path my-az-container-name
```

#### Write completions to an Azure storage container

```bash
label-studio start my_project --init --target azure-blob --source-path my-az-container-name
```

### Working with Binary Large OBjects (BLOBs)

When you store BLOBs in your Azure Storage Container (like images or audio files), you might want to use them as is, by generating URLs pointing to those objects (e.g. `azure-blob://container-name/image.jpg`)
Label Studio lets you generate input tasks with corresponding URLs automatically. You can do this by specifying `--source-params` when launching the app:

```bash
label-studio start my_project --init --source azure-blob --source-path my-az-container-name --source-params "{\"data_key\": \"my-object-tag-$value\", \"use_blob_urls\": true, \"regex\": ".*"}"
```

You can also skip or leave the `"data_key"` parameter empty and Label Studio automatically generates input tasks from the first task key in the label config, which can be useful when you only have one object tag exposed.


### Optional parameters

You can specify additional parameters with the command line escaped JSON string via `--source-params` / `--target-params` or from the UI.

| Parameter | Description | Default |
| --- | --- | --- |
| prefix | Specify an internal folder or container | empty | 
| regex | Specify a regular expression to filter bucket objects. Use ".*" to collect all objects. | Skips all bucket objects. |
| create_local_copy | If true, creates a local copy of the remote storage. | true |
| use_blob_urls | If true, generate task data with URLs pointed to your bucket objects. Use for resources like JPG, MP3, or similar file types. If false, bucket objects are interpreted as tasks in Label Studio JSON format with one object per task. | false |


## Redis database

You can also store your tasks and completions in a [Redis database](https://redis.io/). You must store the tasks and completions in different databases. 

You might want to use a Redis database if you find that relying on a file-based cloud storage connection is slow for your datasets. 

Currently, this is only supported if the Redis database is hosted in the default mode, with the default IP address. 

You can integrate Label Studio with Redis, but Label Studio does not manage the Redis database for you. See the [Redis Quick Start](Redis Quick Start) for details about hosting and managing your own Redis database.

Because Redis is an in-memory database, data saved in Redis does not persist. To make sure you don't lose data, set up [Redis persistence](https://redis.io/topics/persistence) or use another method to persist the data, such as using Redis in the cloud with [Microsoft Azure](https://azure.microsoft.com/en-us/services/cache/) or [Amazon AWS](https://aws.amazon.com/redis/).


### Set up connection in the Label Studio UI
In the Label Studio UI, do the following to set up the connection:

1. Open Label Studio in your web browser.
2. Open **Settings > Cloud storage sync**.
3. For **Source Storage**, click the gear icon. 
4. In the dialog box that appears, select **Redis Database** as the storage type.
5. (Optional) Update Redis configuration parameters.
7. Click **Apply & Sync Tasks**.
8. Repeat these steps for **Target Storage** to sync completed data annotations to the Redis database.


### Create connection on startup

The following commands launch Label Studio, configure the connection to your Redis database, scan for existing tasks, and load them into the app for labeling.

#### Read a Redis database with JSON-formatted tasks

```bash
label-studio start my_project --init --source db --redis-config "{\"project_path\": \"my_project\"}"
```

#### Write completions to a Redis database

```bash
label-studio start my_project --init --target db --redis-config "{\"project_path\": \"my_project\", \"db\":\"2\"}"
```

### Optional Redis configuration parameters

You can specify additional parameters with the command line escaped JSON string via `--redis-config` or from the UI.

| Parameter | Description | Default |
| --- | --- | --- |
| project_path | Path to the Label Studio project
| path | Specify the path to the database | None | 
| db | The Redis database to use | 1 (for source) or 2 (for target) | 
| host | IP of the server hosting the database | None |
| port | Port of the server hosting the database | None |
| password | Server password | None |
