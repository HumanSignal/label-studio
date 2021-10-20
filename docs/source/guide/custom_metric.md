---
title: Add a custom agreement metric to Label Studio
short: Custom agreement metric
badge: <i class='ent'></i>
type: guide
order: 414
meta_title: Add a Custom Agreement Metric for Labeling
meta_description: Label Studio Enterprise documentation about how to add a custom agreement metric to use for assessing annotator agreement or the quality of your annotation and prediction results for data labeling and machine learning projects.
---

Write a custom agreement metric to assess the quality of the predictions and annotations in your Label Studio Enterprise project. Label Studio Enterprise contains a variety of [agreement metrics for your project](stats.html) but if you want to evaluate annotations using a custom metric or a standard metric not available in Label Studio, you can write your own. This functionality is only available for Label Studio Enterprise Cloud customers. 

<div class="enterprise"><p>
Label Studio Enterprise Edition includes various annotation and labeling statistics and the ability to add your own. The open source Community Edition of Label Studio does not contain these calculations. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

1. Review the [prerequisites](#Prerequisites).
2. [Write your custom agreement metric](#How-to-write-your-custom-agreement-metric).
3. [Add your custom agreement metric to Label Studio Enterprise](#Add-your-custom-agreement-metric-to-Label-Studio-Enterprise).

## Prerequisites

Before writing your custom agreement metric, do the following:
1. Determine the type of labeling that you're performing based on your labeling configuration.
2. Review the JSON format of your annotations for your labeling project.

## How to write your custom agreement metric

Based on the type of labeling that you're performing, write a custom agreement metric. 

You can use the agreement metric to compare two annotations, or one annotation with one prediction. Use the input parameters `annotation_1` and `annotation_2` to specify the annotations to compare, or annotation and prediction to compare. 

Add your code to the following function defined in Label Studio:
```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:
```

This function takes the following arguments:

| argument | format | description |
| --- | --- | --- |
| `annotation_1` | JSON object | The first annotation or prediction to compare when calculating agreement. Retrieved in [Label Studio JSON format](export.html#Label-Studio-JSON-format-of-annotated-tasks). |
| `annotation_2` | JSON object | The second annotation or prediction to compare when calculating agreement. Retrieved in [Label Studio JSON format](export.html#Label-Studio-JSON-format-of-annotated-tasks).
| `per_label` | boolean | Whether to perform an agreement calculation for each label in the annotation, or across the entire annotation result.  |
| `return` | float | The agreement score to assign, as a float point number between 0 and 1. |

For example, the following agreement metric compares two annotations for a classification task with choice options of "Positive" and "Negative":
```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:

    # Retrieve two annotations in the Label Studio JSON format
    r1 = annotation_1["result"][0]["value"]["choices"][0]
    r2 = annotation_2["result"][0]["value"]["choices"][0]
    
    # Determine annotation agreement based on specific choice values
    if r1 == r2:
        # If annotations match and include the choice "Positive", return an agreement score of 0.99
        if r1 == "Positive":
            return 0.99
        # If annotations match and include the choice "Negative", return an agreement score of 0.7
        if r1 == "Negative":
            return 0.7
    # If annotations do not match, return an agreement score of 0
    else:
        return 0
```

If you set `per_label=True`, you can define a separate method or agreement score for each label. If you do this, you must return a separate score for each label. For example, for a classification task, you could use the following function to assign a weight and return a specific agreement score for each label used in an annotation:

```python
def agreement(annotation_1, annotation_2, per_label=False) -> float:

    label_1 = annotation_1["result"][0]["value"]["choices"][0]
    label_2 = annotation_2["result"][0]["value"]["choices"][0]
    weight = {"Positive": 0.99, "Negative": 0.01}
    
    if label_1 == label_2:
        if per_label:
            return {label_1: weight[label_1]}
        else:
            return weight[label_1]
    else:
        if per_label:
            return {label_1: 0, label_2: 0}
        else:
            return 0
```

## Add your custom agreement metric to Label Studio Enterprise

Set up a custom agreement metric for a specific project in Label Studio Enterprise. 

> You must configure the labeling interface before you can add your custom agreement metric. 

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Quality**.
3. Under **Annotation Agreement**, use the drop-down menu to select **Custom agreement metric**.
4. Write or paste code defining a custom agreement metric in the text box. 
5. Click **Save & Deploy**.

## Troubleshoot your custom agreement metric

After adding your code to Label Studio Enterprise, the following could happen:

- Your code might fail to deploy if there are errors. If you don't see errors in the Label Studio UI, check your web browser console after you attempt to save the code.
- Your code might fail to run properly based on the format of your JSON annotations. Export an example annotation from your project in Label Studio JSON format and make sure your function handles the annotation as expected outside of Label Studio. 

If you change the labeling configuration for your project, you might need to update the custom agreement metric code to handle the new format of annotations produced.