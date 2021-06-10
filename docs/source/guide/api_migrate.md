---
title: Update scripts and API calls in Label Studio Enterprise
short: Update scripts and API calls
badge: <i class='ent'></i>
type: guide
order: 910
meta_title: Update scripts and API calls to new version
meta_description: Label Studio Enterprise documentation about updates and changes to the API endpoints in version 2.0. 
---
 
 With the new version of Label Studio Enterprise, you must update your scripts and API calls to match new API endpoints and formats. Some endpoints are new, some arguments for existing endpoints are deprecated and removed, and some payloads have changed for POST requests.
  
> Throughout the new version, `completions` have been renamed `annotations`. In addition, "Teams" are now called "Workspaces", to better reflect the fact that they are a way to organize projects, rather than people. 

> If you rely on existing object IDs (like project_id, task_id, annotation_id, etc.), these were likely changed due to database migration.


## Import data

One endpoint has been deprecated and the payload and response have small updates. 

### Update bulk task import calls

The endpoint `/api/projects/<int:project_id>/tasks/bulk` still works, but is deprecated and will be removed in the future.

Update calls to that endpoint to use the `/api/projects/<project_ID>/import` endpoint instead. See the [import task data API endpoint documentation](/api#operation/api_projects_import_create).

### Update task import payload for pre-annotations

When you import pre-annotations into Label Studio, the `completions` field is now `annotations`. See the [import task data API endpoint documentation](/api#operation/api_projects_import_create).

### Changes to the endpoint response
The endpoint response returns an `annotation_count` field instead of a `completion_count` field. If your script expects a response with this field, update it to expect a response with the new field. 

## Export data

The export endpoint has changed, and so have the available options for that endpoint and the response parameters.

### Updated export endpoint
To export annotations from Label Studio Enterprise, you must call a new endpoint.

Requests made to `/api/projects/<project_ID>/results` fail. Instead, call `/api/projects/<project_ID>/export?exportType=JSON`. See the [export API endpoint documentation](/api#operation/api_projects_export_read).

With this change, several arguments are no longer supported:

| Deprecated argument | New behavior |
| --- | --- |
| `?aggregator_type=` | Cannot export aggregated annotations. |
| `?finished=0` | No longer a default setting. Instead, use `download_all_tasks=true`. |
| `?return_task=1` | Endpoint always returns all tasks. |
| `?return_predictions=1` | Endpoint always returns predictions. |
| `?return_ground_truths=1` | Endpoint always returns ground truth annotations. | 


### Changes to the endpoint response

In the endpoint response when exporting annotations, the `"completions":` section is renamed to `"annotations"`. 

The content of the response also has some changes:
- `aggregated` is removed
- `aggregated_completed_by` is removed
- `aggregated_ids` is removed
- `ground_truth` is removed
- `result` is no longer a double list `"result": [[... ]]` and is now a single list `“result”: [...] `
- `completed_by` IDs now refer to the actual user IDs (not "expert" IDs as before)

#### Previous version response

```json
"completions": [ 
 {
   "aggregated": true,
   "aggregated_completed_by": [
     103
   ],
   "aggregated_ids": [
     800955
   ],
   "ground_truth": false,
   "result": [
     [ 
       {
         "id": "7tHQ-n6xfo",
         "type": "choices",
         "value": {
           "choices": [
             "Neutral"
           ]
         },
         "to_name": "text",
         "from_name": "sentiment"
       }
     ]
   ]
 }
]
```

#### Current version response


```json
"annotations": [ 
 {
   "result": [
       {
         "id": "7tHQ-n6xfo",
         "type": "choices",
         "value": {
           "choices": [
             "Neutral"
           ]
         },
         "to_name": "text",
         "from_name": "sentiment"
       }
   ]
 }
]
```

## Invite people and create accounts

When you invite people to join your organization, workspace (formerly team), and projects, there are many changes. 

### Update tokens in use
The old tokens are no longer supported. Make a request reset your organization token used to create invitation links. 

See the [reset organization token API endpoint documentation](/api#operation/api_invite_reset-token_create).

### Updated URL to invite people to your organization 

The URL that you use to invite people to your Label Studio Enterprise organization has changed from `https://app.heartex.ai/organization/welcome/<token>` to `http://localhost:8000/user/signup/?token=<token>`. 

You can generate the token for that URL using the [organization invite link API endpoint documentation](/api#operation/api_invite_list), then using the response to create the invitation URL.

For example, with the example response:
```json
{
"token": "111a2b3333cd444e",
"invite_url": "/user/signup/?token=111a2b3333cd444e"
}
```

Create an invitation URL of `http://localhost:8000/user/signup/?token=111a2b3333cd444e`.

### Updated flow for inviting project members

Links that invite people directly to projects are no longer supported. Instead, perform the following steps in order:
1. Invite the person to the organization with the [link returned by the organization invite API endpoint](/api#operation/api_invite_list).
2. Change the user's role to annotator with the [organization membership role endpoint](/api#operation/api_organizations_memberships_partial_update).
3. Add the user to the project by making a [POST request to the project member endpoint](/api#operation/api_projects_members_create).


## Create and update external and cloud storage
Some endpoints have been updated and some payload parameters are different when performing actions with the storage API.

### Updates to storage endpoints

When you want to retrieve information about a storage configuration, specify the type of storage in the API endpoint. 

Instead of `/api/storages/<int:pk>/`, call `api/storages/s3?project=<project_ID>` for Amazon S3 storage connections for the specific project. See the API documentation to [get Amazon S3 storage](/api#operation/api_storages_s3_list). You can also call `api/storages/s3/<storage_ID>` to get the details of a specific storage connection. See the API documentation to [get a specific Amazon S3 storage connection](/api#operation/api_storages_s3_read). 

The same change applies when syncing storage. 
Instead of `/api/storages/<int:pk>/sync/`, call `/api/storages/s3/<project_ID>/sync` to [sync Amazon S3 storage](/api#operation/api_storages_s3_sync_create).

### Updates to creating or listing storage payload parameters

Some parameters have changed as listed in the following table:

| Previous parameter | New parameter |
| --- | --- |
| path | bucket |
| regex | regex_filter |
| data_key | None. Instead, BLOBs are attached to the first available object tag |

## Create projects

With the change from teams to workspaces, the `team_id` parameter is no longer supported in the POST payload to create a project using the API. 

Instead, do the following:
1. [Create a project](/api#operation/api_projects_create).
2. [Add the project to a workspace](/api_workspaces_projects_create).
3. [Add the project to a workspace](/api#operation/api_workspaces_post).

 
