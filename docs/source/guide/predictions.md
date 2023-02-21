---
title: Import pre-annotated data into Label Studio
short: Import pre-annotations
type: guide
order: 301
meta_title: Import pre-annotated data into Label Studio
meta_description: Import predicted labels, predictions, pre-annotations, or pre-labels into Label Studio for your data labeling, machine learning, and data science projects.
---

If you have predictions generated for your dataset from a model, either as pre-annotated tasks or pre-labeled tasks, you can import the predictions with your dataset into Label Studio for review and correction. Label Studio automatically displays the pre-annotations that you import on the Labeling page for each task. 

> To generate interactive pre-annotations with a machine learning model while labeling, see [Set up machine learning with Label Studio](ml.html).

You can import pre-annotated tasks into Label Studio [using the UI](tasks.html#Import-data-from-the-Label-Studio-UI) or [using the API](/api#operation/projects_import_create). 

## Format pre-annotations for Label Studio 

To import predicted labels into Label Studio, you must use the [Basic Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format) and set up your tasks with the `predictions` JSON key. The Label Studio ML backend also outputs tasks in this format. Check this common video tutorial showing how to convert a submitted annotation to a prediction:

<iframe class="video-border" width="100%" height="400vh" src="https://www.youtube.com/embed/CyRe73VD4EE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

### Pre-annotations are read-only

Pre-annotations (predictions) cannot be modified and are always read-only.

If the "Show predictions to annotators in the Label Stream and Quick View" toggle in the project settings (Machine Learning section) is enabled, predictions will be automatically copied to newly created annotations. In Quick View mode, annotations can be created from predictions by using the special copy button on the editor tool panel:

<img src="/images/quickview-copy-button.png" class="gif-border">

### Specific examples for pre-annotations

Refer to the following examples for sample pre-annotation formats:
- [Image pre-annotations with semantic segmentation bounding boxes](#Import-pre-annotations-for-images)
- [Image pre-annotations with unlabeled bounding boxes](#Import-pre-annotated-regions-for-images)
- [Text pre-annotations with NER spans](#Import-pre-annotations-for-text)
- [Brush pre-annotations for segmentation with masks](#Import-brush-segmentation-pre-annotations-in-RLE-format)
- [OCR pre-annotations with bounding boxes, labels, and text transcriptions](#Import-OCR-pre-annotations)

To format pre-annotations for Label Studio not represented in these examples, refer to the sample results JSON for the relevant object and control tags for your labeling configuration, such as the [Audio tag](/tags/audio.html) for audio classification tasks. Each tag must be represented in the JSON pre-annotations format to render predictions in the Label Studio UI. Not all object and control tags list sample results JSON. 

You can also use the [Label Studio Playground](/playground) to preview the output JSON for a specific labeling configuration.

### JSON format for pre-annotations

Label Studio JSON format for pre-annotations must contain two sections:
- A `data` object which references the source of the data that the pre-annotations apply to. This can be a URL to an audio file, a pre-signed cloud storage link to an image, plain text, a reference to a CSV file stored in Label Studio, or something else. See how to [specify the data object](#Specify-the-data-object).
- A `predictions` array that contains the pre-annotation results for the different types of labeling. See how to [add results to the predictions array](#Add-results-to-the-predictions-array).

The JSON format for pre-annotations must match the labeling configuration used for your data labeling project. 

#### Specify the data object 
Use the `data` object to reference the `value` of the data specified by the [Object tag](/tags) in your labeling configuration. For example, the following excerpt of a time series labeling configuration:
```xml
...
    <TimeSeries name="ts" value="$csv" valueType="url">
        <Channel column="first_column"/>
    </TimeSeries>
...
```
This excerpt specifies `value="$csv"` in the TimeSeries Object tag. As a result, the data object for the pre-annotations JSON file for this labeling configuration must use "csv" to specify the location of the CSV data for the time series pre-annotations, like in the following example:

```json
[
  {
    "data": {
      "csv": "https://app.heartex.ai/samples/time-series.csv?time=None&values=first_column"    },
    "predictions": []
  }
]
```

#### Add results to the predictions array 

The `predictions` array also depends on the labeling configuration. Some pre-annotation fields are only relevant for certain types of labeling. The following table describes the JSON objects and arrays that exist for all pre-annotations: 

| JSON key | type   | description                                                                                                                                      |
| --- |--------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| `predictions` | array  | Contains all pre-annotations for a specific task.                                                                                                | 
| `predictions.model_version` | string | Specifies the model version that produced the prediction.                                                                                        |
| `predictions.result` | array  | Contains all pre-annotated results for a specific task in a JSON object.                                                                         |
| `result.value` | object | Contains details for a specific labeled region.                                                                                                  |
| `result.id` | string | Arbitrary string used to identify a labeled region. Must match related regions, such as in [OCR pre-annotations](#Import-OCR-pre-annotations).   |
| `result.from_name` | string | String used to reference the labeling configuration `from_name` for the type of labeling being performed. Must match the labeling configuration. |
| `result.to_name` | string | String used to reference the labeling configuration `to_name` for the type of labeling being performed. Must match the labeling configuration.   |
| `result.type` | string | Specify the labeling tag for the type of labeling being performed. For example, a named entity recognition task has a type of `labels`.          |
| `result.readonly` | bool | readonly mode for a specific region | 
| `result.hidden` |  bool | default visibility (eye icon) for a specific region |

Other types of annotation contain specific fields. You can review the [examples on this page](#Specific-examples-for-pre-annotations), or review the [tag documentation for the Object and Control tags](/tags) in your labeling configuration labeling-specific `result` objects. For example, the [Audio tag](tags/audio.html), [HyperText tag](tags/hypertext.html), [Paragraphs tag](tags/paragraphs.html), [KeyPointLabels](/tags/keypointlabels.html) and more all contain sample `result` JSON examples.

> Note: If you're generating pre-annotations for a [custom ML backend](ml_create.html), you can use the `self.parsed_label_config` variable to retrieve the labeling configuration for a project and generate pre-annotations. See the [custom ML backend](ml_create.html) documentation for more details.

## Import bbox and choice pre-annotations for images

For example, import predicted **bounding box regions (rectangles)** and **choices** for tasks to determine whether an item in an image is an airplane or a car. 

For image pre-annotations, Label Studio expects the x, y, width, and height of image annotations to be provided in percentages of overall image dimension. See [Units for image annotations](predictions.html#Units_for_image_annotations) on this page for more about how to convert formats.

Use the following labeling configuration: 
```xml
<View>
  <Choices name="choice" toName="image" showInLine="true">
    <Choice value="Boeing" background="blue"/>
    <Choice value="Airbus" background="green" />
  </Choices>

  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>

  <Image name="image" value="$image"/>
</View>
```

### Example JSON

After you set up an example project, create example tasks that match the following format. 

<br/>
{% details <b>Click to expand the example image JSON</b> %}
Save this example JSON as a file to import it into Label Studio, for example, `example_prediction_task.json`.

{% codeblock lang:json %}
[{
  "data": {
    "image": "/static/samples/sample.jpg" 
  },

  "predictions": [{
    "model_version": "one",
    "score": 0.5,
    "result": [
      {
        "id": "result1",
        "type": "rectanglelabels",        
        "from_name": "label", "to_name": "image",
        "original_width": 600, "original_height": 403,
        "image_rotation": 0,
        "value": {
          "rotation": 0,          
          "x": 4.98, "y": 12.82,
          "width": 32.52, "height": 44.91,
          "rectanglelabels": ["Airplane"]
        }
      },
      {
        "id": "result2",
        "type": "rectanglelabels",        
        "from_name": "label", "to_name": "image",
        "original_width": 600, "original_height": 403,
        "image_rotation": 0,
        "value": {
          "rotation": 0,          
          "x": 75.47, "y": 82.33,
          "width": 5.74, "height": 7.40,
          "rectanglelabels": ["Car"]
        }
      },
      {
        "id": "result3",
        "type": "choices",
        "from_name": "choice", "to_name": "image",
        "value": {
          "choices": ["Airbus"]
      }
    }]
  }]
}]
{% endcodeblock %}

In this example there are 3 results inside 1 prediction, or pre-annotation: 
- `result1` - the first bounding box
- `result2` - the second bounding box
- `result3` - choice selection
The prediction score applies to the entire prediction.

{% enddetails %}
<br/>

Import pre-annotated tasks into Label Studio [using the UI](tasks.html#Import-data-from-the-Label-Studio-UI) or [using the API](/api#operation/projects_import_create). 

In the Label Studio UI, the imported prediction for this task looks like the following: 
<center><img src="../images/predictions_loaded.png" alt="screenshot of the Label Studio UI showing an image of airplanes with bounding boxes covering each airplane." style="width: 100%; max-width: 700px"></center>

## Import pre-annotated rectangle, polygon, ellipse & keypoint regions without labels for images  

If you want to import images with pre-annotated regions without labels assigned to them, follow this example.

Use the following labeling configuration: 
```xml
<View>
  <Image name="image" value="$image" zoom="true" zoomControl="true" rotateControl="false"/>

  <Rectangle name="rect" toName="image" showInline="false"/>
  <Polygon name="polygon" toName="image"/>
  <Ellipse name="ellipse" toName="image"/>
  <KeyPoint name="kp" toName="image"/>

  <Labels name="labels" toName="image" fillOpacity="0.5" strokeWidth="5">
    <Label value="Vehicle" background="green"/>
    <Label value="Building" background="blue"/>
    <Label value="Pavement" background="red"/>
  </Labels>
</View>
```

### Example JSON

After you set up an example project, create example tasks that match the following format. 

<br/>
{% details <b>Click to expand the example image region JSON</b> %}
Save this example JSON as a file to import it into Label Studio, for example, `example_prediction_task.json`.

{% codeblock lang:json %}
[{
  "data": {
    "image": "/static/samples/sample.jpg"
  },
  
  "predictions": [
    {
      "model_version": "one",
      "score": 0.5,
      "result": [
        {
          "original_width": 800,
          "original_height": 450,
          "image_rotation": 0,
          "value": {
            "x": 55.46,
            "y": 2.36,
            "width": 35.86,
            "height": 46.9,
            "rotation": 0
          },
          "id": "ABC",
          "from_name": "rect",
          "to_name": "image",
          "type": "rectangle"
        },
        {
          "original_width": 800,
          "original_height": 450,
          "image_rotation": 0,
          "value": {
            "points": [
              [
                20.93,
                28.90
              ],
              [
                25.86,
                64.69
              ],
              [
                38.40,
                62.79
              ],
              [
                34.13,
                27.48
              ]
            ]
          },
          "id": "GHI",
          "from_name": "polygon",
          "to_name": "image",
          "type": "polygon"
        },
        {
          "original_width": 800,
          "original_height": 450,
          "image_rotation": 0,
          "value": {
            "x": 8.4,
            "y": 20.14,
            "radiusX": 4,
            "radiusY": 7.10,
            "rotation": 0
          },
          "id": "JKL",
          "from_name": "ellipse",
          "to_name": "image",
          "type": "ellipse"
        },
        {
          "original_width": 800,
          "original_height": 450,
          "image_rotation": 0,
          "value": {
            "x": 38.40,
            "y": 34.21,
            "width": 1.0
          },
          "id": "DEF",
          "from_name": "rect",
          "to_name": "image",
          "type": "keypoint"
        }
      ]
    }
  ]
}]
{% endcodeblock %}

In this example there are 3 regions inside 1 result field for a prediction, or pre-annotation: 
- region `ABC` - a rectangle bounding box
- region `DEF` - a second rectangle bounding box
- region `GHI` - a polygonal segmentation
- region `JKL` - an ellipse
None of the regions have labels applied. The labeling configuration must use the `Rectangle` tag instead of the `RectangleLabels` tag to support this type of prediction. Even though the labeling configuration for this example has a `Labels` tag, the predictions do not need to specify labels for the regions. 

{% enddetails %}
<br/>

<!-- md image_units.md -->

## Import span pre-annotations for text 

In this example, import pre-annotations for text using the [named entity recognition template](/templates/named_entity.html):
```xml
<View>
  <Labels name="label" toName="text">
    <Label value="Person"></Label>
    <Label value="Organization"></Label>
    <Label value="Fact"></Label>
    <Label value="Money"></Label>
    <Label value="Date"></Label>
    <Label value="Time"></Label>
    <Label value="Ordinal"></Label>
    <Label value="Percent"></Label>
    <Label value="Product"></Label>
    <Label value="Language"></Label>
    <Label value="Location"></Label>
  </Labels>
  <Text name="text" value="$text"></Text>
</View>
```

### Example JSON

This example JSON file contains two tasks, each with two sets of pre-annotations from different models. The first task also contains prediction scores for each NER span. 

<br/>
{% details <b>Click to expand the example NER JSON</b> %}
Save this example JSON as a file, for example: `example_preannotated_ner_tasks.json`.

{% codeblock lang:json %}
[
  {
    "data": {
      "text": "All that changed when he was 27 and he came to Jerusalem. It was the weekend of both Easter and Passover, and the city was flooded with tourists."
    },
    "predictions": [
      {
        "model_version": "one",
        "score": 0.5,
        "result": [
          {
            "id": "abc",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 29,
              "end": 31,
              "score": 0.70,
              "text": "27",
              "labels": [
                "Date"
              ]
            }
          },
          {
            "id": "def",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 47,
              "end": 56,
              "score": 0.65,
              "text": "Jerusalem",
              "labels": [
                "Location"
              ]
            }
          },
          {
            "id": "ghi",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 65,
              "end": 76,
              "score": 0.95,
              "text": "the weekend",
              "labels": [
                "Date"
              ]
            }
          },
          {
            "id": "jkl",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 85,
              "end": 91,
              "score": 0.50,
              "text": "Easter",
              "labels": [
                "Date"
              ]
            }
          }
        ]
      },
      {
        "model_version": "two",
        "score": 0.42,
        "result": [
          {
            "id": "mno",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 29,
              "end": 31,
              "score": 0.55,
              "text": "27",
              "labels": [
                "Date"
              ]
            }
          },
          {
            "id": "pqr",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 47,
              "end": 56,
              "score": 0.40,
              "text": "Jerusalem",
              "labels": [
                "Location"
              ]
            }
          },
          {
            "id": "stu",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 65,
              "end": 76,
              "score": 0.32,
              "text": "the weekend",
              "labels": [
                "Time"
              ]
            }
          },
          {
            "id": "vwx",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 85,
              "end": 91,
              "score": 0.22,
              "text": "Easter",
              "labels": [
                "Location"
              ]
            }
          },
          {
            "id": "yz1",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 96,
              "end": 104,
              "score": 0.96,
              "text": "Passover",
              "labels": [
                "Date"
              ]
            }
          }
        ]
      }
    ]
  },
  {
    "data": {
      "text": " Each journal was several inches thick and bound in leather. On one page are drawn portraits of Sunny in a flowery, Easter dress and sun hat. On another page are hundreds of sketches of leaves that Niyati saw in her yard."
    },
    "predictions": [
      {
        "model_version": "one",
        "result": [
          {
            "id": "ab2",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 18,
              "end": 32,
              "text": "several inches",
              "labels": [
                "Product"
              ]
            }
          },
          {
            "id": "cd3",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 64,
              "end": 67,
              "text": "one",
              "labels": [
                "Percent"
              ]
            }
          },
          {
            "id": "ef4",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 96,
              "end": 101,
              "text": "Sunny",
              "labels": [
                "Person"
              ]
            }
          },
          {
            "id": "gh5",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 162,
              "end": 170,
              "text": "hundreds",
              "labels": [
                "Percent"
              ]
            }
          },
          {
            "id": "ij6",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 198,
              "end": 204,
              "text": "Niyati",
              "labels": [
                "Person"
              ]
            }
          }
        ]
      },
      {
        "model_version": "two",
        "result": [
          {
            "id": "kl7",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 18,
              "end": 32,
              "text": "several inches",
              "labels": [
                "Fact"
              ]
            }
          },
          {
            "id": "mn8",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 64,
              "end": 67,
              "text": "one",
              "labels": [
                "Percent"
              ]
            }
          },
          {
            "id": "op9",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 96,
              "end": 101,
              "text": "Sunny",
              "labels": [
                "Time"
              ]
            }
          },
          {
            "id": "qr10",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 116,
              "end": 122,
              "text": "Easter",
              "labels": [
                "Location"
              ]
            }
          },
          {
            "id": "st11",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 162,
              "end": 170,
              "text": "hundreds",
              "labels": [
                "Money"
              ]
            }
          },
          {
            "id": "uv12",
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 198,
              "end": 204,
              "text": "Niyati",
              "labels": [
                "Person"
              ]
            }
          }
        ]
      }
    ]
  }
]
{% endcodeblock %}
{% enddetails %}

Import pre-annotated tasks into Label Studio [using the UI](tasks.html#Import-data-from-the-Label-Studio-UI) or [using the API](/api#operation/projects_import_create).

In the Label Studio UI, the imported prediction for the first task looks like the following: 
<center><img src="../images/predictions_loaded_text.png" alt="screenshot of the Label Studio UI showing the text with highlighted text labels and prediction scores visible." style="width: 100%; max-width: 700px"></center>

You can sort the prediction scores for each labeled region using the **Regions** pane options. 


## Import brush segmentation pre-annotations in RLE format

If you want to import pre-annotations for brush mask image segmentation using the [BrushLabels tag](/tags/brushlabels.html), you must convert the masks to RLE format first. The [Label Studio Converter](https://github.com/heartexlabs/label-studio-converter) package has some helper functions for this. See the following for common conversion cases and guidance.

Install Label Studio Converter:
```
pip install -U label-studio-converter
```

Import brush tools:
```python
from label_studio_converter import brush
```

- Convert masks to RLE. This expects an `np.array` with `shape=[image_width, image_height]` and `dtype=np.uint8`. Add the following to your python code to perform the conversion:
    ```python
    mask = (np.random.random([10, 20]) * 255).astype(np.uint8)  # just a random 2D mask
    mask = (mask > 128).astype(np.uint8) * 255  # better to threshold, it reduces output annotation size
    rle = brush.mask2rle(mask)  # mask image in RLE format 
    ```
  
- To convert OpenCV contours, use 
[`brush.contour2rle(contours, contour_id, img_width, img_height)`](https://github.com/heartexlabs/label-studio-converter/blob/master/label_studio_converter/brush.py#L310).

- To convert an image from path (jpg, png. bmp), use 
[`brush.image2rle(path)`](https://github.com/heartexlabs/label-studio-converter/blob/master/label_studio_converter/brush.py#L343).

- To prepare the pre-annotation, use 
[`brush.image2annotation(path, label_name, from_name, to_name, ground_truth=False, model_version=None, score=None)`](https://github.com/heartexlabs/label-studio-converter/blob/master/label_studio_converter/brush.py#L361)

For more assistance, review this [example code creating a Label Studio task with pre-annotations](https://github.com/heartexlabs/label-studio-converter/blob/master/tests/test_brush.py#L11) for brush labels.

## Import OCR pre-annotations 

Import pre-annotations for optical character recognition (OCR), such as output from [tesseract like in this example blog post](/blog/Improve-OCR-quality-with-Tesseract-and-Label-Studio.html). 

In this example, import pre-annotations for OCR tasks using the [OCR template](/templates/optical_character_recognition.html):

```xml
<View>
  <Image name="image" value="$ocr"/>
  <Labels name="label" toName="image">
    <Label value="Text" background="green"/>
    <Label value="Handwriting" background="blue"/>
  </Labels>
  <Rectangle name="bbox" toName="image" strokeWidth="3"/>
  <Polygon name="poly" toName="image" strokeWidth="3"/>
  <TextArea name="transcription" toName="image" editable="true" perRegion="true" required="true" maxSubmissions="1" rows="5" placeholder="Recognized Text" displayMode="region-list"/>
</View>
```

### Example JSON

This example JSON contains one task with three results dictionaries, one for each type of tag in the labeling configuration: Rectangle, Labels, and TextArea. 

<br/>
{% details <b>Click to expand the example image JSON</b> %}
Save this example JSON as a file to import it into Label Studio, for example, `example_prediction_task.json`.

{% codeblock lang:json %}
{
   "data": {
      "ocr": "/data/upload/receipt_00523.png"
   },
   "predictions": [
      {
         "model_version": "best_ocr_model_1_final",
         "result": [
            {
               "original_width": 864,
               "original_height": 1296,
               "image_rotation": 0,
               "value": {
                  "x": 48.93333333333333,
                  "y": 61.333333333333336,
                  "width": 9.733333333333333,
                  "height": 2.8444444444444446,
                  "rotation": 0
               },
               "id": "bb1",
               "from_name": "bbox",
               "to_name": "image",
               "type": "rectangle"
            },
            {
               "original_width": 864,
               "original_height": 1296,
               "image_rotation": 0,
               "value": {
                  "x": 48.93333333333333,
                  "y": 61.333333333333336,
                  "width": 9.733333333333333,
                  "height": 2.8444444444444446,
                  "rotation": 0,
                  "labels": [
                     "Text"
                  ]
               },
               "id": "bb1",
               "from_name": "label",
               "to_name": "image",
               "type": "labels"
            },
            {
               "original_width": 864,
               "original_height": 1296,
               "image_rotation": 0,
               "value": {
                  "x": 48.93333333333333,
                  "y": 61.333333333333336,
                  "width": 9.733333333333333,
                  "height": 2.8444444444444446,
                  "rotation": 0,
                  "text": [
                     "TOTAL"
                  ]
               },
               "id": "bb1",
               "from_name": "transcription",
               "to_name": "image",
               "type": "textarea"
            }
         ],
         "score": 0.89
      }
   ]
}
{% endcodeblock %}
{% enddetails %}

This example JSON also includes a prediction score for the task. The IDs for each rectangle result match the label assigned to the region and the text area transcription for the region. 

> The image data in this example task references an uploaded file, identified by the source_filename assigned by Label Studio after uploading the image. The best way to reference image data is using presigned URLs for images stored in cloud storage, or absolute paths to image data stored in local storage and added to Label Studio by [syncing storage](storage.html). 

Import pre-annotated tasks into Label Studio [using the UI](tasks.html#Import-data-from-the-Label-Studio-UI) or [using the API](/api#operation/projects_import_create).

## Troubleshoot pre-annotations

If annotators can't see predictions or if you encounter unexpected behavior after you import pre-annotations into Label Studio, review this guidance to resolve the issues.

### Make sure the predictions are visible to annotators
In the **Settings > Machine Learning** section for your project, make sure that the following settings are configured:
- Enable **Show predictions to annotators in the Label Stream and Quick View**
- Select the relevant **Model Version** in the drop-down. If there is no drop-down menu visible, there might not be a model version listed for the pre-annotations, or there might be another issue happening. 
- <i class='ent'></i> Disable the option to **Reveal pre-annotations interactively**, which requires manual action from annotators to display pre-annotated regions. (Label Studio Enterprise only)  

### Check the configuration values of your labeling configuration and tasks
The `from_name` of the pre-annotation task JSON must match the value of the name in the `<Labels name="label" toName="text">` portion of the labeling configuration. The `to_name` must match the `toName` value. 

In the text example on this page, the JSON includes `"from_name": "label"` to correspond with the `<Labels name="label"` and `"to_name": text` to correspond with the `toName="text` of the labeling configuration. The default template might contain `<Labels name="ner" toName="text">`. To work with this example JSON, you need to update the values to match.

In the image example on this page, the XML includes
  ```xml
  ...
  <Choices name="choice" toName="image" showInLine="true">`
  ...
  <RectangleLabels name="label" toName="image">
  ...
  ```
To correspond with the following portions of the example JSON:
```json
...
"type": "rectanglelabels",        
"from_name": "label", "to_name": "image",
...
type": "choices",
"from_name": "choice", "to_name": "image",
...
```

### Check the labels in your configuration and your tasks
Make sure that you have a labeling configuration set up for the labeling interface, and that the labels in your JSON file exactly match the labels in your configuration. If you're using a [tool to transform your model output](https://github.com/heartexlabs/label-studio-transformers), make sure that the labels aren't altered by the tool. 

### Check the IDs and toName values
If you're performing nested labeling, such as displaying a TextArea tag for specific Label or Choice values, the IDs for those results must match. 

For example, if you want to transcribe text alongside a named entity resolution task, you might have the following labeling configuration:
```xml
  <View>
    <Labels name="label" toName="text">
      <Label value="PER" background="red"/>
      <Label value="ORG" background="darkorange"/>
      <Label value="LOC" background="orange"/>
      <Label value="MISC" background="green"/>
    </Labels>
    <Text name="text" value="$text"/>
    <TextArea name="entity" toName="text" perRegion="true"/>
  </View>
```

If you wanted to add predicted text and suggested transcriptions for this labeling configuration, you might use the following example JSON. 
```json
{
"data":{
         "text":"The world that we live in is a broad expanse of nothingness, said the existential philosopher, before he rode away with his cat on his motorbike. "
      },
   "predictions":[
      {
            "result":[
               {
                  "value":{
                     "start":135,
                     "end":144,
                     "text":"motorbike",
                     "labels":[
                        "ORG"
                     ]
                  },
                  "id":"def",
                  "from_name":"ner",
                  "to_name":"text",
                  "type":"labels"
               },
               {
                  "value":{
                     "start":135,
                     "end":144,
                     "text":[
                        "yay"
                     ]
                  },
                  "id":"def",
                  "from_name":"entity",
                  "to_name":"text",
                  "type":"textarea"
               }
            ]
      }
   ]
}
```
Because the TextArea tag applies to each labeled region, the IDs for the label results and the textarea results must match. 


### Read only and hidden regions

In some situations it's very helpful to hide or to make `read-only` bounding boxes, text spans, audio segments, etc. You can put `"readonly": true` or `"hidden": true` in regions to achieve this (the dict inside of `annotations.result` list).  
