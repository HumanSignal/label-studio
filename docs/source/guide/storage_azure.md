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

Label Studio Enterprise also supports secretless authentication, using workload identity or an Azure managed identity instead of a client secret.

For more information, see [Azure Blob Storage with Service Principal](https://docs.humansignal.com/guide/storage_azure.html#Azure-Blob-Storage-with-Service-Principal) in our Enterprise documentation.

</div>

<div class="enterprise-only">

You can use Azure Service Principal authentication to securely connect Label Studio Enterprise to Azure Blob Storage without using storage account access keys. 

You can authenticate with a client secret, as described in the steps below, or without any stored secret by using workload identity or a managed identity. See [Secretless authentication with workload identity](#Secretless-authentication-with-workload-identity).

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

### Secretless authentication with workload identity

With workload identity authentication, Label Studio Enterprise uses the Azure identity attached to its deployment to access your container. No client secret is created, stored in Label Studio, or rotated. This is available for self-hosted Label Studio Enterprise.

Label Studio does not need to run in Azure. Any Kubernetes cluster that can federate with Microsoft Entra ID (AKS, EKS, or another cluster) works, as does any Azure host with a managed identity, such as a VM running Label Studio in Docker.

How it works:

1. Label Studio requests a token from Microsoft Entra ID using the identity attached to the deployment. Only workload identity and managed identity are tried; environment secrets, the Azure CLI and other developer credentials are excluded.
2. Label Studio uses that token to list, read, and write blobs.
3. When pre-signed URLs are enabled, Label Studio requests a user delegation key from the storage account and signs short-lived, read-only SAS URLs with it. The key is valid for one day and is refreshed automatically.

!!! note
    One Azure identity serves the whole deployment. Every workload identity connection authenticates as that identity (or as a user-assigned managed identity you select by client ID), so scope its role assignments to the storage accounts Label Studio should reach.

#### Prerequisites

- Self-hosted Label Studio Enterprise, deployed either on a Kubernetes cluster whose OIDC issuer Microsoft Entra ID can reach (AKS with the OIDC issuer enabled, EKS, or another cluster), or on any Azure host with a managed identity.
- An Azure storage account with a private container.
- Permission to create a managed identity, add federated credentials, and assign roles on the storage account.
- CORS configured on the Blob service if you plan to use pre-signed URLs. See [Set up CORS for Azure blob storage](#Set-up-CORS-for-Azure-blob-storage).

The required permissions are the same as for a Service Principal, plus `Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey/action` for pre-signed URLs. All of them are included in the built-in **Storage Blob Data Contributor** role.

#### Set up the identity in Azure

Create one identity for Label Studio, grant it access to your storage account, and allow Label Studio to use it. Replace the values in `<>` with your own.

1. Create a user-assigned managed identity and note its `clientId` and `principalId`:

    ```bash
    az identity create --name lse-storage-identity --resource-group <RESOURCE_GROUP>
    ```

2. Assign **Storage Blob Data Contributor** on the storage account:

    ```bash
    az role assignment create \
      --assignee-object-id <PRINCIPAL_ID> \
      --assignee-principal-type ServicePrincipal \
      --role "Storage Blob Data Contributor" \
      --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>/providers/Microsoft.Storage/storageAccounts/<STORAGE_ACCOUNT>
    ```

    If you scope the role to a single container instead, also assign **Storage Blob Delegator** at the storage account level. Pre-signed URLs need it to request a user delegation key.

3. **Kubernetes only:** Get the cluster's OIDC issuer URL, then add a federated credential for each Label Studio service account (app, rqworker, and rqcron if you enable it):

    ```bash
    ISSUER=$(az aks show -n <CLUSTER> -g <RESOURCE_GROUP> --query "oidcIssuerProfile.issuerUrl" -o tsv)

    for SA in <RELEASE_NAME>-ls-app <RELEASE_NAME>-ls-rqworker <RELEASE_NAME>-ls-rqcron; do
      az identity federated-credential create \
        --name "$SA" \
        --identity-name lse-storage-identity \
        --resource-group <RESOURCE_GROUP> \
        --issuer "$ISSUER" \
        --subject "system:serviceaccount:<NAMESPACE>:$SA" \
        --audience api://AzureADTokenExchange
    done
    ```

    These are the Helm chart's default service account names. If you set `serviceAccount.name` for a component, use that name instead.

    On EKS or another non-AKS cluster, use that cluster's OIDC issuer URL instead. For EKS: `aws eks describe-cluster --name <CLUSTER> --query "cluster.identity.oidc.issuer" --output text`. Microsoft Entra ID must be able to reach the issuer's discovery document to validate tokens.

4. **Azure host with a managed identity only:** Attach the identity to the host that runs Label Studio. For a VM:

    ```bash
    az vm identity assign -g <RESOURCE_GROUP> -n <VM_NAME> --identities lse-storage-identity
    ```

#### Configure the Label Studio deployment

##### Kubernetes with Helm

These steps assume Label Studio is installed with Helm as described in [Install using Kubernetes](install_enterprise_k8s). For all chart values, see [Available Helm values](helm_values).

Each Label Studio pod that reaches Azure needs three environment variables and a projected service account token with the audience `api://AzureADTokenExchange`. Add the following to your `ls-values.yaml` and upgrade the release. This works on any cluster, including EKS and AKS. Merge it with any `extraEnvironmentVars`, `extraVolumes`, or `extraVolumeMounts` you already set.

```yaml
global:
  extraEnvironmentVars:
    AZURE_CLIENT_ID: "<CLIENT_ID>"
    AZURE_TENANT_ID: "<TENANT_ID>"
    AZURE_FEDERATED_TOKEN_FILE: "/var/run/secrets/azure/tokens/azure-identity-token"

app:
  extraVolumes:
    - name: azure-federated-token
      projected:
        sources:
          - serviceAccountToken:
              path: azure-identity-token
              expirationSeconds: 3600
              audience: api://AzureADTokenExchange
  extraVolumeMounts:
    - name: azure-federated-token
      mountPath: /var/run/secrets/azure/tokens
      readOnly: true

rqworker:
  extraVolumes:
    - name: azure-federated-token
      projected:
        sources:
          - serviceAccountToken:
              path: azure-identity-token
              expirationSeconds: 3600
              audience: api://AzureADTokenExchange
  extraVolumeMounts:
    - name: azure-federated-token
      mountPath: /var/run/secrets/azure/tokens
      readOnly: true

# Only needed if rqcron.enabled is true
rqcron:
  extraVolumes:
    - name: azure-federated-token
      projected:
        sources:
          - serviceAccountToken:
              path: azure-identity-token
              expirationSeconds: 3600
              audience: api://AzureADTokenExchange
  extraVolumeMounts:
    - name: azure-federated-token
      mountPath: /var/run/secrets/azure/tokens
      readOnly: true
```

The app validates connections and signs URLs, and the RQ workers run syncs and exports, so all of them need the identity. The feature flag `FF_AZURE_SPI_WORKLOAD_IDENTITY` is on by default for on-prem deployments, so you don't need to set it.

**On AKS**, you can use the Azure Workload Identity webhook instead. It injects the same three variables and the projected token, so you can skip the `extraEnvironmentVars` and `extraVolumes` above. The cluster needs Workload Identity enabled. Label the pods and annotate their service accounts:

```yaml
app:
  podLabels:
    azure.workload.identity/use: "true"
  serviceAccount:
    annotations:
      azure.workload.identity/client-id: "<CLIENT_ID>"

rqworker:
  podLabels:
    azure.workload.identity/use: "true"
  serviceAccount:
    annotations:
      azure.workload.identity/client-id: "<CLIENT_ID>"

# Only needed if rqcron.enabled is true
rqcron:
  podLabels:
    azure.workload.identity/use: "true"
  serviceAccount:
    annotations:
      azure.workload.identity/client-id: "<CLIENT_ID>"
```

With the webhook, leave **Client ID** blank on the storage connection. The identity comes from the injected `AZURE_CLIENT_ID`, and a value in the form is treated as a managed identity client ID.

##### Any Azure host with a managed identity (VM, Docker)

No environment variables are needed. The Azure SDK gets tokens from the host's instance metadata endpoint, so the Label Studio containers (`app` and `rqworkers`) only need network access to it.

- With a system-assigned identity, leave **Client ID** blank on the storage connection.
- With a user-assigned identity, enter its client ID on each storage connection, or set `AZURE_CLIENT_ID=<CLIENT_ID>` in the `app` and `rqworkers` environment.

##### Environment variables

| Variable | Description |
| --- | --- |
| `AZURE_CLIENT_ID` | Client ID of the identity Label Studio signs in as. Used when a connection leaves **Client ID** blank. Set in Helm values, or injected by the webhook on AKS. |
| `AZURE_TENANT_ID` | Microsoft Entra tenant of the identity. Set in Helm values, or injected by the webhook on AKS. |
| `AZURE_FEDERATED_TOKEN_FILE` | Path to the projected service account token used for federation. Set in Helm values, or injected by the webhook on AKS. Not needed on an Azure host with a managed identity. |
| `FF_AZURE_SPI_WORKLOAD_IDENTITY` | Turns workload identity authentication on or off. On by default for on-prem deployments. When off, the option is hidden in the UI and the API rejects `workload_identity`. |
| `AZURE_BLOB_ACCOUNT_NAME` | Fallback storage account name when a connection leaves **Storage Name** blank. |

#### Create a storage connection with workload identity

From Label Studio, open your project and select **Settings > Cloud Storage > Add Source Storage** (or **Add Target Storage**). Select **Azure Blob Storage with Service Principal**, click **Next**, and set **Authentication Method** to **Workload identity / managed identity (no secret)**.

The form changes as follows. All other fields work the same as for a Service Principal connection.

<div class="noheader rowheader">

| | |
| --- | --- |
| Storage Name | Enter the name of your Azure storage account. |
| Container Name | Enter the name of a container within the Azure storage account. |
| Client ID | Optional. Enter the client ID of a user-assigned managed identity attached to Label Studio. Leave blank to use the deployment default. |
| Tenant ID | Hidden in this mode. |
| Client Secret | Hidden in this mode. Sending a client secret through the API is rejected. |

</div>

To create the connection with the API, set `auth_mode` to `workload_identity` and omit `client_secret`. See [Create Azure import storage with Service Principal](https://api.labelstud.io/api-reference/api-reference/import-storage/azure-spi/create).

Existing Service Principal connections are not migrated automatically. To switch a connection, [update it](https://api.labelstud.io/api-reference/api-reference/import-storage/azure-spi/update) with `{"auth_mode": "workload_identity"}`. Label Studio removes the stored client secret when it saves the change. To switch back, set `auth_mode` to `service_principal` and supply `tenant_id`, `client_id`, and `client_secret`.

#### Troubleshoot workload identity

| Symptom or error | Likely cause | Fix |
| --- | --- | --- |
| `Workload identity authentication is not enabled for this organization.` | Feature flag is off | Set `FF_AZURE_SPI_WORKLOAD_IDENTITY=true` and restart Label Studio. |
| `client_secret is not allowed when auth_mode is workload_identity.` | A secret was sent with workload identity | Remove `client_secret` from the request. |
| `This field is required when auth_mode is service_principal.` | Switched back to Service Principal without credentials | Supply `tenant_id`, `client_id`, and `client_secret`. |
| Connection check fails with `DefaultAzureCredential failed to retrieve a token` | Environment variables or projected token missing, or federated credential subject does not match | With the AKS webhook, check the pod label and service account annotation; otherwise, check the three `AZURE_*` variables and the projected token. Also check that the federated credential subject is `system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>` for app, rqworker, and rqcron. |
| Connection check passes but sync or export fails | Only the app pod has the identity | Apply the same setup (projected token, or the webhook label and annotation) to the rqworker (and rqcron) pods. |
| `AuthorizationPermissionMismatch` (403) | Role not assigned, or assignment still propagating | Confirm **Storage Blob Data Contributor** on the account or container. Role assignments can take several minutes to apply. |
| Media fails to load only with pre-signed URLs | User delegation key not permitted, or CORS missing | Grant **Storage Blob Delegator** at the account level if the role is container-scoped, and check CORS. Try proxy mode to isolate the issue. |
| Wrong identity is used | Several identities available | Enter the intended managed identity client ID on the connection, or set `AZURE_CLIENT_ID`. |

</div>


## Add storage with the Label Studio API

You can also use the API to programmatically create connections. [See our API documentation.](https://api.labelstud.io/api-reference/introduction/getting-started)