---
title: API Reference for Label Studio
short: Backend API
type: guide
tier: all
order: 214
order_enterprise: 120
meta_title: API Endpoints
meta_description: API documentation for authenticating, listing data science projects, importing predictions and raw data and exporting annotated data, and user management.
section: "Integration and Development"

---

You can use the Label Studio API to import data for labeling, export annotations, set up machine learning with Label Studio, and sync tasks with cloud storage. 

See the [API reference documentation](/api) for further guidance and interactive examples. If you want to write Python scripts using the API, use the [Label Studio Python SDK](sdk.html). 

<div class="enterprise-only">

<p>
The Label Studio Enterprise API shares many endpoints with the Label Studio Community Edition API, but includes extra payload options and additional endpoints specific to Enterprise features. Access the full Label Studio Enterprise API reference documentation by doing the following:</p>
<ol>
<li>Log in to Label Studio Enterprise</li>
<li>Open the menu and click <b>API</b></li>
</ol>

</div>

### Authenticate to the API

You must retrieve your access token so that you can authenticate to the API.

1. In the Label Studio UI, click the user icon in the upper right.
2. Click **Account & Settings**.
3. Copy the access token. 

In your first API call, specify the access token in the headers: 
```bash
curl -X <method> <Label Studio URL>/api/<endpoint> -H 'Authorization: Token <token>'
```

<div class="opensource-only">

You can also retrieve the access token using the command line. 
1. From the command line, run the following: 
```bash
label-studio user --username <username>
```
2. In the output returned in your terminal, the token for the user is listed as part of the user info.  

</div>

See [API documentation for authentication](/api#section/Authentication).

### List all projects

To perform most tasks with the Label Studio API, you must specify the project ID, sometimes referred to as the `pk`, or primary key. If you don't know what your project ID is, you might want to get a list of all projects in Label Studio that you can access. See the [List your projects API endpoint documentation](/api#operation/api_projects_list).

### Create and set up a project

Create a project and set up the labeling interface in Label Studio using the API. See the [Create new project API endpoint documentation](/api#operation/api_projects_create).

If you want to make sure the configuration for your labeling interface is valid before submitting it using the API, you can use the [validate label config](/api#operation/api_projects_validate_create) API endpoint.

### Import tasks using the API

To import tasks using the API, make sure you know the project ID that you want to add tasks to. See additional examples and parameter descriptions in the [import data endpoint documentation](/api#operation/api_projects_import_create)

### Retrieve tasks
Retrieve a paginated list of tasks for a specific project. If you want, you can also retrieve tasks and annotations using this API endpoint, as an alternative to exporting annotations. See details and parameters in the [list project tasks endpoint documentation](/api#operation/api_projects_tasks_list).

### Export annotations

To export annotations, first see [which formats are available to export for your project](/api#operation/api_projects_export_formats_read). 

Choose your selected format from the response and then call the export endpoint. See the [export annotations](/api#operation/api_projects_export_read) endpoint documentation for more details.
