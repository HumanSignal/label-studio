---
title: Create a dataset
short: Create a dataset
date: 2023-08-16 11:52:38
tier: enterprise
order: 0
order_enterprise: 205
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

## Datasets using AWS

Requirements:

- Your data is located in an AWS S3 bucket.
- You have an AWS access key with view permissions for the S3 bucket. 
- Your AWS S3 bucket has CORS configured properly. Configuring CORS allows you to view the data in Label Studio. When CORS is not configured, you are only able to view links to the data. 

{% details <b>Configure CORS for the AWS S3 bucket</b> %}

**Prerequisites:**

You have edit access to the bucket. 

###### Configure CORS access to your bucket

Set up cross-origin resource sharing (CORS) access to your bucket using a policy that allows GET access from the same host name as your Label Studio deployment. 

You can use the AWS Management Console, the API, or SDKs. For more information, see [Configuring cross-origin resource sharing (CORS)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html) 

You can use or modify the following example:

```shell
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

{% enddetails %}

{% details <b>Create an AWS access key</b> %}


**Prerequisites:**

- You must have the admin permissions in your AWS account to generate keys and create service accounts.

For more information on completing the following steps, see the following pages in the AWS user guides:

[Creating an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html)  
[Managing access keys for IAM users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)  
[Policies and permissions in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)

###### Create a policy for the user

You need a permissions policy that can list S3 buckets and read objects within buckets. If you already have a policy that does this, or if you feel comfortable using the pre-configured **AmazonS3ReadOnlyAccess** policy, then you can skip this step. 

1. From the AWS Management Console, use the search bar or navigation menu to locate the **IAM** service.
2. Select **Access Management > Policies** from the menu on the left.
3. Click **Create policy**. 
4. From the policy editor, select the **JSON** option and paste the following: 

    ```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject"
            ],
            "Resource": "*"
        }
    ]   
}
    ```

    If you want to further restrict the permissions to certain buckets, edit the `Resource` key as follows:

    ```json

           "Resource": [
                "arn:aws:s3:::<your_bucket_name>",
                "arn:aws:s3:::<your_bucket_name>/*"
            ]

    ```


###### Create a user 

This user can be tied to a specific person or a group. 

1. From the AWS Management Console, use the search bar or navigation menu to locate the **IAM** service.

2. Select **Access Management > Users** from the menu on the left. 

3. Click **Create user**.

4. Enter a descriptive name for this user, such as “Label_Studio_access”. 

    Leave **Provide user access to the AWS Management Console** unselected. Click **Next**.

5. Select **Attach policies directly**.

6. Under **Permissions policies**, use the search field to find and select the policy you are using with the user (see above). Click **Next**.

7. Click **Create user**.



###### Generate an access key for the user

1. From the **Users** page, click the user you created in the previous section.  

2. Click the **Security Credentials** tab.

    ![Screenshot of the Security Credentials option](/images/data_discovery/aws_key.png)

3. Scroll down to **Access keys** and click **Create access key**.
4. Select **Other** and note the recommendations provided by AWS. Click **Next**.
5. Optionally, add a description for the key.
6. Click **Create access key**.
7. Copy the access key ID and your secret access key and keep them somewhere safe, or export the key to a CSV file.

    ![Screenshot of the copy icon next to the key](/images/data_discovery/aws_key2.png)

    <div class="admonition attention"><p class="admonition-title">Important</p><p>This is the only time you will be able to copy the secret access key. Once you click <strong>Done</strong>, you will not be able to view or copy it again.</p></div>

8. Click **Done**. 
   
{% enddetails %}

### Create a dataset from an AWS S3 bucket

1. From Label Studio, navigate to the Datasets page and click **Create Dataset**. 

    ![Create a dataset action](/images/data_discovery/dataset_create.png)

2. Complete the following fields and then click **Next**:

    <div class="noheader rowheader">

    | | |
    | --- | --- |
    | Name | Enter a name for the dataset. |
    | Description | Enter a brief description for the dataset.  |
    | Source | Select AWS S3. |

    </div>

3. Complete the following fields: 

    <div class="noheader rowheader">

    | | |
    | --- | --- |
    | Bucket Name | Enter the name of the AWS S3 bucket. |
    | Bucket Prefix | Enter the folder name within the bucket that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  |
    | File Name Filter | Use glob format to filter which file types to sync. For example, to sync all JPG files, enter `*jpg`. To sync all JPG and PNG files, enter `**/**+(jpg\|png)`.<br><br>At this time, we support the following file types: .jpg, .jpeg, .png, .txt, .text |
    | Region Name | By default, the region is `us-east-1`. If your bucket is located in a different region, overwrite the default and enter your region here. Otherwise, keep the default  |
    | S3 Endpoint | Enter an S3 endpoint if you want to override the URL created by S3 to access your bucket. |
    | Access Key ID | Enter the ID for the access key you created in AWS. Ensure this access key has read permissions for the S3 bucket you are targeting (see [Create an AWS access key](#Create-a-policy-for-the-user) above). |
    | Secret Access Key | Enter the secret portion of the [access key](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html) you created earlier. |
    | Session Token | If you are using a session token as part of your authorization (for example, [MFA](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html)), enter it here. |
    | Treat every bucket object as a source file | **Enabled** - Each object in the bucket will be imported as a separate record in the dataset.<br>You should leave this option enabled if you are importing a bucket of unstructured data files such as JPG, PNG, or TXT. <br><br>**Disabled** - Disable this option if you are importing structured data, such as JSON or CSV files.<br><br>**NOTE:** At this time, we only support unstructured data. Structured data support is coming soon.  |
    | Recursive scan | Perform recursive scans over the bucket contents if you have nested folders in your S3 bucket. |
    | Use pre-signed URLs | If your tasks contain `s3://…` links, they must be pre-signed in order to be displayed in the browser. |
    | Pre-signed URL counter | Adjust the counter for how many minutes the pre-signed URLs are valid. |

    </div>

4. Click **Check Connection** to verify your credentials. If your connection is valid, click **Next**. 

    ![Check Dataset connection](/images/data_discovery/dataset_check_connection_aws.png)

5. Provide a name for your dataset column and select a data type. The data type that you select tells Label Studio how to store your data in a way that can be searched using an AI-powered semantic search.

    ![Select dataset column](/images/data_discovery/dataset_column_aws.png)

6. Click **Create Dataset**. 

Data sync initializes immediately after creating the dataset. Depending on how much data you have, syncing might take several minutes to complete.





## Datasets using Google Cloud Storage

Requirements:

- Your data is located in a Google Cloud Storage bucket.
- You have a Google Cloud access key with view permissions for the Google Cloud Storage bucket. 
- Your Google Cloud Storage bucket has CORS configured.

{% details <b>Configure CORS for the Google Cloud Storage bucket</b> %}

Configuring CORS allows you to view the data in Label Studio. When CORS is not configured, you are only able to view links to the data. 

**Prerequisites:**

* You have installed the gcloud CLI. For more information, see [Google Cloud Documentation - Install the gcloud CLI](https://cloud.google.com/sdk/docs/install).
* You have edit access to the bucket. 

###### Configure CORS access to your bucket

Set up cross-origin resource sharing (CORS) access to your bucket using a policy that allows GET access from the same host name as your Label Studio deployment. 

For instructions, see [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors#configure-cors-bucket) in the Google Cloud User Guide. 

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

{% enddetails %}



{% details <b>Create an access key for Google Cloud Storage</b> %}


**Prerequisites:**


- You must have the appropriate Google Cloud permissions to create a service account.
- If you have not yet used a service account in your Google Cloud project, you may need to enable the service account API. See [Create service accounts](https://cloud.google.com/iam/docs/service-accounts-create?hl=en) in the Google Cloud documentation.

###### Create a service account

1. From the Google Cloud console, go to **IAM & Admin > Service Accounts**. 

    ![Screenshot of the Google Cloud Console](/images/data_discovery/gcp_service_accounts.png)

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

![Screenshot of the access key page](/images/data_discovery/gcp_key.png)

{% enddetails %}


### Create a dataset from Google Cloud Storage

1. From Label Studio, navigate to the Datasets page and click **Create Dataset**. 

    ![Create a dataset action](/images/data_discovery/dataset_create.png)

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
    | Treat every bucket object as a source file | **Enabled** - Each object in the bucket will be imported as a separate record in the dataset.<br>You should leave this option enabled if you are importing a bucket of unstructured data files such as JPG, PNG, or TXT. <br><br>**Disabled** - Disable this option if you are importing structured data, such as JSON or CSV files.<br><br>**NOTE:** At this time, we only support unstructured data. Structured data support is coming soon.  |
    | Use pre-signed URLs | If your tasks contain `gs://…` links, they must be pre-signed in order to be displayed in the browser. |
    | Pre-signed URL counter | Adjust the counter for how many minutes the pre-signed URLs are valid. |
    | Google Application Credentials | Copy and paste the full contents of the JSON file you downloaded when you created your service account key (see above).  |
    | Google Project ID | Optionally, you can specify a specific Google Cloud project. In most cases, you can leave this blank to inherit the project from the application credentials.  |

    </div>

4. Click **Check Connection** to verify your credentials. If your connection is valid, click **Next**. 

    ![Check Dataset connection](/images/data_discovery/dataset_check_connection.png)

5. Provide a name for your dataset column and select a data type. The data type that you select tells Label Studio how to store your data in a way that can be searched using an AI-powered semantic search.

    ![Select dataset column](/images/data_discovery/dataset_column.png)

6. Click **Create Dataset**. 

Data sync initializes immediately after creating the dataset. Depending on how much data you have, syncing might take several minutes to complete.



