---
title: Backend API
type: guide
order: 907
meta_title: API Endpoints
meta_description: API documentation for authenticating, listing data science projects, importing predictions and raw data and exporting annotated data, and user management in Label Studio.
---

## API reference for Label Studio 1.0.0

You can use the Label Studio API to import data for labeling, export annotations, set up machine learning with Label Studio, and sync tasks with cloud storage. 

See the [API reference documentation](/api) for further guidance and interactive examples. 

### Authenticate to the API

You must retrieve your access token so that you can authenticate to the API.

1. In the Label Studio UI, click the user icon in the upper right.
2. Click **Account & Settings**.
3. Copy the access token. 

In your first API call, specify the access token in the headers: 
```bash
curl -X <method> <Label Studio URL>/api/<endpoint> -H 'Authorization: Token <token>'
```

You can also retrieve the access token using the command line. 
1. From the command line, run the following: 
```bash
label-studio user --username <username>
```
2. In the output returned in your terminal, the token for the user is listed as part of the user info.  

See [API documentation for authentication](/api#section/Authentication).

### List all projects

To perform most tasks with the Label Studio API, you must specify the project ID, sometimes referred to as the `pk`. If you don't know what your project ID is, you might want to get a list of all projects in Label Studio that you can access. See the [List your projects API endpoint documentation](/api#operation/api_projects_list).

### Create and set up a project

Create a project and set up the labeling interface in Label Studio using the API. See the [Create new project API endpoint documentation](/api#operation/projects_create).

If you want to make sure the configuration for your labeling interface is valid before submitting it using the API, you can use the [validate label config](/api#operation/projects_validate_create) API endpoint.

### Import tasks using the API

To import tasks using the API, make sure you know the project ID that you want to add tasks to. See additional examples and parameter descriptions in the [import data endpoint documentation](/api#operation/projects_import_create)

### Retrieve tasks
Retrieve a paginated list of tasks for a specific project. If you want, you can also retrieve tasks and annotations using this API endpoint, as an alternative to exporting annotations. See details and parameters in the [list project tasks endpoint documentation](/api#operation/projects_tasks_list).

### Export annotations

To export annotations, first see [which formats are available to export for your project](/api#operation/api_projects_export_formats_read). 

Choose your selected format from the response and then call the export endpoint. See the [export annotations](/api#operation/projects_export_list) endpoint documentation for more details.

### API endpoint reference for older Label Studio versions

These API endpoints were introduced in Label Studio version 0.8.1 and are only valid until version 0.9.1. Use the [API documentation](/api) linked inside Label Studio and for guidance when working with version 1.0.0. 

### Set up project configuration

> These API endpoints were introduced in Label Studio version 0.8.1 and are only valid until version 0.9.1. 

`POST /api/project/config`

Save labeling config for a project using API: 
```
curl -X POST -H Content-Type:application/json http://localhost:8080/api/project/config \
--data "{\"label_config\": \"<View>[...]</View>\"}"
```

Or by reading from a local config.xml file:

```
curl -X POST -H Content-Type:application/xml http://localhost:8080/api/project/config \
--data @config.xml
```

The backend returns status 201 if the config is valid and saved. 
If errors occur, the backend returns status 400 and the response body is a JSON dict like the following: 
```
{
  "label_config": ["error 1 description", " error 2 description", ...]
}
```

### Import data, files and tasks 

> These API endpoints were introduced in Label Studio version 0.8.1 and are only valid until version 0.9.1. 

`POST /api/project/import`

Use the API to import tasks in [Label Studio basic format](tasks.html#Basic-format), which can be useful when you are creating a data stream.

```bash
curl -X POST -H Content-Type:application/json http://localhost:8080/api/project/import \
--data "[{\"my_key\": \"my_value_1\"}, {\"my_key\": \"my_value_2\"}]"
```

Or you can import a file and make a Label Studio task automatically:

```bash
curl -X POST -F "FileUpload=@test.jpg" http://localhost:8080/api/project/import
```

### Retrieve project

> These API endpoints were introduced in Label Studio version 0.8.1 and are only valid until version 0.9.1. 

`GET /api/project`

You can retrieve project settings, including the total task count, using the API in JSON format: 

```json
curl http://localhost:8080/api/project/
```

Response example: 

```json
{
  ... 
  "task_count": 3,
  ...
}
```

### Retrieve tasks

> These API endpoints were introduced in Label Studio version 0.8.1 and are only valid until version 0.9.1. 

`GET /api/tasks`

To get tasks with pagination in JSON format:

```
curl http://localhost:8080/api/tasks?page=1&page_size=10&order=-completed_at
```

Response example:
 
```json
[
  {
    "completed_at": "2020-05-29 03:31:15", 
    "completions": [
      {
        "created_at": 1590712275, 
        "id": 10001, 
        "lead_time": 4.0, 
        "result": [ ... ]
      }
    ], 
    "data": {
      "image": "s3://htx-dev/dataset/training_set/dogs/dog.102.jpg"
    }, 
    "id": 2, 
    "predictions": []
  }
]
```

`order` can be either one of `id`, `-id`, `completed_at`, `-completed_at`

### Export annotations

> These API endpoints were introduced in Label Studio version 0.8.1 and are only valid until version 0.9.1. 

`GET /api/project/export`

You can use the API to request a file with all annotations, for example:

```bash
curl http://localhost:8080/api/project/export?format=JSON > exported_results.json
```

The format descriptions are presented [in the export documentation](export.html). 
The `format` parameters can be found on the Export page in the dropdown (`JSON`, `JSON_MIN`, `COCO`, `VOC`, etc).


### Health check for Label Studio

Label Studio has a special endpoint to run health checks: 
  
```bash
GET /api/health
```

### Reference
Label Studio API endpoint reference.

> These API endpoints were introduced in Label Studio version 0.8.1 and are only valid until version 0.9.1. 


| URL | Description |
| --- | --- |
| **Project** |
| /api/project                      | `GET` return project settings and states (like task and completion counters) <br> `POST` create a new project for multi-session-mode with `desc` field from request args as project title <br> `PATCH` update project settings |
| /api/project/config               | `POST` save project configuration (labeling config, etc) |
| /api/project/import               | `POST` import data or annotations |
| /api/project/export               | `GET` downalod annotations, pass `format` param to specify the format |
| /api/project/next                 | `GET` return next task available for labeling |
| /api/project/storage-settings     | `GET` current storage settings <br> `POST` set storage settings |
| /api/project-switch               | `GET` switch to specified project by project UUID in multi-session mode |
| **Tasks** |
| /api/tasks                        | `GET` retrieve all tasks from project <br> `DELETE` delete all tasks from project |
| /api/tasks/\<task_id>              | `GET` retrieve specific task <br> `DELETE` delete specific task <br> `PATCH \| POST` rewrite task with data, completions and predictions (it's very helpful for changing data in time and prediction updates) |
| /api/tasks/\<task_id>/completions  | `POST` create a new completion <br> `DELETE` delete all task completions |
| /api/tasks/\<task_id>/completions/\<completion_id> | `PATCH` update completion <br> `DELETE` delete completion |
| /api/completions                  | `GET` returns all completion ids <br> `DELETE` delete all project completions |
| **Machine Learning Models** | 
| /api/models                       | `GET` list all models <br> `DELETE` remove model with `name` field from request json body |  
| /api/models/train                 | `POST` send training signal to ML backend | 
| /api/models/predictions?mode={data\|all_tasks\|specific_tasks} | `GET \| POST`<br> `mode=data`: generate ML model predictions for one task from `data` field of request json body<br> `mode=all_tasks`: generate ML model predictions for all LS DB tasks <br> `mode=specific_tasks`: generate predictions for tasks specified in "task_ids" JSON data or in path arguments, e.g.: <nobr><i>?mode=specific_tasks&task_ids=1,2,3</i></nobr> | 
| **Helpers** |
| /api/validate-config              | `POST` check labeling config for errors |
| /api/import-example               | `GET \| POST` generate example for import by given labeling config |
| /api/import-example-file          | `GET` generate example file for import using current project labeling config | 
| /api/health                       | `GET` health check |
| /version                          | `GET` current Label Studio Backend and Frontend versions |
