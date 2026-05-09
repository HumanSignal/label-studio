---
title: Set up Redis database project storage
short: Redis
type: guide
tier: all
order: 156
order_enterprise: 156
meta_title: Set up Redis storage
meta_description: "How to set up source and target storage for a Redis database."
section: "Import & Export"
parent: "storage"
parent_enterprise: "storage"
---

You can also store your tasks and annotations in a [Redis database](https://redis.io/). You must store the tasks and annotations in different databases. You might want to use a Redis database if you find that relying on a file-based cloud storage connection is slow for your datasets. 

Currently, this configuration is only supported if you host the Redis database in the default mode, with the default IP address. 

Label Studio does not manage the Redis database for you. See the [Redis Quick Start](https://redis.io/topics/quickstart) for details about hosting and managing your own Redis database. Because Redis is an in-memory database, data saved in Redis does not persist. To make sure you don't lose data, set up [Redis persistence](https://redis.io/topics/persistence) or use another method to persist the data, such as using Redis in the cloud with [Microsoft Azure](https://azure.microsoft.com/en-us/services/cache/) or [Amazon AWS](https://aws.amazon.com/redis/).

## Task format for Source Redis Storage

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


## Create a source storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Source Storage**.

Select **Redis Storage** and click **Next**.

#### Configure Connection

Complete the following fields and then click **Test connection**:

<div class="noheader rowheader">

<table style="width: 100%; border-collapse: collapse;">
  <tr>
    <th style="width: 25%;">Field</th>
    <th>Description</th>
  </tr>

  <tr>
    <td>Storage Title</td>
    <td>Enter a name to identify the storage connection.</td>
  </tr>

  <tr>
    <td>Host</td>
    <td>
      Enter the IP address of the server hosting the database, or <code>localhost</code>.
    </td>
  </tr>

  <tr>
    <td>Port</td>
    <td>
      Enter the port that you can use to access the database. Default is <code>6379</code>.
    </td>
  </tr>

  <tr>
    <td>Database Number (db)</td>
    <td>
      Enter the database number you want to use. Default is <code>1</code>.
    </td>
  </tr>

  <tr>
    <td>Password</td>
    <td>
      Optionally, enter the server password if your Redis instance requires authentication.
    </td>
  </tr>

</table>
</div>

#### Import Settings & Preview

Complete the following fields and then click **Load preview** to ensure you are syncing the correct data:

<div class="noheader rowheader">

| | |
| --- | --- |
| Path to files| Optionally, specify the path to the database. Used as the keys prefix, values under this path are scanned for tasks. |
| Import Method | Select whether you want create a task for each file in your database or whether you would like to use a JSON/JSONL/Parquet file to define the data for each task. |
| File Name Filter | Specify a regular expression to filter database objects. Use `.*` to collect all objects. |
| Scan all sub-folders | Enable this option to perform a recursive scan across subfolders within your database. |

</div>

#### Review & Confirm

If everything looks correct, click **Save & Sync** to sync immediately, or click **Save** to save your settings and sync later.

!!! info Tip
    You can also use the API to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/redis/sync).

## Create a target storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Target Storage**.

Select **Redis Storage** and click **Next**.

Complete the following fields:

<div class="noheader rowheader">

<table style="width: 100%; border-collapse: collapse;">

  <tr>
    <td style="width: 25%;">Storage Title</td>
    <td>Enter a name to identify the storage connection.</td>
  </tr>

  <tr>
    <td>Path</td>
    <td>
      Optionally, specify the path to the database. Used as the keys prefix for exported annotations.
    </td>
  </tr>

  <tr>
    <td>Host</td>
    <td>
      Enter the IP address of the server hosting the database, or <code>localhost</code>.
    </td>
  </tr>

  <tr>
    <td>Port</td>
    <td>
      Enter the port that you can use to access the database. Default is <code>6379</code>.
    </td>
  </tr>

  <tr>
    <td>Database Number (db)</td>
    <td>
      Enter the database number you want to use. Default is <code>2</code>. You must use a different database number than your source storage.
    </td>
  </tr>

  <tr>
    <td>Password</td>
    <td>
      Optionally, enter the server password if your Redis instance requires authentication.
    </td>
  </tr>

</table>
</div>

After adding the storage, click **Sync**.

!!! info Tip
    You can also use the API to [sync export storage](https://api.labelstud.io/api-reference/api-reference/export-storage/redis/sync).

## Add storage with the Label Studio API

You can also use the API to programmatically create connections. [See our API documentation.](https://api.labelstud.io/api-reference/introduction/getting-started)