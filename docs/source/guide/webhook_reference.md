---
title: Webhook event format reference 
short: Webhook event reference
type: guide
tier: all
order: 413
order_enterprise: 413
meta_title: Label Studio Webhook Event Reference 
meta_description: Label Studio reference documentation for webhook event fields and payloads sent from Label Studio for integration with your machine learning pipeline. 
section: "Integrate & Extend"
parent: "webhooks"
parent_enterprise: "webhooks"

---

Label Studio includes several types of webhook events that trigger when specific actions occur. Refer to the details on this page to determine what information is included in the payload of each webhook event. For details about how to use webhooks and to set up webhooks in Label Studio, see [Set up webhooks in Label Studio](webhooks.html). To create your own webhooks in Label Studio to trigger events when specific actions happen, see [Create custom events for webhooks in Label Studio](webhook_create.html). 

Webhooks sent from Label Studio include the following:

| Key | Details |
| --- | --- |
| action | Details the action that the event represents. |
| project | Included only for task and annotation events. Details about the project. |
| task_number | Total number of tasks in the project. |
| finished_task_number | Total number of annotated tasks in the project. |
| total_predictions_number | Total number of predictions for the project. |
| total_annotations_number | Total number of annotations, skipped tasks, and ground truth annotations in the project. Can be different from the total number of annotated tasks. |
| num_tasks_with_annotations | Total number of tasks with annotations in the project. Does not count skipped and ground truth annotations. |
| useful_annotation_number | Total number of annotations in the project. Excludes skipped and ground truth annotations.  |
| ground_truth_number | Total number of annotations marked as ground truth annotations in the project. |
| skipped_annotations_number | Total number of skipped or cancelled annotations in the project. |

The HTTP POST payloads that Label Studio sends to the configured webhook URLs include the headers that you set up when you [configure the webhook](webhooks.html).

If the webhook event is in response to a creation or update event, the full details of the created entity are also sent in the payload. See the following event reference tables for additional details. 

## Task Created

Sent when a task is created in Label Studio. See how to [set up a webhook for this event](webhooks.html). 

### Webhook payload details

The webhook payload includes the name of the action and some additional task data. The task-relevant data is the same as is included in the [response when you create a task using the API](/api#operation/api_tasks_create).

| Key | Type | Description |
| --- | --- | --- | 
| action | string | Name of the action. In this case, `TASKS_CREATED`, or if just one task was imported, `TASK_CREATED`. | 
| tasks.id | integer | ID of the created task. | 
| tasks.data | string | Reference to the data associated with the task. Can be a URL such as `s3://path/to/bucket/image.png` |
| tasks.meta | JSON dictionary | If it exists, metadata about the task. |
| tasks.created_at | datetime | Date and time of task creation. |
| tasks.updated_at | datetime | Date and time of last update to the task. |
| tasks.is_labeled | boolean | Whether or not the task has been labeled. |
| tasks.project | integer | Project ID for the task. | 
| project | JSON dictionary | Details about the project that the task or tasks were added to. | 

### Example payload

<br/>
{% details <b>Click to expand the example payload</b> %}


{% codeblock lang:json %}
{
    "action": "TASKS_CREATED",
    "tasks": [
        {
            "id": 21,
            "data": {
                "ner": "Opossums like to be aloft \n\n\n\n\n\n in trees."
            },
            "meta": {},
            "created_at": "2021-08-17T13:51:02.590839Z",
            "updated_at": "2021-08-17T13:51:02.590873Z",
            "is_labeled": false,
            "overlap": 1,
            "project": 2,
            "file_upload": 46
        },
        {
            "id": 22,
            "data": {
                "ner": "Opossums are opportunistic."
            },
            "meta": {},
            "created_at": "2021-08-17T13:51:02.590926Z",
            "updated_at": "2021-08-17T13:51:02.590941Z",
            "is_labeled": false,
            "overlap": 1,
            "project": 2,
            "file_upload": 46
        },
        {
            "id": 23,
            "data": {
                "ner": "Opossums like to forage for food."
            },
            "meta": {},
            "created_at": "2021-08-17T13:51:02.590981Z",
            "updated_at": "2021-08-17T13:51:02.590995Z",
            "is_labeled": false,
            "overlap": 1,
            "project": 2,
            "file_upload": 46
        }
    ],
    "project": {
        "id": 2,
        "title": "New Project #2",
        "description": "",
        "label_config": "<View></View>",
        "expert_instruction": "",
        "show_instruction": false,
        "show_skip_button": true,
        "enable_empty_annotation": true,
        "show_annotation_history": false,
        "show_collab_predictions": true,
        "evaluate_predictions_automatically": false,
        "token": "9105a1d897e52286",
        "result_count": 0,
        "color": "#FFFFFF",
        "maximum_annotations": 1,
        "min_annotations_to_start_training": 10,
        "control_weights": {},
        "model_version": "",
        "data_types": {},
        "is_draft": false,
        "is_published": false,
        "created_at": "2021-08-17T13:49:34.326416Z",
        "updated_at": "2021-08-17T13:49:35.911271Z",
        "sampling": "Sequential sampling",
        "show_ground_truth_first": true,
        "show_overlap_first": true,
        "overlap_cohort_percentage": 100,
        "task_data_login": null,
        "task_data_password": null,
        "organization": 1,
        "created_by": 1
    }
}
{% endcodeblock %}

{% enddetails %}
<br/>

## Task Deleted

Sent when a task is deleted from Label Studio. See how to [set up a webhook for this event](webhooks.html).

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| action | string | Name of the action. In this case, `TASK_DELETED` or `TASKS_DELETED` if multiple tasks were deleted at once. | 
| id | integer | ID of the deleted task. | 
| project | JSON dictionary | Details about the project that the task or tasks were deleted from. | 

### Example payload

<br/>
{% details <b>Click to expand the example payload</b> %}


{% codeblock lang:json %}
{
    "action": "TASKS_DELETED",
    "tasks": [
        {
            "id": 18
        },
        {
            "id": 19
        },
        {
            "id": 20
        },
        {
            "id": 21
        },
        {
            "id": 22
        },
        {
            "id": 23
        }
    ],
    "project": {
        "id": 2,
        "title": "New Project #2",
        "description": "",
        "label_config": "<View> <Header value=\"Please read the passage\"/> <Text name=\"text\" value=\"$ner\" granularity=\"word\"/> <Header value=\"Select a text span answering the following question:\"/> <Text name=\"question\" value=\"$ner\"/>\n<Labels name=\"answer\" toName=\"text\"> <Label value=\"Answer\" maxUsage=\"1\" background=\"red\"/> </Labels>\n</View><!-- {\"data\": { \"text\": \"The boundary of the region from which no escape is possible is called the event horizon. Although the event horizon has an enormous effect on the fate and circumstances of an object crossing it, according to general relativity it has no locally detectable features.[4] In many ways, a black hole acts like an ideal black body, as it reflects no light.[5][6] Moreover, quantum field theory in curved spacetime predicts that event horizons emit Hawking radiation, with the same spectrum as a black body of a temperature inversely proportional to its mass. This temperature is on the order of billionths of a kelvin for black holes of stellar mass, making it essentially impossible to observe directly.\", \"question\": \"How could black holes be detected?\" }, \"annotations\": [{\"result\": [ { \"value\": { \"start\": 423, \"end\": 553, \"text\": \"event horizons emit Hawking radiation, with the same spectrum as a black body of a temperature inversely proportional to its mass.\", \"labels\": [ \"Answer\" ] }, \"id\": \"b0wKkdnnRc\", \"from_name\": \"answer\", \"to_name\": \"text\", \"type\": \"labels\" } ] }] } -->",
        "expert_instruction": "",
        "show_instruction": false,
        "show_skip_button": true,
        "enable_empty_annotation": true,
        "show_annotation_history": false,
        "show_collab_predictions": true,
        "evaluate_predictions_automatically": false,
        "token": "9105a1d897e52286",
        "result_count": 0,
        "color": "#FFFFFF",
        "maximum_annotations": 1,
        "min_annotations_to_start_training": 10,
        "control_weights": {
            "answer": {
                "overall": 1.0,
                "type": "Labels",
                "labels": {
                    "Answer": 1.0
                }
            }
        },
        "model_version": "",
        "data_types": {
            "ner": "Text"
        },
        "is_draft": false,
        "is_published": false,
        "created_at": "2021-08-17T13:49:34.326416Z",
        "updated_at": "2021-08-17T13:52:09.334425Z",
        "sampling": "Sequential sampling",
        "show_ground_truth_first": true,
        "show_overlap_first": true,
        "overlap_cohort_percentage": 100,
        "task_data_login": null,
        "task_data_password": null,
        "organization": 1,
        "created_by": 1
    }
}

{% endcodeblock %}

{% enddetails %}
<br/>

## Annotation Created
Sent when an annotation is created for a task in Label Studio. See how to [set up a webhook for this event](webhooks.html).

### Webhook payload details

The webhook payload includes the name of the action and some additional annotation data. The annotation-relevant data is the same as is included in the [response when you create an annotation using the API](/api#operation/api_tasks_annotations_create).

| Key | Type | Description |
| --- | --- | --- | 
| action | string | Name of the action. In this case, `ANNOTATION_CREATED`. | 
| annotation.id | integer | ID of the created annotation. | 
| annotation.result | JSON dictionary | JSON representation of the annotation created. |
| annotation.task | integer | The task ID that the annotation was created for. |
| annotation.completed_by | integer | ID of the user that created the annotation. |
| annotation.was_cancelled | boolean | Whether or not the annotation is the result of a skipped task, and an empty annotation. |
| annotation.ground_truth | boolean | Always false. Whether or not the annotation is a ground truth. 
| annotation.created_at | datetime | Date and time that the annotation was created. |
| annotation.updated_at | datetime | Date and time that the annotation was last updated. |
| annotation.lead_time | floating point number | Amount of time, in seconds, that it took to complete the annotation. |
| annotation.prediction | JSON dictionary | Details of the prediction viewed at the time of annotation, if one exists. |
| project | JSON dictionary | All fields related to the associated project. |

### Example payload

<br/>
{% details <b>Click to expand the example payload</b> %}


{% codeblock lang:json %}
{
    "action": "ANNOTATION_CREATED",
    "annotation": {
        "id": 17,
        "result": [
            {
                "value": {
                    "start": 0,
                    "end": 26,
                    "text": "Opossums are op",
                    "labels": [
                        "Answer"
                    ]
                },
                "id": "WArqkkifYE",
                "from_name": "answer",
                "to_name": "text",
                "type": "labels"
            }
        ],
        "was_cancelled": false,
        "ground_truth": false,
        "created_at": "2021-08-17T13:52:48.536303Z",
        "updated_at": "2021-08-17T13:52:48.536370Z",
        "lead_time": 37.13,
        "prediction": {},
        "result_count": 0,
        "task": 19,
        "completed_by": 1
    },
    "project": {
        "id": 2,
        "title": "New Project #2",
        "description": "",
        "label_config": "<View> <Header value=\"Please read the passage\"/> <Text name=\"text\" value=\"$ner\" granularity=\"word\"/> <Header value=\"Select a text span answering the following question:\"/> <Text name=\"question\" value=\"$ner\"/>\n<Labels name=\"answer\" toName=\"text\"> <Label value=\"Answer\" maxUsage=\"1\" background=\"red\"/> </Labels>\n</View><!-- {\"data\": { \"text\": \"The boundary of the region from which no escape is possible is called the event horizon. Although the event horizon has an enormous effect on the fate and circumstances of an object crossing it, according to general relativity it has no locally detectable features.[4] In many ways, a black hole acts like an ideal black body, as it reflects no light.[5][6] Moreover, quantum field theory in curved spacetime predicts that event horizons emit Hawking radiation, with the same spectrum as a black body of a temperature inversely proportional to its mass. This temperature is on the order of billionths of a kelvin for black holes of stellar mass, making it essentially impossible to observe directly.\", \"question\": \"How could black holes be detected?\" }, \"annotations\": [{\"result\": [ { \"value\": { \"start\": 423, \"end\": 553, \"text\": \"event horizons emit Hawking radiation, with the same spectrum as a black body of a temperature inversely proportional to its mass.\", \"labels\": [ \"Answer\" ] }, \"id\": \"b0wKkdnnRc\", \"from_name\": \"answer\", \"to_name\": \"text\", \"type\": \"labels\" } ] }] } -->",
        "expert_instruction": "",
        "show_instruction": false,
        "show_skip_button": true,
        "enable_empty_annotation": true,
        "show_annotation_history": false,
        "show_collab_predictions": true,
        "evaluate_predictions_automatically": false,
        "token": "9105a1d897e52286",
        "result_count": 0,
        "color": "#FFFFFF",
        "maximum_annotations": 1,
        "min_annotations_to_start_training": 10,
        "control_weights": {
            "answer": {
                "overall": 1.0,
                "type": "Labels",
                "labels": {
                    "Answer": 1.0
                }
            }
        },
        "model_version": "",
        "data_types": {
            "ner": "Text"
        },
        "is_draft": false,
        "is_published": false,
        "created_at": "2021-08-17T13:49:34.326416Z",
        "updated_at": "2021-08-17T13:52:09.334425Z",
        "sampling": "Sequential sampling",
        "show_ground_truth_first": true,
        "show_overlap_first": true,
        "overlap_cohort_percentage": 100,
        "task_data_login": null,
        "task_data_password": null,
        "organization": 1,
        "created_by": 1
    }
}
{% endcodeblock %}

{% enddetails %}
<br/>

## Annotation Updated

Sent when an annotation is updated. See how to [set up a webhook for this event](webhooks.html).

### Webhook payload details

The webhook payload includes the name of the action and some additional annotation data. The annotation-relevant data is the same as is included in the [response when you update an annotation using the API](/api#operation/api_annotations_partial_update).

| Key | Type | Description |
| --- | --- | --- | 
| action | string | Name of the action. In this case, `ANNOTATION_UPDATED`. | 
| annotation.id | integer | ID of the updated annotation. | 
| annotation.result | JSON dictionary | JSON representation of the annotation updated. |
| annotation.task | integer | The task ID that the annotation was updated for. |
| annotation.completed_by | integer | ID of the user that updated the annotation. |
| annotation.was_cancelled | boolean | Whether or not the annotation is the result of a skipped task, and an empty annotation. |
| annotation.ground_truth | boolean | Always false. Whether or not the annotation is a ground truth. 
| annotation.created_at | datetime | Date and time that the annotation was created. |
| annotation.updated_at | datetime | Date and time that the annotation was last updated. |
| annotation.lead_time | floating point number | Amount of time, in seconds, that it took to complete the annotation. |
| annotation.prediction | JSON dictionary | Details of the prediction viewed at the time of annotation, if one exists. |
| project | JSON dictionary | All fields related to the associated project. |

### Example payload


<br/>
{% details <b>Click to expand the example payload</b> %}


{% codeblock lang:json %}
{
    "action": "ANNOTATION_UPDATED",
    "annotation": {
        "id": 16,
        "result": [
            {
                "original_width": 1024,
                "original_height": 1024,
                "image_rotation": 0,
                "value": {
                    "x": 42,
                    "y": 36.4,
                    "width": 50.13333333333333,
                    "height": 26,
                    "rotation": 0,
                    "rectanglelabels": [
                        "Airplane"
                    ]
                },
                "id": "5dC-jDgBtG",
                "from_name": "label",
                "to_name": "image",
                "type": "rectanglelabels"
            },
            {
                "original_width": 1024,
                "original_height": 1024,
                "image_rotation": 0,
                "value": {
                    "x": 12.533333333333333,
                    "y": 37.733333333333334,
                    "width": 23.6,
                    "height": 22,
                    "rotation": 0,
                    "rectanglelabels": [
                        "Car"
                    ]
                },
                "id": "_bJsGZ0_Cm",
                "from_name": "label",
                "to_name": "image",
                "type": "rectanglelabels"
            }
        ],
        "was_cancelled": false,
        "ground_truth": false,
        "created_at": "2021-08-17T13:35:59.817086Z",
        "updated_at": "2021-08-17T13:37:25.805479Z",
        "lead_time": 299.327,
        "prediction": {},
        "result_count": 0,
        "task": 5,
        "completed_by": 1
    },
    "project": {
        "id": 1,
        "title": "New Project #5",
        "description": "",
        "label_config": "<View> <Image name=\"image\" value=\"$image\"/> <RectangleLabels name=\"label\" toName=\"image\"> <Label value=\"Airplane\" background=\"green\"/> <Label value=\"Car\" background=\"blue\"/> </RectangleLabels> </View>\n<!--{\"annotations\": [{\"result\": [ { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 4.21455938697318, \"y\": 11.142857142857142, \"width\": 32.95019157088122, \"height\": 46.285714285714285, \"rotation\": 0, \"rectanglelabels\": [ \"Airplane\" ] }, \"id\": \"PIhJM1YYpH\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 30.076628352490417, \"y\": 44.57142857142857, \"width\": 32.56704980842912, \"height\": 46, \"rotation\": 0, \"rectanglelabels\": [ \"Airplane\" ] }, \"id\": \"lnimBBYxMU\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 67.17850287907869, \"y\": 18, \"width\": 28.406909788867566, \"height\": 43.714285714285715, \"rotation\": 0, \"rectanglelabels\": [ \"Airplane\" ] }, \"id\": \"sBjX3KteGU\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 77.01149425287356, \"y\": 84.57142857142857, \"width\": 3.4482758620689653, \"height\": 5.142857142857142, \"rotation\": 0, \"rectanglelabels\": [ \"Car\" ] }, \"id\": \"TIYiC1Bh67\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 85.02879078694816, \"y\": 83.71428571428572, \"width\": 2.879078694817658, \"height\": 4.857142857142856, \"rotation\": 0, \"rectanglelabels\": [ \"Car\" ] }, \"id\": \"mL8hEBkvJt\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 57.08812260536399, \"y\": 87.42857142857143, \"width\": 5.363984674329502, \"height\": 7.142857142857142, \"rotation\": 0, \"rectanglelabels\": [ \"Car\" ] }, \"id\": \"3gpRfF9MkN\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" } ] }]} -->",
        "expert_instruction": "",
        "show_instruction": false,
        "show_skip_button": true,
        "enable_empty_annotation": true,
        "show_annotation_history": false,
        "show_collab_predictions": true,
        "evaluate_predictions_automatically": false,
        "token": "846c4da585704dd4",
        "result_count": 0,
        "color": "#F6C549",
        "maximum_annotations": 1,
        "min_annotations_to_start_training": 10,
        "control_weights": {
            "label": {
                "overall": 1.0,
                "type": "RectangleLabels",
                "labels": {
                    "Airplane": 1.0,
                    "Car": 1.0
                }
            }
        },
        "model_version": "",
        "data_types": {
            "image": "Image"
        },
        "is_draft": false,
        "is_published": false,
        "created_at": "2021-08-12T14:15:01.744507Z",
        "updated_at": "2021-08-17T13:35:25.697471Z",
        "sampling": "Sequential sampling",
        "show_ground_truth_first": true,
        "show_overlap_first": true,
        "overlap_cohort_percentage": 100,
        "task_data_login": null,
        "task_data_password": null,
        "organization": 1,
        "created_by": 1
    }
}
{% endcodeblock %}

{% enddetails %}
<br/>

## Annotation Deleted
Sent when an annotation is deleted. See how to [set up a webhook for this event](webhooks.html).

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| action | string  | Name of the action. In this case, `ANNOTATION_DELETED`, or for bulk actions, `ANNOTATIONS_DELETED` | 
| id | integer | ID of the deleted annotation. | 
| project | JSON dictionary | Details about the project that the annotations were deleted from. | 

### Example payload


<br/>
{% details <b>Click to expand the example payload</b> %}


{% codeblock lang:json %}
{
    "action": "ANNOTATIONS_DELETED",
    "annotations": [
        {
            "id": 17
        }
    ],
    "project": {
        "id": 2,
        "title": "New Project #2",
        "description": "",
        "label_config": "<View> <Header value=\"Please read the passage\"/> <Text name=\"text\" value=\"$ner\" granularity=\"word\"/> <Header value=\"Select a text span answering the following question:\"/> <Text name=\"question\" value=\"$ner\"/>\n<Labels name=\"answer\" toName=\"text\"> <Label value=\"Answer\" maxUsage=\"1\" background=\"red\"/> </Labels>\n</View><!-- {\"data\": { \"text\": \"The boundary of the region from which no escape is possible is called the event horizon. Although the event horizon has an enormous effect on the fate and circumstances of an object crossing it, according to general relativity it has no locally detectable features.[4] In many ways, a black hole acts like an ideal black body, as it reflects no light.[5][6] Moreover, quantum field theory in curved spacetime predicts that event horizons emit Hawking radiation, with the same spectrum as a black body of a temperature inversely proportional to its mass. This temperature is on the order of billionths of a kelvin for black holes of stellar mass, making it essentially impossible to observe directly.\", \"question\": \"How could black holes be detected?\" }, \"annotations\": [{\"result\": [ { \"value\": { \"start\": 423, \"end\": 553, \"text\": \"event horizons emit Hawking radiation, with the same spectrum as a black body of a temperature inversely proportional to its mass.\", \"labels\": [ \"Answer\" ] }, \"id\": \"b0wKkdnnRc\", \"from_name\": \"answer\", \"to_name\": \"text\", \"type\": \"labels\" } ] }] } -->",
        "expert_instruction": "",
        "show_instruction": false,
        "show_skip_button": true,
        "enable_empty_annotation": true,
        "show_annotation_history": false,
        "show_collab_predictions": true,
        "evaluate_predictions_automatically": false,
        "token": "9105a1d897e52286",
        "result_count": 0,
        "color": "#FFFFFF",
        "maximum_annotations": 1,
        "min_annotations_to_start_training": 10,
        "control_weights": {
            "answer": {
                "overall": 1.0,
                "type": "Labels",
                "labels": {
                    "Answer": 1.0
                }
            }
        },
        "model_version": "",
        "data_types": {
            "ner": "Text"
        },
        "is_draft": false,
        "is_published": false,
        "created_at": "2021-08-17T13:49:34.326416Z",
        "updated_at": "2021-08-17T13:52:09.334425Z",
        "sampling": "Sequential sampling",
        "show_ground_truth_first": true,
        "show_overlap_first": true,
        "overlap_cohort_percentage": 100,
        "task_data_login": null,
        "task_data_password": null,
        "organization": 1,
        "created_by": 1
    }
}

{% endcodeblock %}

{% enddetails %}
<br/>

## Project Created

Sent when a project is created. See how to [set up a webhook for this event](webhooks.html).

You must [enable organization-level webhooks](webhooks.html#Enable-organization-level-webhooks) to use this event.

### Webhook payload details

The webhook payload includes the name of the action and some additional project data. The project-relevant data is the same as is included in the [response when you create a project using the API](/api#operation/api_projects_create).


| Key | Type | Description |
| --- | ---  | --- |
| action | string  | The action that triggered the event. In this case, `PROJECT_CREATED`. |
| project | JSON dictionary | All fields related to the project that was created. See the [API documentation for creating a project](/api#operation/api_projects_create). | 

### Example payload

<br/>
{% details <b>Click to expand the example payload</b> %}


{% codeblock lang:json %}
{
    "action": "PROJECT_CREATED",
    "project": {
        "id": 3,
        "title": "New Project #3",
        "description": "",
        "label_config": "<View></View>",
        "expert_instruction": "",
        "show_instruction": false,
        "show_skip_button": true,
        "enable_empty_annotation": true,
        "show_annotation_history": false,
        "show_collab_predictions": true,
        "evaluate_predictions_automatically": false,
        "token": "d881a308198ff9ac",
        "result_count": 0,
        "color": "#FFFFFF",
        "maximum_annotations": 1,
        "min_annotations_to_start_training": 10,
        "control_weights": {},
        "model_version": "",
        "data_types": {},
        "is_draft": false,
        "is_published": false,
        "created_at": "2021-08-17T13:55:58.809065Z",
        "updated_at": "2021-08-17T13:55:58.809098Z",
        "sampling": "Sequential sampling",
        "show_ground_truth_first": true,
        "show_overlap_first": true,
        "overlap_cohort_percentage": 100,
        "task_data_login": null,
        "task_data_password": null,
        "organization": 1,
        "created_by": 1
    }
}
{% endcodeblock %}

{% enddetails %}
<br/>

## Project Updated
Sent when a project is updated. See how to [set up a webhook for this event](webhooks.html).

### Webhook payload details

The webhook payload includes the name of the action and some additional project data. The project-relevant data is the same as is included in the [response when you update a project using the API](/api#operation/api_projects_partial_update).

| Key | Type | Description |
| --- | ---  | --- |
| action | string  | The action that triggered the event. In this case, `PROJECT_UPDATED`. |
| project | JSON dictionary | All fields related to the project that was updated. See the [API documentation for updating a project](/api#operation/api_projects_partial_update). | 

### Example payload

<br/>
{% details <b>Click to expand the example payload</b> %}


{% codeblock lang:json %}
{
    "action": "PROJECT_UPDATED",
    "project": {
        "id": 1,
        "title": "New Project #5",
        "description": "",
        "label_config": "<View> <Image name=\"image\" value=\"$image\"/> <RectangleLabels name=\"label\" toName=\"image\"> <Label value=\"Airplane\" background=\"green\"/> <Label value=\"Car\" background=\"blue\"/> </RectangleLabels> </View>\n<!--{\"annotations\": [{\"result\": [ { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 4.21455938697318, \"y\": 11.142857142857142, \"width\": 32.95019157088122, \"height\": 46.285714285714285, \"rotation\": 0, \"rectanglelabels\": [ \"Airplane\" ] }, \"id\": \"PIhJM1YYpH\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 30.076628352490417, \"y\": 44.57142857142857, \"width\": 32.56704980842912, \"height\": 46, \"rotation\": 0, \"rectanglelabels\": [ \"Airplane\" ] }, \"id\": \"lnimBBYxMU\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 67.17850287907869, \"y\": 18, \"width\": 28.406909788867566, \"height\": 43.714285714285715, \"rotation\": 0, \"rectanglelabels\": [ \"Airplane\" ] }, \"id\": \"sBjX3KteGU\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 77.01149425287356, \"y\": 84.57142857142857, \"width\": 3.4482758620689653, \"height\": 5.142857142857142, \"rotation\": 0, \"rectanglelabels\": [ \"Car\" ] }, \"id\": \"TIYiC1Bh67\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 85.02879078694816, \"y\": 83.71428571428572, \"width\": 2.879078694817658, \"height\": 4.857142857142856, \"rotation\": 0, \"rectanglelabels\": [ \"Car\" ] }, \"id\": \"mL8hEBkvJt\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" }, { \"original_width\": 600, \"original_height\": 403, \"image_rotation\": 0, \"value\": { \"x\": 57.08812260536399, \"y\": 87.42857142857143, \"width\": 5.363984674329502, \"height\": 7.142857142857142, \"rotation\": 0, \"rectanglelabels\": [ \"Car\" ] }, \"id\": \"3gpRfF9MkN\", \"from_name\": \"label\", \"to_name\": \"image\", \"type\": \"rectanglelabels\" } ] }]} -->",
        "expert_instruction": "",
        "show_instruction": false,
        "show_skip_button": true,
        "enable_empty_annotation": true,
        "show_annotation_history": false,
        "show_collab_predictions": true,
        "evaluate_predictions_automatically": false,
        "token": "846c4da585704dd4",
        "result_count": 0,
        "color": "#F6C549",
        "maximum_annotations": 1,
        "min_annotations_to_start_training": 10,
        "control_weights": {
            "label": {
                "overall": 1.0,
                "type": "RectangleLabels",
                "labels": {
                    "Airplane": 1.0,
                    "Car": 1.0
                }
            }
        },
        "model_version": "",
        "data_types": {
            "image": "Image"
        },
        "is_draft": false,
        "is_published": false,
        "created_at": "2021-08-12T14:15:01.744507Z",
        "updated_at": "2021-08-17T13:39:14.054849Z",
        "sampling": "Sequential sampling",
        "show_ground_truth_first": true,
        "show_overlap_first": true,
        "overlap_cohort_percentage": 100,
        "task_data_login": null,
        "task_data_password": null,
        "organization": 1,
        "created_by": 1
    }
}
{% endcodeblock %}

{% enddetails %}
<br/>

## Project Deleted
Sent when a project is deleted. See how to [set up a webhook for this event](webhooks.html).

You must [enable organization-level webhooks](webhooks.html#Enable-organization-level-webhooks) to use this event.

### Webhook payload details

| Key | Type | Description |
| --- | --- | --- | 
| action | string | Name of the action. In this case, `PROJECT_DELETED`. | 
| id | integer | ID of the deleted project. | 

### Example payload

```json
{
    "action": "PROJECT_DELETED",
    "project": {
        "id": 3
    }
}
```


### Start Training 

This webhook is triggered when a user clicks `Start Training` button on the ML Model card in the Project Settings page.
This event will be sent to the ML Backend and can be caught in the model.fit(event, ...) method:

```
class MyModel(LabelStudioMLBase):
  def fit(self, event, *args, **kwargs):
    if event == 'START_TRAINING': 
      ...
```

### Webhook payload details

| Key | Type | Description                           |
| --- | --- |---------------------------------------| 
| action | string | Name of the action: `START_TRAINING`. | 
| id | integer | ID of the project where training is started. |
| project | JSON dictionary | All fields related to the project that was updated. See the [API documentation for updating a project](/api#operation/api_projects_partial_update). |


