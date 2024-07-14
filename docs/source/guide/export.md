---
title: Export annotations and data from Label Studio
short: Export annotations
type: guide
tier: all
order: 166
order_enterprise: 166
meta_title: Export Annotations
meta_description: Label Studio documentation for exporting data labeling annotations to use in machine learning models and data science projects.
section: "Import & Export"

---

At any point in your labeling project, you can export the annotations from Label Studio. 

Label Studio stores your annotations in a raw JSON format in the SQLite database backend, PostgreSQL database backend, or whichever cloud or database storage you specify as target storage. Cloud storage buckets contain one file per labeled task named `task_id.json`. For more information about syncing target storage, see [Cloud storage setup](storage.html).

Image annotations exported in JSON format use percentages of overall image size, not pixels, to describe the size and location of the bounding boxes. For more information, see [how to convert the image annotation units](#Units-of-image-annotations).

!!! note
    Some export formats export only the annotations and not the data from the task. For more information, see the [export formats supported by Label Studio](#Export-formats-supported-by-Label-Studio).


<!-- md annotation_ids.md -->

<div class="opensource-only">

### Export using the UI in Community Edition of Label Studio

Use the following steps to export data and annotations from the Label Studio UI. 

1. For a project, click **Export**.
2. Select an available export format.
3. Click **Export** to export your data.

!!! note
    1. The export will always include the annotated tasks, regardless of filters set on the tab. 
    2. Cancelled annotated tasks will be included in the exported result too.
    3. If you want to apply tab filters to the export, try to use [export snapshots using the SDK](https://labelstud.io/sdk/project.html#label_studio_sdk.project.Project.export_snapshot_create) or [API](#Export-snapshots-using-the-Snapshot-API).

### Export timeout in Community Edition

If the export times out, see how to [export snapshots using the SDK](https://labelstud.io/sdk/project.html#label_studio_sdk.project.Project.export_snapshot_create) or [API](#Export-snapshots-using-the-Snapshot-API). You can also use a [console command](#Export-using-console-command) to export your project. For more information, see the following section.

### Export using console command

Use the following command to export data and annotations.

```shell
label-studio export <project-id> <export-format> --export-path=<output-path>
```

To enable logs: 
```shell
DEBUG=1 LOG_LEVEL=DEBUG label-studio export <project-id> <export-format> --export-path=<output-path>
```

</div>

<div class="enterprise-only">

### Export snapshots using the UI

<img src="/images/lse-export-snapshots-ui.png" alt="" class="gif-border" />
<br>

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

</div>

### Export using the Easy Export API

You can call the Label Studio API to export annotations. For a small labeling project, call the [export endpoint](/api#operation/api_projects_export_read) to export annotations.


#### Export all tasks including tasks without annotations

Label Studio open source exports tasks with annotations only by default. If you want to easily export all tasks including tasks without annotations, you can call  the [Easy Export API](https://api.labelstud.io/#operation/api_projects_export_read) with query param `download_all_tasks=true`. For example:
```
curl -X GET https://localhost:8080/api/projects/{id}/export?exportType=JSON&download_all_tasks=true
``` 

If your project is large, you can use a [snapshot export](https://api.labelstud.io/#operation/api_projects_exports_create) (or [snapshot SDK](https://labelstud.io/sdk/project.html#create-new-export-snapshot)) to avoid timeouts in most cases. Snapshots include all tasks without annotations by default.


### Export snapshots using the Snapshot API 

For a large labeling project with hundreds of thousands of tasks, do the following:
1. Make a POST request to [create a new export file or snapshot](/api#operation/api_projects_exports_create). The response includes an `id` for the created file.
2. [Check the status of the export file created](/api#operation/api_projects_exports_read) using the `id` as the `export_pk`. 
3. Using the `id` from the created snapshot as the export primary key, or `export_pk`, make a GET request to [download the export file](/api#operation/api_projects_exports_download_read).


## Export formats supported by Label Studio

Label Studio supports many common and standard formats for exporting completed labeling tasks. If you don't see a format that works for you, you can contribute one. For more information, see the [GitHub repository for the Label Studio Converter tool](https://github.com/heartexlabs/label-studio-converter).

### ASR_MANIFEST

Export audio transcription labels for automatic speech recognition as the JSON manifest format expected by [NVIDIA NeMo models](https://docs.nvidia.com/deeplearning/nemo/user-guide/docs/en/stable/core/core.html). Supports audio transcription labeling projects that use the `Audio` tag with the `TextArea` tag.

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
  "image": "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
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


{% insertmd includes/task_format.md %}


<!-- md image_units.md -->


## Manually convert JSON annotations to another format
You can run the [Label Studio converter tool](https://github.com/heartexlabs/label-studio-converter) on a directory or file of completed JSON annotations using the command line or Python to convert the completed annotations from Label Studio JSON format into another format. 

!!! note
    If you use versions of Label Studio earlier than 1.0.0, then this is the only way to convert your Label Studio JSON format annotations into another labeling format. 


## Access task data (images, audio, texts) outside of Label Studio for ML backends

Machine Learning backend uses data from tasks for predictions, and you need to download them on Machine Learning backend side. Label Studio provides tools for downloading of these resources, and they are located in label-studio-tools Python package. If you are using official Label Studio Machine Learning backend, label-studio-tools package is installed automatically with other requirements.

### Accessing task data from Label Studio instance

There are several ways of storing tasks resources (images, audio, texts, etc) in Label Studio:
- Cloud storages 
- External web links 
- Uploaded files
- Local files directory

Label Studio stores uploaded files in Project level structure. Each project has it's own folder for files.

You can use `label_studio_tools.core.utils.io.get_local_path` to get task data - it will transform path or URL from task data to local path.
In case of local path it will return full local path and download resource in case of using `download_resources` parameter.

Provide `Hostname` and `access_token` for accessing external resource.

### Accessing task data outside of Label Studio instance

You can use `label_studio_tools.core.utils.io.get_local_path` method to get data from outside machine for external links and cloud storages. 

!!! attention "important"
    Don't forget to provide credentials.

You can get data with `label_studio_tools.core.utils.io.get_local_path` in case if you mount same disk to your machine. If you mount same disk to external box 

Another way of accessing data is to use link from task and ACCESS_TOKEN ([see documentation for authentication](api.html#Authenticate-to-the-API)). Concatenate Label Studio hostname and link from task data. Then add access token to your request:

```json
curl -X GET http://localhost:8080/api/projects/ -H 'Authorization: Token {YOUR_TOKEN}'
```

### Frequently asked questions 

#### Question #1: I have made a request and received the following API responses: 
- No data was provided.
- 404 or 403 error code was returned. 

**Answer:**
First check the network access to your Label Studio instance when you send API requests. You can execute test curl request with sample data. 

#### Question #2: I tried to access files and received a `FileNotFound` error.

**Answer:**
1. Check that you have mounted the same disk as your Label Studio instance. Then check your files' existence in Label Studio instance first. 

2. Check `LOCAL_FILES_DOCUMENT_ROOT` environment variable in your Label Studio instance and add it to your accessing data script.


#### Question #3: How to modify order of categories for COCO and YOLO exports? 

Labels are sorted in alphabetical order, that is default behavior. If you want to modify that, please add **category** attribute in `<Label>` to modify that behaviour. For example: 
    
```xml
<Label value="abc" category="1" />
<Label value="def" category="2" />
```
