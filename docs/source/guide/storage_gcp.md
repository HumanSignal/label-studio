---
title: Set up Google Cloud Storage
short: Google Cloud
type: guide
tier: all
order: 153
order_enterprise: 153
meta_title: Set up Google Cloud Storage
meta_description: "How to set up source and target storage for Google Cloud."
section: "Import & Export"
parent: "storage"
parent_enterprise: "storage"
---

Dynamically import tasks and export annotations to Google Cloud Storage (GCS) buckets in Label Studio. For details about how Label Studio secures access to cloud storage, see [Secure access to cloud storage](security#Secure-access-to-cloud-storage).

## Configure access to your Google Cloud Storage bucket

First, review the information in [Cloud storage for projects](storage) and [Secure access to cloud storage](security#Secure-access-to-cloud-storage).

Then you will need to complete the following prerequisites:

#### 1. Enable programmatic access to your bucket 

See [Cloud Storage Client Libraries](https://cloud.google.com/storage/docs/reference/libraries) in the Google Cloud Storage documentation for how to set up access to your GCS bucket.

#### 2. Set up authentication to your bucket 

Your account must have the **Service Account Token Creator** and **Storage Object Viewer** roles and **storage.buckets.get** access permission. See [Setting up authentication](https://cloud.google.com/storage/docs/reference/libraries#setting_up_authentication) and [IAM permissions for Cloud Storage](https://cloud.google.com/storage/docs/access-control/iam-permissions) in the Google Cloud Storage documentation. 

<div class="enterprise-only">

!!! note
    If you are using WIF, see [Service account permissions](#Service-account-permissions) below. 

</div>

#### 3. Configure CORS

Set up cross-origin resource sharing (CORS) access to your bucket, using a policy that allows GET access from the same host name as your Label Studio deployment. See [Configuring cross-origin resource sharing (CORS)](https://cloud.google.com/storage/docs/configuring-cors#configure-cors-bucket) in the Google Cloud User Guide. 

!!! note
    This is only required if you are using pre-signed URLs. If you are using proxying, you do not have to configure CORS. For more information, see [Pre-signed URLs vs Storage proxies](storage#Pre-signed-URLs-vs-Storage-proxies).

Use or modify the following example:

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

## Google Cloud Storage 

Before you begin:

* Review the information in [Cloud storage for projects](storage) and [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).
* [Configure access to your bucket](#Configure-access-to-your-GCS-bucket). 

### Google Application Credentials

You will need to provide Google Application Credentials. These will be a JSON file that you input while setting up your storage.

1. From the Google Cloud Console, go to **IAM & Admin > Service Accounts**.
2. Select the specific service account you need credentials for. If you don't have one, create a new one.
3. In the service account details, go to the **Keys** tab and click **Add Key > Create new key**.
4. Select the JSON key type and click **Create**. The JSON file will be generated and automatically downloaded to your computer. 

See also:

* [Set up ADC for a resource with an attached service account](https://docs.cloud.google.com/docs/authentication/set-up-adc-attached-service-account) 
* [Set up Application Default Credentials](https://docs.cloud.google.com/docs/authentication/provide-credentials-adc). 

!!! note
    If you're using a service account to authorize access to the Google Cloud Platform, make sure to activate it. See [gcloud auth activate-service-account](https://cloud.google.com/sdk/gcloud/reference/auth/activate-service-account).

### Create a source storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Source Storage**.

Select **Google Cloud Storage** and click **Next**.

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
    <td>Bucket Name</td>
    <td>
      Enter the name of your GCS bucket.
    </td>
  </tr>

  <tr>
    <td>Google Application Credentials</td>
    <td>
      Enter the JSON file with the GCS credentials you created to manage authentication for your bucket. <br /><br /><strong>On-prem users:</strong> Alternatively, you can use the <code>GOOGLE_APPLICATION_CREDENTIALS</code> environment variable and/or set up Application Default Credentials, so that users do not need to configure credentials manually. <br /><br />See <a href="#Application-Default-Credentials-for-enhanced-security-for-GCS">Application Default Credentials for enhanced security</a> below. 
    </td>
  </tr>

  <tr>
    <td>Google Project ID</td>
    <td>
      Enter the ID of your Google project in which the bucket is located (for example, <code>my-label-studio-project</code>). <br /><br />If you're unsure, you can find this in Google Cloud Console under <strong>IAM & Admin > Settings</strong>.
    </td>
  </tr>

  <tr>
    <td>Use pre-signed URLs (On) /<br/> Proxy through the platform (Off)</td>
    <td>
      This determines how data from your bucket is loaded:
      <ul>
        <li><strong>Use pre-signed URLs</strong>: Label Studio generates time-limited HTTPS links directly to your S3/GCS/Azure objects and redirects the browser there (HTTP 303), so annotators’ browsers download media straight from cloud storage. This is usually faster and scales better, but requires correct CORS and presign permissions on the bucket. It also means traffic flows from browser to storage, not through Label Studio.</li>
        <li><strong>Proxy through the platform</strong> – The backend downloads the file from cloud storage and streams it to the browser, so all media traffic passes through the Label Studio server. This keeps data fully inside the Label Studio/network boundary, enforces task-level access checks on every request, and avoids CORS/presign setup, but uses more Label Studio worker resources and can be slightly slower.</li>
      </ul>
      <br/>
      For more information, see
      <a href="storage#Pre-signed-URLs-vs-Storage-proxies">Pre-signed URLs vs Storage proxies</a>.
    </td>
  </tr>

  <tr>
    <td>Expire pre-signed URLs (minutes)</td>
    <td>Control how long pre-signed URLs remain valid.</td>
  </tr>

</table>
</div>

#### Import Settings & Preview

Complete the following fields and then click **Load preview** to ensure you are syncing the correct data:

<div class="noheader rowheader">

| | |
| --- | --- |
| Bucket Prefix | Optionally, enter the directory name within your bucket that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  | 
| Import Method | Select whether you want create a task for each file in your bucket or whether you would like to use a JSON/JSONL/Parquet file to define the data for each task. |
| File Name Filter | Specify a regular expression to filter bucket objects. Use `.*` to collect all objects. |
| Scan all sub-folders | Enable this option to perform a recursive scan across subfolders within your container. |

</div>

#### Review & Confirm

If everything looks correct, click **Save & Sync** to sync immediately, or click **Save** to save your settings and sync later.


!!! info Tip
    You can also use the API to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/gcs/sync).

### Create a target storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Target Storage**.

Select **Google Cloud Storage** and click **Next**. 

Complete the following fields:

<div class="noheader rowheader">

<table style="width: 100%; border-collapse: collapse;">

  <tr>
    <td style="width: 25%;">Storage Title</td>
    <td>Enter a name to identify the storage connection.</td>
  </tr>

  <tr>
    <td>Bucket Name</td>
    <td>
      Enter the name of your GCS bucket.
    </td>
  </tr>

  <tr>
    <td>Bucket Prefix</td>
    <td>
      Optionally, enter the directory name within your bucket that you would like to use.  For example, <code>data-set-1</code> or <code>data-set-1/subfolder-2</code>. 
    </td>
  </tr>

  <tr>
    <td>Google Application Credentials</td>
    <td>
      Enter the JSON file with the GCS credentials you created to manage authentication for your bucket. <br /><br /><strong>On-prem users:</strong> Alternatively, you can use the <code>GOOGLE_APPLICATION_CREDENTIALS</code> environment variable and/or set up Application Default Credentials, so that users do not need to configure credentials manually. <br /><br />See <a href="#Application-Default-Credentials-for-enhanced-security-for-GCS">Application Default Credentials for enhanced security</a> below. 
    </td>
  </tr>

  <tr>
    <td>Google Project ID</td>
    <td>
      Enter the ID of your Google project in which the bucket is located (for example, <code>my-label-studio-project</code>). <br /><br />If you're unsure, you can find this in Google Cloud Console under <strong>IAM & Admin > Settings</strong>.
    </td>
  </tr>

  <tr>
    <td>Can delete objects from storage</td>
    <td>Enable this option if you want to delete annotations stored in the bucket when they are deleted in Label Studio. Your credentials must include the ability to delete bucket objects.</td>
  </tr>

</table>
</div>

After adding the storage, click **Sync**. 

!!! info Tip
    You can also use the API to [sync export storage](https://api.labelstud.io/api-reference/api-reference/export-storage/gcs/sync).

### Application Default Credentials for enhanced security for GCS

If you use Label Studio on-premises with Google Cloud Storage, you can set up [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) to provide cloud storage authentication globally for all projects, so users do not need to configure credentials manually.

The recommended way to to do this is by using the `GOOGLE_APPLICATION_CREDENTIALS` environment variable. For example:

```bash
  export GOOGLE_APPLICATION_CREDENTIALS=json-file-with-GCP-creds-23441-8f8sd99vsd115a.json
  ```

## Google Cloud Storage with Workload Identity Federation (WIF)

<div class="opensource-only">

In Label Studio Enterprise, you can use Workload Identity Federation (WIF) pools with Google Cloud Storage.

Unlike with application credentials, WIF allows you to use temporary credentials. Each time you make a request to GCS, Label Studio connects to your identity pool to request temporary credentials.

For more information, see [Google Cloud Storage with Workload Identity Federation (WIF)](https://docs.humansignal.com/guide/storage_gcp.html#Google-Cloud-Storage-with-Workload-Identity-Federation-WIF) in our Enterprise documentation.

</div>

<div class="enterprise-only">

You can also use Workload Identity Federation (WIF) pools with Google Cloud Storage. 

Unlike with application credentials, WIF allows you to use temporary credentials. Each time you make a request to GCS, Label Studio connects to your identity pool to request temporary credentials. 

For more information about WIF, see [Google Cloud - Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation).

Before you begin:

* Review the information in [Cloud storage for projects](storage) and [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).
* [Configure access to your bucket](#Configure-access-to-your-GCS-bucket). 

### Service account permissions

You will need a service account that has the following permissions

- Bucket: **Storage Admin** (`roles/storage.admin`)
- Project: **Service Account Token Creator** (`roles/iam.serviceAccountTokenCreator`)
- Project: **Storage Object Viewer** (`roles/storage.viewer`)
  
See [Create service accounts](https://cloud.google.com/iam/docs/service-accounts-create?hl=en) in the Google Cloud documentation.

### Create a Workload Identity Pool

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

### Create a source storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Source Storage**.

Select **Google Cloud Storage (WIF Auth)** and click **Next**.

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
    <td>Bucket Name</td>
    <td>
      Enter the name of your GCS bucket.
    </td>
  </tr>

  <tr>
    <td>Workload Identity Pool ID</td>
    <td>
      This is the ID you specified when creating the Work Identity Pool. You can find this in Google Cloud Console under <strong>IAM & Admin > Workload Identity Pools</strong>. 
    </td>
  </tr>

  <tr>
    <td>Workload Identity Provider ID</td>
    <td>
      This is the ID you specified when setting up the provider. You can find this in Google Cloud Console under <strong>IAM & Admin > Workload Identity Pools</strong>.
    </td>
  </tr>

  <tr>
    <td>Service Account Email</td>
    <td>
      This is the email associated with the service account you set up as part of the prerequisites. You can find it in the <strong>Details</strong> page of the service account under <strong>IAM & Admin > Service Accounts</strong>. For example, <code>labelstudio@random-string-382222.iam.gserviceaccount.com</code>.
    </td>
  </tr>

  <tr>
    <td>Google Project ID</td>
    <td>
      Your Google project ID. You can find this in Google Cloud Console under <strong>IAM & Admin > Settings</strong>.
    </td>
  </tr>

  <tr>
    <td>Google Project Number</td>
    <td>
      Your Google project number. You can find this in Google Cloud Console under <strong>IAM & Admin > Settings</strong>. 
    </td>
  </tr>

  <tr>
    <td>Use pre-signed URLs (On) /<br/> Proxy through the platform (Off)</td>
    <td>
      This determines how data from your bucket is loaded:
      <ul>
        <li><strong>Use pre-signed URLs</strong>: Label Studio generates time-limited HTTPS links directly to your S3/GCS/Azure objects and redirects the browser there (HTTP 303), so annotators' browsers download media straight from cloud storage. This is usually faster and scales better, but requires correct CORS and presign permissions on the bucket. It also means traffic flows from browser to storage, not through Label Studio.</li>
        <li><strong>Proxy through the platform</strong> – The backend downloads the file from cloud storage and streams it to the browser, so all media traffic passes through the Label Studio server. This keeps data fully inside the Label Studio/network boundary, enforces task-level access checks on every request, and avoids CORS/presign setup, but uses more Label Studio worker resources and can be slightly slower.</li>
      </ul>
      <br/>
      For more information, see
      <a href="storage#Pre-signed-URLs-vs-Storage-proxies">Pre-signed URLs vs Storage proxies</a>.
    </td>
  </tr>

  <tr>
    <td>Expire pre-signed URLs (minutes)</td>
    <td>Control how long pre-signed URLs remain valid.</td>
  </tr>

</table>
</div>

#### Import Settings & Preview

Complete the following fields and then click **Load preview** to ensure you are syncing the correct data:

<div class="noheader rowheader">

| | |
| --- | --- |
| Bucket Prefix | Optionally, enter the directory name within your bucket that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  | 
| Import Method | Select whether you want create a task for each file in your bucket or whether you would like to use a JSON/JSONL/Parquet file to define the data for each task. |
| File Name Filter | Specify a regular expression to filter bucket objects. Use `.*` to collect all objects. |
| Scan all sub-folders | Enable this option to perform a recursive scan across subfolders within your container. |

</div>

#### Review & Confirm

If everything looks correct, click **Save & Sync** to sync immediately, or click **Save** to save your settings and sync later.


!!! info Tip
    You can also use the API to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/gcswif/sync).



### Create a target storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Target Storage**.

Select **Google Cloud Storage (WIF Auth)** and click **Next**. 

Complete the following fields:

<div class="noheader rowheader">

<table style="width: 100%; border-collapse: collapse;">

  <tr>
    <td style="width: 25%;">Storage Title</td>
    <td>Enter a name to identify the storage connection.</td>
  </tr>

  <tr>
    <td>Bucket Name</td>
    <td>
      Enter the name of your GCS bucket.
    </td>
  </tr>

  <tr>
    <td>Bucket Prefix</td>
    <td>
      Optionally, enter the directory name within your bucket that you would like to use.  For example, <code>data-set-1</code> or <code>data-set-1/subfolder-2</code>. 
    </td>
  </tr>

<tr>
    <td>Workload Identity Pool ID</td>
    <td>
      This is the ID you specified when creating the Work Identity Pool. You can find this in Google Cloud Console under <strong>IAM & Admin > Workload Identity Pools</strong>. 
    </td>
  </tr>

  <tr>
    <td>Workload Identity Provider ID</td>
    <td>
      This is the ID you specified when setting up the provider. You can find this in Google Cloud Console under <strong>IAM & Admin > Workload Identity Pools</strong>.
    </td>
  </tr>

  <tr>
    <td>Service Account Email</td>
    <td>
      This is the email associated with the service account you set up as part of the prerequisites. You can find it in the <strong>Details</strong> page of the service account under <strong>IAM & Admin > Service Accounts</strong>. For example, <code>labelstudio@random-string-382222.iam.gserviceaccount.com</code>.
    </td>
  </tr>

  <tr>
    <td>Google Project ID</td>
    <td>
      Your Google project ID. You can find this in Google Cloud Console under <strong>IAM & Admin > Settings</strong>.
    </td>
  </tr>

  <tr>
    <td>Google Project Number</td>
    <td>
      Your Google project number. You can find this in Google Cloud Console under <strong>IAM & Admin > Settings</strong>. 
    </td>
  </tr>

  <tr>
    <td>Can delete objects from storage</td>
    <td>Enable this option if you want to delete annotations stored in the bucket when they are deleted in Label Studio. Your credentials must include the ability to delete bucket objects.</td>
  </tr>

</table>
</div>

After adding the storage, click **Sync**. 

!!! info Tip
    You can also use the API to [sync export storage](https://api.labelstud.io/api-reference/api-reference/export-storage/gcswif/sync).

</div>


## Add storage with the Label Studio API

You can also use the API to programmatically create connections. [See our API documentation.](https://api.labelstud.io/api-reference/introduction/getting-started)


## IP filtering for enhanced security for GCS

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
    - Add Label Studio Enterprise outgoing IP addresses (see [IP ranges](saas.html#IP-ranges))
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