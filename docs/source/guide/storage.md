---
title: Cloud storages
type: guide
order: 101
---

You can integrate the popular cloud storage with Label Studio, collect new tasks uploaded to your buckets, and sync back annotation results to use them in your machine learning pipelines.

Cloud storage type and bucket need to be configured during the start of the server, and further configured during the runtime via UI.

You can configure one or both:

- _source storage_ (where tasks are stored)
- _target storage_ (where completions are stored)

The connection to both storages is synced, so you can see new tasks after uploading them to the bucket without restarting Label Studio.

The parameters like prefix or matching filename regex could be changed any time from the webapp interface.

## Amazon S3

To connect your [S3](https://aws.amazon.com/s3) bucket with Label Studio, be sure you have programmatic access enabled. [Check this link](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration) to learn more how to set up access to your S3 bucket.

### Create connection on startup

The following commands launch Label Studio, configure the connection to your S3 bucket, scan for existing tasks, and load them into the labeling app.

#### Read bucket for JSON-formatted tasks

```bash
label-studio start --init --source s3 --source-path my-bucket-name
```

#### Read bucket with BLOBs (image or audio files)

```bash
label-studio start --init --source s3 --source-path my-bucket-name --source-params "{\"data_key\": \"my-data-key\", \"use_blob_urls\": true}"
```

You can leave "data_key" empty (or skip it at all) then LS generates it automatically with the first task key from label config.    

`"my-data-key"` required parameter leads to the input task formatted in a way:

```json
{
  "my-data-key": "s3://my-bucket-name/my-blob.ext"
}
```

#### Write results to the bucket

```bash
label-studio start --init --target s3-completions --target-path my-bucket-name
```


### Optional parameters

You can specify additional parameters with the input JSON string via `--source-params` / `--target-params` or from UI.

#### prefix

Bucket prefix (typically used to specify internal folder/container)

#### regex

A regular expression for filtering bucket objects

#### create_local_copy

If set true, the local copy of the remote storage will be created.



## Google Cloud Storage

To connect your [GCS](https://cloud.google.com/storage) bucket with Label Studio, be sure you have enabled programmatic access. [Check this link](https://cloud.google.com/storage/docs/reference/libraries) to learn more about how to set up access to your GCS bucket.


### Create connection on startup

The following commands launch Label Studio, configure the connection to your GCS bucket, scan for existing tasks, and load them into the app for the labeling.

#### Read bucket for JSON-formatted tasks

```bash
label-studio start --init --source gcs --source-path my-bucket-name
```

#### Read bucket with BLOBs (image or audio files)

```bash
label-studio start --init --source gcs --source-path my-bucket-name --source-params "{\"data_key\": \"my-data-key\", \"use_blob_urls\": true}"
```

You can leave "data_key" empty (or skip it at all) then LS generates it automatically with the first task key from label config.

`"my-data-key"` required parameter leads to the input task formatted in a way:

```json
{
  "my-data-key": "gs://my-bucket-name/my-blob.ext"
}
```

#### Write results to the bucket

```bash
label-studio start --init --target gcs-completions --target-path my-bucket-name
```


### Optional parameters

You can specify additional parameters with the input JSON string via `--source-params` / `--target-params` or from UI.

#### prefix

Bucket prefix (typically used to specify internal folder/container)

#### regex

A regular expression for filtering bucket objects

#### create_local_copy

If set true, the local copy of the remote storage will be created.
