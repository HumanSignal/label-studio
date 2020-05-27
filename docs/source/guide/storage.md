---
title: Cloud storages
type: guide
order: 101
---

You can integrate the popular cloud storages with Label Studio, gathering new tasks coming to your buckets and instantly uploading annotation results in order to use them in your machine learning pipelines.

Cloud storages could be connected with the command line startup script, or changed during the runtime via UI.

You can configure one or both:

- _source storage_ (where your tasks are residing)
- _target storage_ (where your completions are stored)

The connection to both storages are constantly synced, so you'll see the new tasks after uploading them externally without restarting Label Studio.
Storages and their parameters could be changed any time from the interface.

## Amazon S3

To connect your [S3](https://aws.amazon.com/s3) bucket with Label Studio, be sure you have an programmatic access to it. [Check this link](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration) to learn more how to setup an access to you S3 bucket.

### Create connection on startup

The following commands launch Label Studio, configure the connection to your S3 bucket, scan for existing tasks and load them into the app for the labeling.

#### Read bucket for JSON-formatted tasks

```bash
label-studio start --init --source s3 --source-path my-bucket-name
```

#### Read bucket with BLOBs (image or audio files)

```bash
label-studio start --init --source s3blob --source-path my-bucket-name --source-params "{\"data_key\": \"my-data-key\"}"
```

`"data_key"` required parameter leads to the input task formatted in a way:

```json
{
  "data_key": "s3://my-bucket-name/my-blob.ext"
}
```

### Change settings in a running app


### Optional parameters

You can specify additional parameters with the input JSON string via `--source-params` / `--target-params` or from UI.

#### prefix

Bucket prefix (typically used to specify internal folder/container)

#### regex

Regular expression for filtering bucket objects

#### create_local_copy

If set true, the local copy of the remote storage will be created.



## Google Cloud Storage

To connect your [GCS](https://cloud.google.com/storage) bucket with Label Studio, be sure you have an programmatic access to it. [Check this link](https://cloud.google.com/storage/docs/reference/libraries) to learn more how to setup an access to you GCS bucket.


### Create connection on startup

The following commands launch Label Studio, configure the connection to your GCS bucket, scan for existing tasks and load them into the app for the labeling.

#### Read bucket for JSON-formatted tasks

```bash
label-studio start --init --source gcs --source-path my-bucket-name
```

#### Read bucket with BLOBs (image or audio files)

```bash
label-studio start --init --source gcsblob --source-path my-bucket-name --source-params "{\"data_key\": \"my-data-key\"}"
```

`"data_key"` required parameter leads to the input task formatted in a way:

```json
{
  "data_key": "gs://my-bucket-name/my-blob.ext"
}
```

### Change settings in a running app


### Optional parameters

You can specify additional parameters with the input JSON string via `--source-params` / `--target-params` or from UI.

#### prefix

Bucket prefix (typically used to specify internal folder/container)

#### regex

Regular expression for filtering bucket objects

#### create_local_copy

If set true, the local copy of the remote storage will be created.
