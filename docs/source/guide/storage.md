---
title: Connecting Cloud storages
type: guide
order: 706
---

You can integrate the popular cloud storage with Label Studio, collect new tasks uploaded to your buckets, and sync back annotation results to use them in your machine learning pipelines.

You can configure storage type, bucket and prefixes during the start of the server or during the runtime via UI on **Tasks** page.

You can configure one or both:

- _source storage_ (where tasks are stored)
- _target storage_ (where completions are stored)

The connection to both storages is synced, so you can see new tasks after uploading them to the bucket without restarting Label Studio.

The parameters like prefix or matching filename regex could be changed any time from the webapp interface.

> Note: Choose target storage carefully: be sure it's empty when you just start labeling project, or it contains completions that match previously created/import tasks from source storage. Tasks are synced with completions based on internal ids (keys in `source.json`/`target.json` files in your project directory), so if you accidentally connect to the target storage with existed completions with the same ids, you may fail with undefined behavior.  

## Amazon S3

To connect your [S3](https://aws.amazon.com/s3) bucket with Label Studio, be sure you have programmatic access enabled. [Check this link](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration) to learn more how to set up access to your S3 bucket.

### Create connection on startup

The following commands launch Label Studio, configure the connection to your S3 bucket, scan for existing tasks, and load them into the labeling app.

#### Read bucket with JSON-formatted tasks

```bash
label-studio start my_project --init --source s3 --source-path my-s3-bucket
```

#### Write completions to bucket

```bash
label-studio start my_project --init --target s3-completions --target-path my-s3-bucket
```

### CORS and access problems

Check the browser console (Ctrl + Shift + i in Chromium) for errors if you have troubles with the bucket objects access. 

* If you see CORS problems, please [read here](https://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html).
 <img src='/images/cors-error-2.png' style="opacity: 0.9; max-width: 500px">

* You must specify the `region` when you create a new bucket. Don't forget to change it in your `.aws/config` file. Otherwise your bucket objects will have problems with access.

    E.g.: `~/.aws/config` 
    ```
    [default]
    region=us-east-2  # change to the region of your bucket
    ```  

* Use LS version >= 0.7.5, it has a signature version s3v4 to support more aws regions.

* If you see 403 errors, make sure you have the correct [credentials configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html). 
 

### Working with Binary Large OBjects (BLOBs)

When you are storing BLOBs in your S3 bucket (like images or audio files), you might want to use then as is, by generating URLs pointing to those objects (e.g. `gs://my-s3-bucket/image.jpg`)
Label Studio allows you to generate input tasks with corresponding URLs automatically on-the-fly. You can to this either specifying `--source-params` when launching app:

```bash
label-studio start my_project --init --source s3 --source-path my-s3-bucket --source-params "{\"data_key\": \"my-object-tag-$value\", \"use_blob_urls\": true, \"regex\": ".*"}"
```

You can leave `"data_key"` empty (or skip it at all) then LS generates it automatically with the first task key from label config (it's useful when you have only one object tag exposed).


### Optional parameters

You can specify additional parameters with the command line escaped JSON string via `--source-params` / `--target-params` or from UI.

#### prefix

Bucket prefix (typically used to specify internal folder/container)

#### regex

A regular expression for filtering bucket objects. Default is skipping all bucket objects (Use ".*" explicitly to collect all objects)

#### create_local_copy

If set true, the local copy of the remote storage will be created.

#### use_blob_urls

Generate task data with URLs pointed to your bucket objects(for resources like jpg, mp3, etc). If not selected, bucket objects will be interpreted as tasks in Label Studio JSON format, one object per task.


## Google Cloud Storage

To connect your [GCS](https://cloud.google.com/storage) bucket with Label Studio, be sure you have enabled programmatic access. [Check this link](https://cloud.google.com/storage/docs/reference/libraries) to learn more about how to set up access to your GCS bucket.

### Create connection on startup

The following commands launch Label Studio, configure the connection to your GCS bucket, scan for existing tasks, and load them into the app for the labeling.

#### Read bucket with JSON-formatted tasks

```bash
label-studio start my_project --init --source gcs --source-path my-gcs-bucket
```

#### Write completions to bucket

```bash
label-studio start my_project --init --target gcs-completions --source-path my-gcs-bucket
```

### CORS and access problems

Check the browser console (Ctrl + Shift + i in Chromium) for errors if you have troubles with the bucket objects access. 

* If you see CORS problems, please [read here](https://cloud.google.com/storage/docs/configuring-cors).
 <img src='/images/cors-error-2.png' style="opacity: 0.9; max-width: 500px">
* If you see 403 errors, make sure you have the correct [credentials configured](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication). 

### Working with Binary Large OBjects (BLOBs)

When you are storing BLOBs in your GCS bucket (like images or audio files), you might want to use then as is, by generating URLs pointing to those objects (e.g. `gs://my-gcs-bucket/image.jpg`)
Label Studio allows you to generate input tasks with corresponding URLs automatically on-the-fly. You can to this either specifying `--source-params` when launching app:

```bash
label-studio start my_project --init --source gcs --source-path my-gcs-bucket --source-params "{\"data_key\": \"my-object-tag-$value\", \"use_blob_urls\": true, \"regex\": ".*"}"
```

You can leave `"data_key"` empty (or skip it at all) then LS generates it automatically with the first task key from label config (it's useful when you have only one object tag exposed).


### Optional parameters

You can specify additional parameters with the command line escaped JSON string via `--source-params` / `--target-params` or from UI.

#### prefix

Bucket prefix (typically used to specify internal folder/container)

#### regex

A regular expression for filtering bucket objects. Default is skipping all bucket objects (Use ".*" explicitly to collect all objects)

#### create_local_copy

If set true, the local copy of the remote storage will be created.

#### use_blob_urls

Generate task data with URLs pointed to your bucket objects(for resources like jpg, mp3, etc). If not selected, bucket objects will be interpreted as tasks in Label Studio JSON format, one object per task.
