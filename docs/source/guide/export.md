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

{% insertmd includes/annotation_ids.md %}

<div class="opensource-only">

### Export using the UI in Community Edition of Label Studio

Use the following steps to export data and annotations from the Label Studio UI. 

1. For a project, click **Export**.
2. Select an available export format.
3. Click **Export** to export your data.

!!! note
    1. The export will always include the annotated tasks, regardless of filters set on the tab. 
    2. Cancelled annotated tasks will be included in the exported result too.
    3. If you want to apply tab filters to the export, try creating [export snapshots using the SDK](https://api.labelstud.io/api-reference/api-reference/projects/exports/create).

### Export timeout in Community Edition

Exports from the Community Edition UI are generated **synchronously** as part of the request. Community Edition keeps deployment simple and does not run background export workers by default. Label Studio Enterprise supports background workers for asynchronous snapshot exports, which is better suited for large-scale projects. For large projects, the community's export can take longer than the timeout configured in your reverse proxy or ingress (often around **90 seconds**), which can result in 502/504 errors or an export timeout.

If you hit this limitation, you can still export your data using one of these options:

- **Export snapshots using the SDK**: See how to [export snapshots using the SDK](https://api.labelstud.io/api-reference/api-reference/projects/exports/create).
- **Export using the console command**: Use the [console command](#Export-using-console-command) to export your project directly from the machine running Label Studio.
- **Export in the UI at scale**: Label Studio Enterprise includes **background snapshot exports** in the UI for large datasets (see [Export snapshots using the UI](#Export-snapshots-using-the-UI)).

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

You can call the Label Studio API to export annotations. For a small labeling project, call the [export endpoint](https://api.labelstud.io/api-reference/api-reference/projects/exports/download-sync) to export annotations.


#### Export all tasks including tasks without annotations

Label Studio open source exports tasks with annotations only by default. If you want to easily export all tasks including tasks without annotations, you can call  the [Easy Export API](https://api.labelstud.io/api-reference/api-reference/projects/exports/download-sync) with query param `download_all_tasks=true`. For example:
```
curl -X GET https://localhost:8080/api/projects/{id}/export?exportType=JSON&download_all_tasks=true
``` 

If your project is large, you can use a [snapshot export](https://api.labelstud.io/api-reference/api-reference/projects/exports/create) to avoid timeouts in most cases. Snapshots include all tasks without annotations by default.


### Export snapshots using the Snapshot API 

For a large labeling project with hundreds of thousands of tasks, do the following:
1. Make a POST request to [create a new export file or snapshot](https://api.labelstud.io/api-reference/api-reference/projects/exports/create). The response includes an `id` for the created file.
2. [Check the status of the export file created](https://api.labelstud.io/api-reference/api-reference/projects/exports/get) using the `id` as the `export_pk`. 
3. Using the `id` from the created snapshot as the export primary key, or `export_pk`, make a GET request to [download the export file](https://api.labelstud.io/api-reference/api-reference/projects/exports/download).


## Export formats supported by Label Studio

Label Studio supports many common and standard formats for exporting completed labeling tasks. If you don't see a format that works for you, you can contribute one. For more information, see the [Label Studio Converter tool in our SDK repo](https://github.com/HumanSignal/label-studio-sdk/tree/master/src/label_studio_sdk/converter).

### ASR_MANIFEST

Export audio transcription labels for automatic speech recognition as the JSON manifest format expected by [NVIDIA NeMo models](https://docs.nvidia.com/deeplearning/nemo/user-guide/docs/en/stable/core/core.html). Supports audio transcription labeling projects that use the `Audio` tag with the `TextArea` tag.

```json
{“audio_filepath”: “/path/to/audio.wav”, “text”: “the transcription”, “offset”: 301.75, “duration”: 0.82, “utt”: “utterance_id”, “ctm_utt”: “en_4156”, “side”: “A”}
```

### Brush labels to NumPy and PNG

Export your brush mask labels as NumPy 2d arrays and PNG images. Each label outputs as one image. Supports brush labeling image projects that use the `BrushLabels` tag.

### COCO

A popular machine learning format used by the [COCO dataset](http://cocodataset.org/#home) for object detection and image segmentation tasks. Supports bounding box and polygon image labeling projects that use the `BrushLabels`, `RectangleLabels`, `KeyPointLabels` (see note below), or `PolygonLabels` tags.


{% details <b>KeyPointLabels Export Support</b> %}

If using `KeyPointLabels`, you will need to add the following to your labeling config:

* At least one `<RectangleLabels>` option. You will use this as a parent bounding box for the keypoints. 
* Add a `model_index` to every `<Label>` inside your `<KeyPointLabels>` tag. The `model_index` value defines the order of the keypoint coordinates in the output array for YOLO. 

For example:

```xml
<View>
  <Image name="image" value="$image"/>

  <KeyPointLabels name="kp" toName="image">
    <Label value="nose" model_index="0"/>
    <Label value="eye" model_index="1"/>
    <Label value="tail" model_index="2"/>
  </KeyPointLabels>

  <RectangleLabels name="bbox" toName="image">
    <Label value="animal"/>
  </RectangleLabels>
</View>

```

After annotating, you must drag-and-drop each keypoint region under its corresponding rectangle region in the **Regions** panel. 

This establishes a parent–child hierarchy (via parentID), which is necessary for export. See the export examples below. 

![Screenshot of keypoints within a bounding box](/images/import-export/keypoints.png)

**Export examples**

<div class="code-tabs">
  <div data-name="Keypoints in JSON">
```json
[
      {
        "result": [
          {
            "id": "17n06ubOJs",
            "type": "keypointlabels",
            "value": {
              "x": 6.675567423230974,
              "y": 20.597014925373134,
              "width": 0.26702269692923897,
              "keypointlabels": [
                "nose"
              ]
            },
            "origin": "manual",
            "to_name": "image",
            "parentID": "QHG4TBXuNC",
            "from_name": "kp",
            "image_rotation": 0,
            "original_width": 200,
            "original_height": 179
          },
          {
            "id": "QHG4TBXuNC",
            "type": "rectanglelabels",
            "value": {
              "x": 3.871829105473965,
              "y": 4.029850746268656,
              "width": 94.39252336448598,
              "height": 92.08955223880598,
              "rotation": 0,
              "rectanglelabels": [
                "animal"
              ]
            },
            "origin": "manual",
            "to_name": "image",
            "from_name": "bbox",
            "image_rotation": 0,
            "original_width": 200,
            "original_height": 179
          }
]
```
  </div>
  <div data-name="Keypoints in COCO">
```json
[
    {
      "id": 0,
      "image_id": 0,
      "category_id": 0,
      "segmentation": [],
      "bbox": [
        7.74365821094793,
        7.213432835820895,
        188.78504672897196,
        164.84029850746268
      ],
      "ignore": 0,
      "iscrowd": 0,
      "area": 31119.38345654903
    },
    {
      "id": 1,
      "image_id": 0,
      "category_id": 0,
      "keypoints": [
        13,
        37,
        2,
        33,
        33,
        2,
        167,
        24,
        2
      ],
      "num_keypoints": 3,
      "bbox": [
        13,
        24,
        154,
        13
      ],
      "iscrowd": 0
    }
]
```
  </div>
  <div data-name="Keypoints in YOLO">
```
0 0.5106809078771696 0.5007462686567165 0.9439252336448598 0.9208955223880598 0.06675567423230974 0.20597014925373133 2 0.1628838451268358 0.18507462686567164 2 0.8371161548731643 0.13134328358208955 2
```
  </div>
</div>
{% enddetails %}


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

Export object detection annotations in the YOLOv3 and YOLOv4 format. Supports object detection labeling projects that use the `RectangleLabels`  and `KeyPointLabels` tags. 

!!! note
    If using KeyPointLabels, see the note under [COCO](#COCO).

{% insertmd includes/task_format.md %}

{% insertmd includes/image_units.md %}

## Manually convert JSON annotations to another format
You can run the [Label Studio converter tool](https://github.com/HumanSignal/label-studio-sdk/tree/master/src/label_studio_sdk/converter) on a directory or file of completed JSON annotations using the command line or Python to convert the completed annotations from Label Studio JSON format into another format. 

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

Another way of accessing data is to use link from task and ACCESS_TOKEN ([see documentation for authentication](access_tokens)). Concatenate Label Studio hostname and link from task data. Then add access token to your request:

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
