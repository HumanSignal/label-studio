---
title: Backend API
type: guide
order: 907
---

> These API endpoints become actual starting from Label Studio version 0.8.1. 

### Setup labeling config

Save labeling config for the project using API: 
```
curl -X POST -H Content-Type:application/json http://localhost:8080/api/project/config \
--data "{\"label_config\": \"<View>[...]</View>\"}"
```

The backend should return status 201 if config is valid and saved. 
If errors occur the backend returns status 400 and response body will be JSON dict: 
```
{
  "label_config": ["error 1 description", " error 2 description", ...]
}
```



### Import data and tasks 

Use API to import tasks in [Label Studio basic format](tasks.html#Basic-format) if for any reason you can't access either a local filesystem nor Web UI (e.g. if you are creating a data stream)

```bash
curl -X POST -H Content-Type:application/json http://localhost:8080/api/project/import \
--data "[{\"my_key\": \"my_value_1\"}, {\"my_key\": \"my_value_2\"}]"
```

### Retrieve tasks

You can retrieve project settings including total task count using API in JSON format: 

```json   
http://<host:port>/api/project/export
```

Response example: 

```json
{
  ... 
  "task_count": 3,
  ...
}
```

To get tasks with pagination in JSON format:

```
http://<host:port>/api/tasks?page=1&page_size=10&order={-}[id|completed_at]
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

### Export annotations

You can use an API to request a file with exported results, e.g.

```bash
curl http://localhost:8080/api/project/export?format=JSON > exported_results.zip
```

The formats description are presented [above](#Export-formats). 
The `format` parameters could be found on Export page in the dropdown (JSON, JSON_MIN, COCO, VOC, etc).

### All endpoints

| URL | Description |
| --- | --- |
| **Project** |
| /api/project                      | `GET` return project settings and states (like task and completion counters) <br> `POST` create a new project for multi-session-mode with `desc` field from request args as project title <br> `PATCH` update project settings |
| /api/project/config               | `POST` save labeling config |
| /api/project/import               | `POST` import data or tasks |
| /api/project/export               | `GET` generate export file with `format` field |
| /api/project/next                 | `GET` generate the next task for labeling stream |
| /api/project/storage-settings     | `GET` current storage settings <br> `POST` set storage settings |
| /api/project-switch               | `GET` switch to specified project by project UUID in multi-session mode |
| **Tasks** |
| /api/tasks                        | `GET` retrieve all tasks from project <br> `DELETE` delete all tasks from project |
| /api/tasks/\<task_id>              | `GET` retrieve task <br> `DELETE` delete task  |
| /api/tasks/\<task_id>/completions  | `POST` create a new completion <br> `DELETE` delete all task completions |
| /api/tasks/\<task_id>/completions/\<completion_id> | `PATCH` update completion <br> `DELETE` delete completion |
| /api/completions                  | `GET`: return all completion ids <br> `DELETE` delete all project completions |
| **Machine Learning Models** | 
| /api/models                       | `GET` list all models <br> `DELETE` remove model with `name` field from request json body |  
| /api/models/train                 | `POST` send training signal to ML backend | 
| /api/models/predictions?mode={data\|all_tasks} | `GET \| POST`<br> `mode=data`: generate ML model predictions for one task from `data` field of request json body<br> `mode=all_tasks`: generate ML model predictions for all LS DB tasks | 
| **Helpers** |
| /api/validate-config              | `POST` check labeling config for errors |
| /api/import-example               | `GET \| POST` generate example for import by given labeling config |
| /api/import-example-file          | `GET` generate example file for import using current project labeling config | 
| /api/health                       | `GET` health check |
| /version                          | `GET` current Label Studio Backend and Frontend versions |
