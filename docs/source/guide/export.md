---
title: Export annotations and data from Label Studio
short: Export annotations
type: guide
order: 415
meta_title: Export Annotations
meta_description: Label Studio documentation for exporting data labeling annotations in multiple formats that you can use in machine learning models and data science projects.
---

At any point in your labeling project, you can export the annotations from Label Studio. 

Label Studio stores your annotations in a raw JSON format in the SQLite database backend, PostgreSQL database backend, or whichever cloud or database storage you specify as target storage. Cloud storage buckets contain one file per labeled task named `task_id.json`. For more information about syncing target storage, see [Cloud storage setup](storage.html).

Image annotations exported in JSON format use percentages of overall image size, not pixels, to describe the size and location of the bounding boxes. For more information, see [how to convert the image annotation units](#Units-of-image-annotations).


## Export data from Label Studio

Export your completed annotations from Label Studio. 

!!! note
    Some export formats export only the annotations and not the data from the task. For more information, see the [export formats supported by Label Studio](#Export-formats-supported-by-Label-Studio).

### Export using the UI in Community Edition of Label Studio

Use the following steps to export data and annotations from the Label Studio UI. 

1. For a project, click **Export**.
2. Select an available export format.
3. Click **Export** to export your data.

!!! note
    1. The export will always include the annotated tasks, regardless of filters set on the tab. 
    2. Cancelled annotated tasks will be included in the exported result too.
    3. If you want to apply tab filters to the export, try to use [export snapshots using the SDK](https://labelstud.io/sdk/project.html#label_studio_sdk.project.Project.export_snapshot_create) or [API](#Export-snapshots-using-the-API).

#### Export timeout in Community Edition

If the export times out, see how to [export snapshots using the SDK](https://labelstud.io/sdk/project.html#label_studio_sdk.project.Project.export_snapshot_create) or [API](#Export-snapshots-using-the-API).

### <i class='ent'></i> Export snapshots using the UI

In Label Studio Enterprise, create a snapshot of your data and annotations. Create a snapshot to export exactly what you want from your data labeling project. This delayed export method makes it easier to export large labeling projects from the Label Studio UI.  

1. Within a project in the Label Studio UI, click **Export**.
2. Click **Create New Snapshot**.
3. **Apply filters from tab ...**: Select **Default** from the drop-down list. 
4. (Optional) **Snapshot Name**: Enter a snapshot name to make it easier to find in the future. By default, export snapshots are named `PROJECT-NAME-at-YEAR-MM-DD-HH-MM`, where the time is in UTC.
5. **Include in the Snapshot…**: Choose which type of data you want to include in the snapshot. Select **All tasks**, **Only annotated** tasks, or **Only reviewed** tasks. 
6. **Drafts**: Choose whether to export the complete draft annotations (**Complete drafts**) for tasks, or only the IDs (**Only IDs**) of draft annotations, to indicate that drafts exist. 
7. **Predictions**: Choose whether to export the complete predictions (**Complete predictions**) for tasks, or only the IDs (**Only IDs**) of predictions to indicate that the tasks had predictions.
8. **Annotations**: Enable the types of annotations that you want to export. You can specify **Annotations**, **Ground Truth** annotations, and **Skipped** annotations. By default, only annotations are exported.
9. (Optional) Enable the **Remove user details** option to remove the user's details. 
10. Click **Create a Snapshot** to start the export process.
11. You see the list of snapshots available to download, with details about what is included in the snapshot, when it was created, and who created it. 
12. Click **Download** and select the export format that you want to use. Now, the snapshot file downloads to your computer. 

### Export using the API

You can call the Label Studio API to export annotations. For a small labeling project, call the [export endpoint](/api#operation/api_projects_export_read) to export annotations.

### Export snapshots using the API 

For a large labeling project with hundreds of thousands of tasks, do the following:
1. Make a POST request to [create a new export file or snapshot](/api#operation/api_projects_exports_create). The response includes an `id` for the created file.
2. [Check the status of the export file created](/api#operation/api_projects_exports_read) using the `id` as the `export_pk`. 
3. Using the `id` from the created snapshot as the export primary key, or `export_pk`, make a GET request to [download the export file](/api#operation/api_projects_exports_download_read).

## Manually convert JSON annotations to another format
You can run the [Label Studio converter tool](https://github.com/heartexlabs/label-studio-converter) on a directory or file of completed JSON annotations using the command line or Python to convert the completed annotations from Label Studio JSON format into another format. 

!!! note
    If you use versions of Label Studio earlier than 1.0.0, then this is the only way to convert your Label Studio JSON format annotations into another labeling format. 


## Export formats supported by Label Studio

Label Studio supports many common and standard formats for exporting completed labeling tasks. If you don't see a format that works for you, you can contribute one. For more information, see the [GitHub repository for the Label Studio Converter tool](https://github.com/heartexlabs/label-studio-converter).

### ASR_MANIFEST

Export audio transcription labels for automatic speech recognition as the JSON manifest format expected by [NVIDIA NeMo models](https://docs.nvidia.com/deeplearning/nemo/user-guide/docs/en/v0.11.0/collections/nemo_asr.html). Supports audio transcription labeling projects that use the `Audio` or `AudioPlus` tags with the `TextArea` tag.

```json
{“audio_filepath”: “/path/to/audio.wav”, “text”: “the transcription”, “offset”: 301.75, “duration”: 0.82, “utt”: “utterance_id”, “ctm_utt”: “en_4156”, “side”: “A”}
```

### Brush labels to NumPy and PNG

Export your brush mask labels as NumPy 2d arrays and PNG images. Each label outputs as one image. Supports brush labeling image projects that use the `BrushLabels` tag.

### COCO

A popular machine learning format used by the [COCO dataset](http://cocodataset.org/#home) for object detection and image segmentation tasks. Supports bounding box and polygon image labeling projects that use the `RectangleLabels` or `PolygonLabels` tags.

### CoNLL2003

A popular format used for the [CoNLL-2003 named entity recognition challenge](https://www.clips.uantwerpen.be/conll2003/ner/). Supports text labeling projects that use the `Text` and `Labels` tags.

### CSV

Results are stored as comma-separated values with the column names specified by the values of the `"from_name"` and `"to_name"` fields in the labeling configuration. Supports all project types.

### JSON

List of items in [raw JSON format](#Label-Studio-JSON-format-of-annotated-tasks) stored in one JSON file. Use this format to export both the data and the annotations for a dataset. Supports all project types.

### JSON_MIN

List of items where only `"from_name", "to_name"` values from the [raw JSON format](#Label-Studio-JSON-format-of-annotated-tasks) are exported. Use this format to export the annotations and the data for a dataset, and no Label-Studio-specific fields. Supports all project types.

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

### Pascal VOC XML

A popular XML-formatted task data is used for object detection and image segmentation tasks. Supports bounding box image labeling projects that use the `RectangleLabels` tag.

### spaCy 

Label Studio does not support exporting directly to spaCy binary format, but you can convert annotations exported from Label Studio to a format compatible with spaCy. You must have the spacy python package installed to perform this conversion. 

To transform Label Studio annotations into spaCy binary format, do the following:
1. Export your annotations to CONLL2003 format.
2. Open the downloaded file and update the first line of the exported file to add `O` on the first line:
```
-DOCSTART- -X- O O
```
3. From the command line, run spacy convert to convert the CoNLL-formatted annotations to spaCy binary format, replacing `/path/to/<filename>` with the path and file name of your annotations:

    spacy version 2:
    ```shell
    spacy convert /path/to/<filename>.conll -c ner
    ```
    spacy version 3:
    ```shell
    spacy convert /path/to/<filename>.conll -c conll . 
    ```

    For more information, see the spaCy documentation on [Converting existing corpora and annotations](https://spacy.io/usage/training#data-convert) on running spacy convert.

### TSV

Results are stored in a tab-separated tabular file with column names specified by `"from_name"` and `"to_name"` values in the labeling configuration. Supports all project types.

### YOLO

Export object detection annotations in the YOLOv3 and YOLOv4 format. Supports object detection labeling projects that use the `RectangleLabels` tag. 


## Label Studio JSON format of annotated tasks 

When you annotate data, Label Studio stores the output in JSON format. The raw JSON structure of each completed task uses the following example: 

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
| result.id | Identifier for the specific annotation result for this task.|
| result.from_name | Name of the tag used to label the region. See [control tags](/tags). |
| result.to_name | Name of the object tag that provided the region to be labeled. See [object tags](/tags). |
| result.type | Type of tag used to annotate the task. |
| result.value | Tag-specific value that includes details of the result of labeling the task. The value structure depends on the tag for the label. For more information, see [Explore each tag](/tags). |
| annotations.completed_by | User ID of the user that created the annotation. Matches the list order of users on the People page on the Label Studio UI. |
| annotations.was_cancelled | Boolean. Details about whether or not the annotation was skipped, or cancelled. | 
| annotations.reviews | <i class='ent'></i> Array containing the details of reviews for this annotation.  |
| reviews.id | Enterprise only. ID of the specific annotation review. |
| reviews.created_by |  <i class='ent'></i> Dictionary containing user ID, email, first name and last name of the user performing the review. |
| reviews.accepted |  <i class='ent'></i> Boolean. Whether the reviewer accepted the annotation as part of their review. |  
| drafts | Array of draft annotations. Follows similar format as the annotations array. Included only for tasks exported as a snapshot [from the UI](#Export-snapshots-using-the-UI) or [using the API](#Export-snapshots-using-the-API).
| predictions | Array of machine learning predictions. Follows the same format as the annotations array, with one additional parameter. |
| predictions.score | The overall score of the result, based on the probabilistic output, confidence level, or other. | 

<!-- md image_units.md -->


<!-- md annotation_ids.md -->
