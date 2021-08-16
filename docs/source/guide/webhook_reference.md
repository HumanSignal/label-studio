---
title: Webhook event format reference 
short: Webhooks Event Reference
type: guide
order: 653
meta_title: Label Studio Webhook Event Reference 
meta_description: Label Studio reference documentation for webhook event fields and payloads sent from Label Studio for integration with your machine learning pipeline. 
---

Label Studio includes several types of webhook events that trigger when specific actions occur. Refer to the details on this page to determine what information is included in the payload of each webhook event. For details about how to use webhooks and to set up webhooks in Label Studio, see [Set up webhooks in Label Studio](webhooks.html). To create your own webhooks in Label Studio to trigger events when specific actions happen, see [Create custom events for webhooks in Label Studio](webhook_create.html). 

Webhooks sent from Label Studio include the following:

| Key | Details |
| --- | --- |
| action | Details the action that the event represents. |
| project | Included only for task and annotation events. Details about the project. |

The HTTP POST payloads that Label Studio sends to the configured webhook URLs include the headers that you set up when you [configure the webhook](webhooks.html).

If the webhook event is in response to a creation or update event, the full details of the created entity are also sent in the payload. See the following event reference tables for additional details. 

## Task Created

Sent when a task is created in Label Studio. See how to [set up a webhook for this event](webhooks.html). 

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| name | string | Name of the action. In this case, `Task created` | 
| id | integer | ID of the created task. | 
| data | | Reference to the data associated with the task. Can be a URL such as `s3://path/to/bucket/image.png` |
| meta | | If it exists, metadata about the task. |
| project | integer | Project ID for the task. |
| created_at | datetime | Date and time of task creation. |
| updated_at | datetime | Date and time of last update to the task. |
| is_labeled | boolean | Whether or not the task has been labeled. |

### Example payload

```json
{
    "action": "Task created",
    "tasks": [
        {"id": 1, ...},
        ...
    ]
}
```

## Task Deleted

Sent when a task is deleted from Label Studio. See how to [set up a webhook for this event](webhooks.html)

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| name | string | Name of the action. In this case, `Task deleted`. | 
| id | integer | ID of the deleted task. | 

### Example payload 

```json
{
    "action": "Task deleted",
    "tasks": [
        {"id": 1, ...},
        ...
    ]
}
```

## Annotation Created
Sent when an annotation is created for a task in Label Studio. See how to [set up a webhook for this event](webhooks.html)

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| name | string | Name of the action. In this case, `Annotation created`. | 
| id | integer | ID of the created annotation. | 
| result | JSON | JSON format of the annotation created. |
| task | JSON | The task that the annotation was created for. |
| completed_by | JSON | Email address of the user that created the annotation. |
| was_cancelled | boolean | Whether or not the annotation is the result of a skipped task, and an empty annotation. |
| ground_truth | boolean | Enterprise only. Whether or not the annotation is a ground truth. 
| created_at | datetime | Date and time that the annotation was created. |
| updated_at | datetime | Date and time that the annotation was last updated. |
| prediction | JSON dictionary | Details of the prediction viewed at the time of annotation, if one exists. |
| project | JSON dictionary | All fields related to the associated project. |

### Example payload

```json


```

## Annotation Updated

Sent when an annotation is updated. See how to [set up a webhook for this event](webhooks.html)

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| name | string | Name of the action. In this case, `Annotation created`. | 
| id | integer | ID of the created annotation. | 
| result | JSON | JSON format of the annotation created. |
| task | JSON | The task that the annotation was created for. |
| completed_by | JSON | Email address of the user that created the annotation. |
| was_cancelled | boolean | Whether or not the annotation is the result of a skipped task, and an empty annotation. |
| ground_truth | boolean | Enterprise only. Whether or not the annotation is a ground truth. 
| created_at | datetime | Date and time that the annotation was created. |
| updated_at | datetime | Date and time that the annotation was last updated. |
| prediction | JSON dictionary | Details of the prediction viewed at the time of annotation, if one exists. |
| project | JSON dictionary | All fields related to the associated project. |

### Example payload

```json


```

## Annotation Deleted
Sent when an annotation is deleted. See how to [set up a webhook for this event](webhooks.html)

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| name | string  | Name of the action. In this case, `Annotation deleted` | 
| id | integer | ID of the deleted annotation. | 

### Example payload

```json
{
    "action": "Annotation deleted",
    "annotations": [
        {"id": 1}
    ]
}
```

## Project Created

Sent when a project is created. See how to [set up a webhook for this event](webhooks.html)

### Webhook payload details

| Key | Type | Description |
| --- | ---  | --- |
| name | string  | The action that triggered the event. In this case, `Project created`. |
| project | JSON dictionary | All fields related to the project that was created. | 

### Example payload

```json

```

## Project Updated
Sent when a project is updated. See how to [set up a webhook for this event](webhooks.html)

### Webhook payload details

| Key | Type | Description |
| --- | ---  | --- |
| name | string  | The action that triggered the event. In this case, `Project updated`. |
| project | JSON dictionary | All fields related to the project that was updated. | 

### Example payload

```json

```

## Project Deleted
Sent when a project is deleted. See how to [set up a webhook for this event](webhooks.html)

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| name | string | Name of the action. In this case, `Project deleted`. | 
| id | integer | ID of the deleted project. | 

### Example payload

```json

```


