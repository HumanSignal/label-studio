---
title: Export annotations and data from Label Studio
short: Export annotations
type: guide
order: 415
meta_title: Export Annotations
meta_description: Label Studio documentation for exporting data labeling annotations in multiple formats that you can use in machine learning models and data science projects.
---

## Export data from Label Studio

Export your completed annotations from Label Studio. Label Studio stores your annotations in a raw JSON format in the SQLite database backend or whichever cloud or database storage you specify as target storage. Cloud storage buckets contain one file per labeled task named as `task_id.json`. See [Cloud storage setup](storage.html) for more details about syncing target storage. 

### Export using the UI

You can export data and annotations from the Label Studio UI using the [/export](http://localhost:8080/export) page. Click **Export** from the data manager to select an available export format and export your data. 

### Export using the API
You can call the Label Studio API to export annotations. 

For a small labeling project, call the [export endpoint](/api#operation/api_projects_export_read) to export annotations.

For a large labeling project with hundreds of thousands of tasks, do the following:
1. Make a POST request to [create a new export file or snapshot](/api#operation/api_projects_exports_create). The response includes an `id` for the created file.
2. [Check the status of the export file creation](/api#operation/api_projects_exports_read) using the `id` as the `export_pk`. 
3. Using the `id` from the created snapshot as the export primary key, or `export_pk`, make a GET request to [download the export file](/api#operation/api_projects_exports_download_read).

### Manually convert JSON annotations to another format
You can run the relevant [converter tool](https://github.com/heartexlabs/label-studio-converter) on a directory or file of completed JSON annotations using the command line or Python to convert the completed annotations into another format. If you use versions of Label Studio earlier than 1.0.0, this is the only way to convert your Label Studio JSON format annotations into another labeling format. 

## Export formats supported by Label Studio

Label Studio supports many common and standard formats for exporting completed labeling tasks. If you don't see a format that works for you, you can contribute one. See the [GitHub repository for the Label Studio Converter tool](https://github.com/heartexlabs/label-studio-converter).

### JSON

List of items in [raw JSON format](#Label-Studio-JSON-format-of-annotated-tasks) stored in one JSON file. Use to export both the data and the annotations for a dataset. 

### JSON_MIN

List of items where only `"from_name", "to_name"` values from the [raw JSON format](#Label-Studio-JSON-format-of-annotated-tasks) are exported. Use to export only the annotations and the data for a dataset, and no Label-Studio-specific fields. 

For example: 
```json
{
  "image": "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
  "tag": [{
    "height": 10.458911419423693,
    "rectanglelabels": [
        "Moonwalker"
    ],
    "rotation": 0,
    "width": 12.4,
    "x": 50.8,
    "y": 5.869797225186766
  }]
}
```

### CSV

Results are stored as comma-separated values with the column names specified by the values of the `"from_name"` and `"to_name"` fields in the labeling configuration.


### TSV

Results are stored in tab-separated tabular file with column names specified by `"from_name"` and `"to_name"` values in the labeling configuration.


### CONLL2003

Popular format used for the [CoNLL-2003 named entity recognition challenge](https://www.clips.uantwerpen.be/conll2003/ner/).


### COCO

Popular machine learning format used by the [COCO dataset](http://cocodataset.org/#home) for object detection and image segmentation tasks.

### Pascal VOC XML

Popular XML-formatted task data used for object detection and image segmentation tasks. 

### Brush labels to NumPy & PNG

Export your brush labels as NumPy 2d arrays and PNG images. Each label outputs as one image.

### ASR_MANIFEST

Export audio transcription labels for automatic speech recognition as the JSON manifest format expected by [NVIDIA NeMo models](https://docs.nvidia.com/deeplearning/nemo/user-guide/docs/en/v0.11.0/collections/nemo_asr.html). 

```json
{“audio_filepath”: “/path/to/audio.wav”, “text”: “the transcription”, “offset”: 301.75, “duration”: 0.82, “utt”: “utterance_id”, “ctm_utt”: “en_4156”, “side”: “A”}
```

### YOLO

Export object detection annotations in the YOLOv3 and YOLOv4 format. You must have at least one `RectangleLabels` or similar object detection annotations present in your labeling configuration to use the YOLO export format.

## Label Studio JSON format of annotated tasks 

When you annotate data, Label Studio stores the output in JSON format. The raw JSON structure of each completed task follows this example: 

```json
{
    "id": 1,

    "data": {
        "image": "https://example.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
    },
    "created_at":"2021-03-09T21:52:49.513742Z",
    "updated_at":"2021-03-09T22:16:08.746926Z",
    "project":83,
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
            ]
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
| annotations.completed_by | User ID of the user that created the annotation. Matches the list order of users on the People page on the Label Studio UI. | 
| result.id | Identifier for the specific annotation result for this task.|
| result.from_name | Name of the tag used to label the region. See [control tags](/tags). |
| result.to_name | Name of the object tag that provided the region to be labeled. See [object tags](/tags). |
| result.type | Type of tag used to annotate the task. |
| result.value | Tag-specific value that includes details of the result of labeling the task. The value structure depends on the tag for the label. [Explore each tag](/tags) for more details. |
| predictions | Array of machine learning predictions. Follows the same format as the completions array, with one additional parameter. |
| predictions.score | The overall score of the result, based on the probabilistic output, confidence level, or other. | 

<!-- md image_units.md -->


<!-- md annotation_ids.md -->