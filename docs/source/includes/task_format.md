## Label Studio JSON format of annotated tasks 

When you annotate data, Label Studio stores the output in JSON format. The raw JSON structure of each completed task uses the following example: 

```json
{
    "id": 1,
    "created_at":"2021-03-09T21:52:49.513742Z",
    "updated_at":"2021-03-09T22:16:08.746926Z",
    "project":83,

    "data": {
        "image": "https://example.com/opensource/label-studio/1.jpg"
    },

    "annotations": [
        {
            "id": "1001",
            "result": [
                {
                    "from_name": "tag",
                    "id": "Dx_aB91ISN",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 10.458911419423693,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 12.4,
                        "x": 50.8,
                        "y": 5.869797225186766
                    }
                }
            ],
            "was_cancelled":false,
            "ground_truth":false,
            "created_at":"2021-03-09T22:16:08.728353Z",
            "updated_at":"2021-03-09T22:16:08.728378Z",
            "lead_time":4.288,
            "result_count":0,
            "task":1,
            "completed_by":10
        }
    ],

    "predictions": [
        {
            "created_ago": "3 hours",
            "model_version": "model 1",
            "result": [
                {
                    "from_name": "tag",
                    "id": "t5sp3TyXPo",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 11.612284069097889,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 39.6,
                        "x": 13.2,
                        "y": 34.702495201535505
                    }
                }
            ]
        },
        {
            "created_ago": "4 hours",
            "model_version": "model 2",
            "result": [
                {
                    "from_name": "tag",
                    "id": "t5sp3TyXPo",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 33.61228406909789,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 39.6,
                        "x": 13.2,
                        "y": 54.702495201535505
                    }
                }
            ]
        }
    ]
}
```

### Relevant JSON property descriptions

Review the full list of JSON properties in the [API documentation](api.html).

| JSON property name | Description |
| --- | --- | 
| id | Identifier for the labeling task from the dataset. |
| data | Data copied from the input data task format. See the documentation for [Task Format](tasks.html#Basic-Label-Studio-JSON-format). |
| project | Identifier for a specific project in Label Studio. |
| annotations | Array containing the labeling results for the task. |
| annotations.id | Identifier for the completed task. |
| annotations.lead_time | Time in seconds to label the task. |
| annotations.result | Array containing the results of the labeling or annotation task. |
| annotations.updated_at | Timestamp for when the annotation is created or modified. |
| annotations.completed_at | Timestamp for when the annotation is created or submitted. |
| annotations.completed_by | User ID of the user that created the annotation. Matches the list order of users on the People page on the Label Studio UI. |
| annotations.was_cancelled | Boolean. Details about whether or not the annotation was skipped, or cancelled. | 
| result.id | Identifier for the specific annotation result for this task.|
| result.from_name | Name of the tag used to label the region. See [control tags](/tags). |
| result.to_name | Name of the object tag that provided the region to be labeled. See [object tags](/tags). |
| result.type | Type of tag used to annotate the task. |
| result.value | Tag-specific value that includes details of the result of labeling the task. The value structure depends on the tag for the label. For more information, see [Explore each tag](/tags). |
| drafts | Array of draft annotations. Follows similar format as the annotations array. Included only for tasks exported as a snapshot [from the UI](#Export-snapshots-using-the-UI) or [using the API](#Export-snapshots-using-the-Snapshot-API).
| predictions | Array of machine learning predictions. Follows the same format as the annotations array, with one additional parameter. |
| predictions.score | The overall score of the result, based on the probabilistic output, confidence level, or other. | 
| task.updated_at | Timestamp for when the task or any of its annotations or reviews are created, updated, or deleted. |


<div class="enterprise-only">

Enterprise fields are presented in export:

| JSON property name | Description |
| --- | --- | 
| annotations.reviews | Array containing the details of reviews for this annotation.  |
| reviews.id | ID of the specific annotation review. |
| reviews.created_by |  Dictionary containing user ID, email, first name and last name of the user performing the review. |
| reviews.accepted |  Boolean. Whether the reviewer accepted the annotation as part of their review. | 

</div>
