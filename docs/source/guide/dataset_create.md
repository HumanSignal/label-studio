---
title: Create a dataset
short: Create a dataset
date: 2023-08-16 11:52:38
tier: enterprise
order: 0
order_enterprise: 405
meta_title: Create a Dataset to use with data discovery in Label Studio Enterprise
meta_description: How to create a Dataset in Label Studio Enterprise using Google Cloud, Azure, or AWS.
hide_sidebar: true
---

!!! note
    At this time, we only support building datasets from a bucket of unstructured data, meaning that the data must be in individual files rather than a structured format such as CSV or JSON.

!!! note
    To create a new Dataset, your [user role](manage_users#Roles-in-Label-Studio-Enterprise) must have Owner or Administrator permissions. 

## Before you begin

Datasets are retrieved from your cloud storage environment. As such, you will need to provide the appropriate access key to pull data from your cloud environment.


## Datasets using Google Cloud Storage

If you do not already have an access key, follow the directions below:

{% details <b>Create an access key for Google Cloud Storage</b> %}


**Prerequisites:**

- Your data should be located in a Google Cloud Storage bucket.
- You must have the appropriate Google Cloud permissions to create a service account.
- You have installed the gcloud CLI (this is necessary to configure CORS access). For more information, see [Google Cloud Documentation - Install the gcloud CLI](https://cloud.google.com/sdk/docs/install).
- If you have not yet used a service account in your Google Cloud project, you may need to enable the service account API. See [Create service accounts](https://cloud.google.com/iam/docs/service-accounts-create?hl=en) in the Google Cloud documentation.

###### Configure CORS access to your bucket

Set up cross-origin resource sharing (CORS) access to your bucket using a policy that allows GET access from the same host name as your Label Studio deployment. 

For more information, see [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors#configure-cors-bucket) in the Google Cloud User Guide. 

You can use or modify the following example:

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

###### Create a service account

1. From the Google Cloud console, go to **IAM & Admin > Service Accounts**. 

    ![Screenshot of the Google Cloud Console](/guide/images/data_discovery/gcp_service_accounts.png)

2. Click **Create service account** and complete the following fields:

    <div class="noheader">

    |  |  |
    |---|---|
    | **Service account name** | Enter a name for the service account that will appear in the console. |
    | **Service account ID** | The account ID is generated from the service name. |
    | **Description** | Optionally, provide a description for the service account. |

    </div>

3. Click **Create and continue**.
4. When selecting a role, use the search fields provided to select the **Storage Object Viewer** role. 
5. Optionally, you can link the service account to a user or group. For more information, see [Manage access to service accounts](https://cloud.google.com/iam/docs/manage-access-service-accounts) in the Google Cloud documentation.
6. Click **Done**.

###### Generate a key for the service account

1. From the Service Accounts page in the Google Cloud console, click the name of the service account you just created to go to its details.
2. Select the **Keys** tab.
3. Select **Add key > Create new key**.
4. Select **JSON** and then click **Create**.

The private key is automatically downloaded. This is the only time you can download the key.

![Screenshot of the access key page](/guide/images/data_discovery/gcp_key.png)

{% enddetails %}


### Create a dataset from Google Cloud Storage

1. From Label Studio, navigate to the Datasets page and click **Create Dataset**. 

    ![Create a dataset action](/guide/images/data_discovery/dataset_create.png)

2. Complete the following fields and then click **Next**:

    <div class="noheader rowheader">

    | | |
    | --- | --- |
    | Name | Enter a name for the dataset. |
    | Description | Enter a brief description for the dataset.  |
    | Source | Select Google Cloud Storage |

    </div>

3. Complete the following fields: 

    <div class="noheader rowheader">

    | | |
    | --- | --- |
    | Bucket Name | Enter the name of the Google Cloud bucket. |
    | Bucket Prefix | Optionally, enter the folder name within the bucket that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  |
    | File Name Filter | Use glob format to filter which file types to sync. For example, to sync all JPG files, enter `*jpg`. To sync all JPG and PNG files, enter `**/**+(jpg\|png)`.<br>At this time, we support the following file types: .jpg, .jpeg, .png, .txt, .text |
    | Treat every bucket object as a source file | **Enabled** - Each bucket object will be imported as a separate piece of data (unstructured data).<br>You should leave this option enabled if your bucket contains BLOB storage files such as JPG, MP3, or similar file types. This creates a URL for each bucket object, such as `gs://my-gcs-bucket/image.jpg`<br><br>**Disabled** - Disable this option if you are using structured data, such as JSON or CSV files.<br><br>**NOTE:** At this time, we only support unstructured data. |
    | Use pre-signed URLs | If your tasks contain `gs://…` links, they must be pre-signed in order to be displayed in the browser. |
    | Pre-signed URL counter | Adjust the counter for how many minutes the pre-signed URLs are valid. |
    | Google Application Credentials | Copy and paste the full contents of the JSON file you downloaded when you created your service account key (see above).  |
    | Google Project ID | Optionally, you can specify a specific Google Cloud project. In most cases, you can leave this blank to inherit the project from the application credentials.  |

    </div>

4. Click **Check Connection** to verify your credentials. If your connection is valid, click **Next**. 

    ![Check Dataset connection](/guide/images/data_discovery/dataset_check_connection.png)

5. Provide a name for your dataset column and select a type. The data type you select instructs Label Studio on how to index your data in a vector database, so that it can be searched using an AI-powered semantic search.

    ![Select dataset column](/guide/images/data_discovery/dataset_column.png)

6. Click **Create Dataset**. 

Data sync initializes immediately after creating the dataset. Depending on how much data you have, syncing might take several minutes to complete.



