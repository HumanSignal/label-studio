---
title: API Reference for Label Studio
short: API
type: guide
tier: all
order: 401
order_enterprise: 401
meta_title: API Endpoints
meta_description: API documentation for authenticating, listing data science projects, importing predictions and raw data and exporting annotated data, and user management.
section: "Integrate & Extend"

---

You can use the Label Studio API to import data for labeling, export annotations, set up machine learning with Label Studio, and sync tasks with cloud storage. 

See the [API reference documentation](https://api.labelstud.io/api-reference/introduction/getting-started) for further guidance and interactive examples. If you want to write Python scripts using the API, use the [Label Studio Python SDK](sdk.html). 

!!! info Tip
    For additional guidance on using our API, see [5 Tips and Tricks for Label Studio’s API and SDK](https://labelstud.io/blog/5-tips-and-tricks-for-label-studio-s-api-and-sdk/).


### Authenticate to the API

You must retrieve your access token so that you can authenticate to the API. 

Whether you can create a token, and which types of tokens you can create, depends on your org settings.

!!! note "API keys vs. Access tokens"
    In Label Studio, **"access tokens"** and **"API keys"** mean the same thing and are used interchangeably.  

There are two types of access tokens/API keys: **Personal Access Tokens (PATs)** and **Legacy Tokens**. 

You can read more about the differences between them here: [Access Tokens](access_tokens). 

#### Find your access token

1. Open Label Studio and click your user icon in the upper right. Select **Account & Settings**. 
2. Select **Personal Access Token** or **Legacy Token** on the left. 

Depending on which one you select, you will need to either generate a new token or copy the one that is displayed. 


#### Authenticate HTTP API requests with a personal access token

PATs use `'Authorization: Bearer <token>'` when used with HTTP API requests, for example:

```bash
curl -X <method> <Label Studio URL>/api/<endpoint> -H 'Authorization: Bearer <token>'
```

#### Authenticate HTTP API requests with a legacy token

Legacy tokens use `'Authorization: Token <token>'` when used with HTTP API requests, for example:

```bash
curl -X <method> <Label Studio URL>/api/<endpoint> -H 'Authorization: Token <token>
```

#### Authenticate Python SDK requests

When used with the SDK, you do not need to distinguish between legacy tokens or personal access tokens. 

```python
# Define the URL where Label Studio is accessible
LABEL_STUDIO_URL = 'YOUR_BASE_URL'

# API key can be either your PAT or legacy access token
LABEL_STUDIO_API_KEY = 'YOUR_API_KEY'

# Import the SDK and the client module
from label_studio_sdk import LabelStudio
client = LabelStudio(base_url=LABEL_STUDIO_URL, api_key=LABEL_STUDIO_API_KEY)
```

See [API documentation for authentication](https://api.labelstud.io/api-reference/introduction/getting-started#authentication).

### List all projects

To perform most tasks with the Label Studio API, you must specify the project ID, sometimes referred to as the `pk`, or primary key. If you don't know what your project ID is, you might want to get a list of all projects in Label Studio that you can access. See the [List your projects API endpoint documentation](https://api.labelstud.io/api-reference/api-reference/projects/list).

### Create and set up a project

Create a project and set up the labeling interface in Label Studio using the API. See the [Create new project API endpoint documentation](https://api.labelstud.io/api-reference/api-reference/projects/create).

If you want to make sure the configuration for your labeling interface is valid before submitting it using the API, you can use the [validate label config](https://api.labelstud.io/api-reference/api-reference/projects/validate-config) API endpoint.

### Import tasks using the API

To import tasks using the API, make sure you know the project ID that you want to add tasks to. See additional examples and parameter descriptions in the [import data endpoint documentation](https://api.labelstud.io/api-reference/api-reference/tasks/create)

### Retrieve tasks
Retrieve a paginated list of tasks for a specific project. If you want, you can also retrieve tasks and annotations using this API endpoint, as an alternative to exporting annotations. See details and parameters in the [list project tasks endpoint documentation](https://api.labelstud.io/api-reference/api-reference/tasks/list).

### Export annotations

To export annotations, first see [which formats are available to export for your project](https://api.labelstud.io/api-reference/api-reference/projects/exports/list-formats). 

Choose your selected format from the response and then call the export endpoint. See the [export annotations](https://api.labelstud.io/api-reference/api-reference/projects/exports/download-sync) endpoint documentation for more details.
