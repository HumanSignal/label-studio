---
title: Set up Microsoft Azure Blob storage
short: Microsoft Azure
type: guide
tier: all
order: 154
order_enterprise: 154
meta_title: Set up Microsoft Azure Blob storage
meta_description: "How to set up source and target storage for Microsoft Azure Blob storage."
section: "Import & Export"
parent: "storage"
parent_enterprise: "storage"
---

Connect your [Microsoft Azure Blob storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction) container with Label Studio. For details about how Label Studio secures access to cloud storage, see [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

## Set up CORS for Azure blob storage

If you are planning to use proxy storage, you can skip this step. 

If you are planning to use pre-signed URLs, you must configure CORS. 

For more information, see [Pre-signed URLs vs. Storage proxies](storage#Pre-signed-URLs-vs-Storage-proxies). 

1. In the Azure portal, navigate to the page for the storage account. 
2. From the menu on the left, scroll down to **Settings > Resource sharing (CORS)**. 
3. Under **Blob service** add the following rule:

   * **Allowed origins:** `https://app.humansignal.com` (or the domain you are using)
   * **Allowed methods:** `GET, HEAD, OPTIONS` 
   * **Allowed headers:** `*` 
   * **Exposed headers:** `*` 
   * **Max age:** `3600` 

4. Click **Save**. 

![Screenshot](/images/storages/azure-cors.png)

## Azure blob storage

Before you begin, review the information in [Cloud storage for projects](storage) and [Secure access to cloud storage](security.html#Secure-access-to-cloud-storage).

You will also need to provide the following information. It can all be found on the resource page for your storage account in the Azure console. 

You will need:

- The name of the container you are using
- The name of your storage account
- The access key associated with your storage account

![Screenshot](/images/storages/azure.png)

!!! info Tip
    If you are working in an on-prem deployment, you can set the `AZURE_BLOB_ACCOUNT_NAME` and `AZURE_BLOB_ACCOUNT_KEY` environment variables instead of manually adding them into the UI. 

### Create a source storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Source Storage**.

Select **Azure Blob Storage** and click **Next**.

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
    <td>Container Name</td>
    <td>
      Enter the name of your Azure storage container. This can be found in the Azure console on your storage account resource page under <strong>Data storage > Containers</strong>. (See the screenshot above.)
    </td>
  </tr>

  <tr>
    <td>Account Name</td>
    <td>
      Enter the name of your Azure storage account. (See the screenshot above.)
    </td>
  </tr>

  <tr>
    <td>Account Key</td>
    <td>
      Enter the access key for your Azure storage account This can be found in the Azure console on your storage account resource page under <strong>Security + networking > Access keys</strong>. (See the screenshot above.)
    </td>
  </tr>

  <tr>
    <td>Use pre-signed URLs (On) /<br/> Proxy through the platform (Off)</td>
    <td>
      This determines how data from your container is loaded:
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
| Bucket Prefix | Optionally, enter the directory name within your container that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  | 
| Import Method | Select whether you want create a task for each file in your container or whether you would like to use a JSON/JSONL/Parquet file to define the data for each task. |
| File Name Filter | Specify a regular expression to filter container objects. Use `.*` to collect all objects. |
| Scan all sub-folders | Enable this option to perform a recursive scan across subfolders within your container. |

</div>

#### Review & Confirm

If everything looks correct, click **Save & Sync** to sync immediately, or click **Save** to save your settings and sync later.


!!! info Tip
    You can also use the API to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/azure/sync).

### Create a target storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Target Storage**.

Select **Azure Blob Storage** and click **Next**. 

Complete the following fields:

<div class="noheader rowheader">

<table style="width: 100%; border-collapse: collapse;">

  <tr>
    <td style="width: 25%;">Storage Title</td>
    <td>Enter a name to identify the storage connection.</td>
  </tr>

  <tr>
    <td>Container Name</td>
    <td>
      Enter the name of your Azure storage container. This can be found in the Azure console on your storage account resource page under <strong>Data storage > Containers</strong>. (See the screenshot above.)
    </td>
  </tr>

  <tr>
    <td>Container Prefix</td>
    <td>
      Optionally, enter the directory name within your container that you would like to use.  For example, <code>data-set-1</code> or <code>data-set-1/subfolder-2</code>. 
    </td>
  </tr>

  <tr>
    <td>Account Name</td>
    <td>
      Enter the name of your Azure storage account. (See the screenshot above.)
    </td>
  </tr>

  <tr>
    <td>Account Key</td>
    <td>
      Enter the access key for your Azure storage account This can be found in the Azure console on your storage account resource page under <strong>Security + networking > Access keys</strong>. (See the screenshot above.)
    </td>
  </tr>

  <tr>
    <td>Can delete objects from storage</td>
    <td>Enable this option if you want to delete annotations stored in the container when they are deleted in Label Studio.</td>
  </tr>

</table>
</div>

After adding the storage, click **Sync**. 

!!! info Tip
    You can also use the API to [sync export storage](https://api.labelstud.io/api-reference/api-reference/export-storage/azure/sync).


## Azure blob storage with Service Principal

<div class="opensource-only">

In Label Studio Enterprise, you can use Azure Service Principal authentication to securely connect Label Studio to Azure Blob Storage without using storage account access keys.

For more information, see [Azure Blob Storage with Service Principal](https://docs.humansignal.com/guide/storage_azure.html#Azure-Blob-Storage-with-Service-Principal) in our Enterprise documentation.

</div>

<div class="enterprise-only">

You can use Azure Service Principal authentication to securely connect Label Studio Enterprise to Azure Blob Storage without using storage account access keys. 

Service Principal authentication provides enhanced security through Entra (formerly "Azure Active Directory") identity and access management, allowing for fine-grained permissions and audit capabilities.

Service Principal authentication uses Entra ID to authenticate applications. Unlike storage account keys that provide full access to the storage account, Service Principal authentication allows you to grant specific permissions and can be easily revoked or rotated.

For more information, see [Microsoft - Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals).

### Prerequisites

- Azure subscription and a storage account
- Permission to create App Registrations and assign roles on the Storage Account
- A private container for your data (create one if needed)

### Set up a Service Principal in Entra


#### Register an app in Entra

1. Open the [Microsoft Entra admin center](https://entra.microsoft.com/#home). 
2. Select **App registrations** on the right and click **New registration**.  See [Register an application](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app). 

    Provide a name and select the appropriate account type. You can leave the redirect URI blank. 
3. Under Overview, copy the **Application (client) ID** and **Directory (tenant) ID**.
4. Under **Certificates & secrets**, add a new client secret.

    Copy the **Value** field.

#### Grant the principal storage access in Azure

Return to the Azure portal and go to your storage account. 

1. From your storage account, select **Access control (IAM)** on the left. 
2. Select **Add > Add role assignment**.  
3. Use the search field to locate **Storage Blob Data Contributor**. Click the role to highlight it. 
4. Select the **Members** tab above. 
5. Select **User, group, or service principal** and then click **Select members**. 
6. Use the search field provided to locate the name of the app you created earlier and click **Select**
7. Click **Review + assign**. 

#### Create a container

1. While still on the page for your storage account, click **Data storage** on the left. 
2. Select **Containers** 
3. If you do not have a container, create a new one with private access. 

!!! warning
    If you plan to use pre-signed URLs, configure CORS on the Storage Account Blob service. See [Set up CORS for Azure blob storage](#Set-up-CORS-for-Azure-blob-storage).

#### Required permissions

- For source storage: 
  - `Microsoft.Storage/storageAccounts/blobServices/containers/read` 
  - `.../containers/blobs/read`
- For target storage: 
  - `.../containers/blobs/read`
  - `.../containers/blobs/write`
  - `.../containers/read`
  - `.../containers/blobs/delete` (optional)

These are included in the built-in **Storage Blob Data Contributor** role.

### Create a source storage connection

From Label Studio, open your project and select **Settings > Cloud Storage** > **Add Source Storage**.

Select **Azure Blob Storage with Service Principal** and click **Next**.

##### Configure Connection

Complete the following fields and then click **Test connection**:

<div class="noheader rowheader">

| | |
| --- | --- |
| Storage Title | Enter a name for the storage connection to appear in Label Studio. | 
| Storage Name | Enter the name of your Azure storage account. |
| Container Name | Enter the name of a container within the Azure storage account. |
| Tenant ID | Specify the **Directory (tenant) ID** from your App Registration. |
| Client ID | Specify the **Application (client) ID** from your App Registration. |
| Client Secret | Specify the **Value** of the client secret you copied earlier. |
| **Use pre-signed URLs / Proxy through the platform** | Enable or disable pre-signed URLs. [See more.](storage#Pre-signed-URLs-vs-Storage-proxies) |
| Expiration minutes | Adjust the counter for how many minutes the pre-signed URLs are valid. |

</div>

##### Import Settings & Preview

Complete the following fields and then click **Load preview** to ensure you are syncing the correct data:

<div class="noheader rowheader">

| | |
| --- | --- |
| Bucket Prefix | Optionally, enter the folder name within the container that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  | 
| Import Method | Select whether you want create a task for each file in your container or whether you would like to use a JSON/JSONL/Parquet file to define the data for each task. |
| File Name Filter | Specify a regular expression to filter bucket objects. Use `.*` to collect all objects. |
| Scan all sub-folders | Enable this option to perform a recursive scan across subfolders within your container. |

</div>


##### Review & Confirm

If everything looks correct, click **Save & Sync** to sync immediately, or click **Save** to save your settings and sync later.

!!! info Tip
    You can also use the API to [sync import storage](https://api.labelstud.io/api-reference/api-reference/import-storage/azure-spi/sync).

### Create a target storage connection

From Label Studio, open your project and select **Settings > Cloud Storage > Add Target Storage**.

Select **Azure Blob Storage with Service Principal** and click **Next**. 

Complete the following fields:

<div class="noheader rowheader">

| | |
| --- | --- |
| Storage Title | Enter a name for the storage connection to appear in Label Studio. | 
| Storage Name | Enter the name of your Azure storage account. |
| Container Name | Enter the name of a container within the Azure storage account. |
| Container Prefix | Optionally, enter the folder name within the container that you would like to use.  For example, `data-set-1` or `data-set-1/subfolder-2`.  |
| Tenant ID | Specify the **Directory (tenant) ID** from your App Registration. |
| Client ID | Specify the **Application (client) ID** from your App Registration. |
| Client Secret | Specify the **Value** of the client secret you copied earlier. |
| Can delete objects from storage | Enable this option if you want to delete annotations stored in the bucket when they are deleted in Label Studio. Your credentials must include the ability to delete bucket objects. |

</div>

After adding, click **Sync** to push exports.

!!! info Tip
    You can also use the API to [sync export storage](https://api.labelstud.io/api-reference/api-reference/export-storage/azure-spi/sync).

#### Validate and troubleshoot

- After adding the storage, the connection is checked. If it fails, verify:
  - Tenant ID, Client ID, Client Secret values (no extra spaces; secret not expired)
  - Storage account and container names (case-sensitive)
  - Role assignment: App Registration has Storage Blob Data Contributor on the Storage Account
  - CORS is set when using pre-signed URLs; try proxy mode if testing

</div>


## Add storage with the Label Studio API

You can also use the API to programmatically create connections. [See our API documentation.](https://api.labelstud.io/api-reference/introduction/getting-started)