---
title: Add a custom matching function
short: Custom matching function
badge: <i class='ent'></i>
type: guide
order: 414
meta_title: Add a Custom Matching Function for Labeling
meta_description: Label Studio Enterprise documentation about how to add a custom matching function to use for assessing annotator agreement or the quality of your annotation results for data labeling and machine learning projects.
---

Write a custom matching function to assess the quality of the annotations in your Label Studio Enterprise project. Label Studio Enterprise contains a variety of [matching functions for your project](stats.html) but if you want to evaluate annotations using a custom metric or a standard metric not available in Label Studio, you can write your own. 

<div class="enterprise"><p>
Label Studio Enterprise Edition includes various annotation and labeling statistics and the ability to add your own. The open source Community Edition of Label Studio does not contain these calculations. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

1. Review the [prerequisites](#Prerequisites).
2. [Write your custom matching function](#How-to-write-your-custom-matching-function).
3. [Add your custom matching function to Label Studio Enterprise](#Add-your-custom-matching-function-to-Label-Studio-Enterprise).

## Prerequisites

Before writing your custom matching function, do the following:
1. Download the [label-studio-evalme](https://github.com/heartexlabs/label-studio-evalme) library to help you write the function.
2. Determine the type of labeling that you're performing based on your labeling configuration.
3. Review the JSON format of your annotations for your labeling project.

## How to write your custom matching function

Based on the type of labeling that you're performing, write a custom function. The [label-studio-evalme](https://github.com/heartexlabs/label-studio-evalme) repository includes boilerplate methods that you can use to construct your custom matching function.

```python
def matching_function(annotation_1, annotation_2, per_label=False, **kwargs) -> float:
    """
    Gets two annotations in Label Studio JSON format https://labelstud.io/guide/export.html#Label-Studio-JSON-format-of-annotated-tasks and returns agreement score between them
    :param annotation_1: First annotation
    :param annotation_2: Second annotation
    :param per_label: per labels calculation
    :return real valued agreement score between 0 and 1
    """
    r1 = annotation_1["result"][0]["value"]["choices"][0]
    r2 = annotation_1["result"][0]["value"]["choices"][0]
    if r1 == r2:
        if r1 == "Positive":
            return 0.99
        if r1 == "Negative":
            return 0.7
    else:
        return 0
```

## Add your custom matching function to Label Studio Enterprise

Set up a custom matching function for a specific project in Label Studio Enterprise. You must configure the labeling interface before you can add your custom matching function. 

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Quality**.
3. Under **Matching Function**, use the drop-down menu to select **Your custom AWS lambda function**.
4. Write or paste code defining a custom matching function in the text box: 
```python
def matching_function(annotation_1, annotation_2, per_label=False, **kwargs) -> float:
    """
    Gets two annotations in Label Studio JSON format https://labelstud.io/guide/export.html#Label-Studio-JSON-format-of-annotated-tasks and returns agreement score between them
    :param annotation_1: First annotation
    :param annotation_2: Second annotation
    :param per_label: per labels calculation
    :return real valued agreement score between 0 and 1
    """
    # your code starts here...
    if per_label:
    # per label calculation returns dict with labels
        return {'aws': 1}
    else:
    # overall calculation returns float[0..1]
        return 1
```
5. Click **Deploy**.

## Troubleshoot your custom matching function

After adding your code to Label Studio Enterprise, the following could happen:

- Your code might fail to deploy if there are errors. Those errors appear in the browser console when you attempt to save the code in the Label Studio UI. 
- Your code might fail to run properly based on the format of your JSON annotations. Export an example annotation from your project and make sure your function handles the annotation as expected outside of Label Studio. 

If you change the labeling configuration for your project, you might need to update the custom matching function code to handle the new format of annotations produced.