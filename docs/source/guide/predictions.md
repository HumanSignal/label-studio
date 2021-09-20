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

To import predicted labels into Label Studio, you must use the [Basic Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format) and set up your tasks with the `predictions` JSON key. The Label Studio ML backend also outputs tasks in this format. 

For image pre-annotations, Label Studio expects the x, y, width, and height of image annotations to be provided in percentages of overall image dimension. See [Units for image annotations](predictions.html#Units_for_image_annotations) on this page for more about how to convert formats.

Import pre-annotated tasks into Label Studio [using the UI](tasks.html#Import-data-from-the-Label-Studio-UI) or [using the API](/api#operation/projects_import_create). 

## Import pre-annotations for images

For example, import predicted labels for tasks to determine whether an item in an image is an airplane or a car. 

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

After you set up an example project, create example tasks that match the following format. 

<br/>
{% details <b>Click to expand the example image JSON</b> %}
Save this example JSON as a file to import it into Label Studio, for example, `example_prediction_task.json`.

{% codeblock lang:json %}
[{
  "data": {
    "image": "http://localhost:8080/static/samples/sample.jpg" 
  },

  "predictions": [{
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
    }],
    "score": 0.95
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

## Import pre-annotated regions for images 

If you want to import images with pre-annotated regions without labels assigned to them, follow this example.

Use the following labeling configuration: 
```xml
<View>
  <View style="display:flex;align-items:start;gap:8px;flex-direction:row">
    <Image name="image" value="$image" zoom="true" zoomControl="true" rotateControl="false"/>
    <Rectangle name="rect" toName="image" showInline="false"/>
  </View>
  <Ellipse name="ellipse" toName="image"/>
  <KeyPoint name="kp" toName="image"/>
  <Polygon name="polygon" toName="image"/>
  <Brush name="brush" toName="image"/>
  <Labels name="labels" toName="image" fillOpacity="0.5" strokeWidth="5">
    <Label value="Vehicle" background="green"/>
    <Label value="Building" background="blue"/>
    <Label value="Pavement" background="red"/>
  </Labels>
</View>
```

After you set up an example project, create example tasks that match the following format. 

<br/>
{% details <b>Click to expand the example image region JSON</b> %}
Save this example JSON as a file to import it into Label Studio, for example, `example_prediction_task.json`.

{% codeblock lang:json %}
[{
    "id":8,
    "predictions":[
        {
            "id":10,
            "result":[
               {
                  "original_width":800,
                  "original_height":450,
                  "image_rotation":0,
                  "value":{
                     "x":55.46666666666667,
                     "y":2.3696682464454977,
                     "width":35.86666666666667,
                     "height":46.91943127962085,
                     "rotation":0
                  },
                  "id":"ABC",
                  "from_name":"rect",
                  "to_name":"image",
                  "type":"rectangle"
               },
               {
                  "original_width":800,
                  "original_height":450,
                  "image_rotation":0,
                  "value":{
                     "x":58.4,
                     "y":64.21800947867298,
                     "width":30.533333333333335,
                     "height":19.90521327014218,
                     "rotation":0
                  },
                  "id":"DEF",
                  "from_name":"rect",
                  "to_name":"image",
                  "type":"rectangle"
               },
               {
                  "original_width":800,
                  "original_height":450,
                  "image_rotation":0,
                  "value":{
                     "points":[
                        [
                           20.933333333333334,
                           28.90995260663507
                        ],
                        [
                           25.866666666666667,
                           64.69194312796209
                        ],
                        [
                           38.4,
                           62.796208530805686
                        ],
                        [
                           34.13333333333333,
                           27.488151658767773
                        ]
                    ]
                },
                "id":"GHI",
                "from_name":"polygon",
                "to_name":"image",
                "type":"polygon"
                },
                {
                "original_width":800,
                "original_height":450,
                "image_rotation":0,
                "value":{
                    "x":8.4,
                    "y":20.14218009478673,
                    "radiusX":4,
                    "radiusY":7.109004739336493,
                    "rotation":0
                    },
                "id":"JKL",
                "from_name":"ellipse",
                "to_name":"image",
                "type":"ellipse"
                }
            ],
            "task":8
        }
    ],
    "data":{
    "image":"/data/upload/31159626248_d0362d027c_c.jpg"
    },
    "project":4
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

## Import pre-annotations for text 

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
        "result": [
          {
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
        "result": [
          {
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
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 17,
              "end": 31,
              "text": "several inches",
              "labels": [
                "Product"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 63,
              "end": 66,
              "text": "one",
              "labels": [
                "Percent"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 95,
              "end": 100,
              "text": "Sunny",
              "labels": [
                "Person"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 161,
              "end": 169,
              "text": "hundreds",
              "labels": [
                "Percent"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 197,
              "end": 203,
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
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 17,
              "end": 31,
              "text": "several inches",
              "labels": [
                "Fact"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 63,
              "end": 66,
              "text": "one",
              "labels": [
                "Percent"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 95,
              "end": 100,
              "text": "Sunny",
              "labels": [
                "Time"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 115,
              "end": 121,
              "text": "Easter",
              "labels": [
                "Location"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 161,
              "end": 169,
              "text": "hundreds",
              "labels": [
                "Money"
              ]
            }
          },
          {
            "from_name": "label",
            "to_name": "text",
            "type": "labels",
            "value": {
              "start": 197,
              "end": 203,
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

## Troubleshoot pre-annotations
If you encounter unexpected behavior after you import pre-annotations into Label Studio, review this guidance to resolve the issues.

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


