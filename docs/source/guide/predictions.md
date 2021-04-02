---
title: Import pre-annotated data into Label Studio
type: guide
order: 301
meta_title: Import Pre-annotations
meta_description: Label Studio Documentation for importing predicted labels, pre-annotations, or pre-labels into Label Studio for your data labeling, machine learning, or data science projects. 
---

If you have predictions generated for your dataset from a model, either as pre-annotated tasks or pre-labeled tasks, you can import the predictions with your dataset into Label Studio for review and correction. Label Studio automatically displays the pre-labels that you import on the Labeling page for each task. 

To import predicted labels into Label Studio, you must use the [Basic Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format) and set up your tasks with the `predictions` JSON key. The Label Studio ML backend also outputs tasks in this format. 

> You must use different IDs for each task elements, annotations, predictions and their `result` items. 

## Example of importing predicted labels

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

After you set up an example project, import this task into Label Studio. Save it as a file first, for example, `example_prediction_task.json`.

```json
{
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
      }
    ]
  }]
}
```

In this example there are 3 results inside of 1 prediction: 
- `result1` - the first bounding box
- `result2` - the second bounding box
- `result3` - choice selection 
 
In the Label Studio UI, the imported prediction for this task looks like the following: 
<center><img src="../images/predictions_loaded.png" style="width: 100%; max-width: 700px"></center>
