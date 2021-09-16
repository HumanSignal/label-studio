---
title: Perform Interactive ML-Assisted Labeling with Label Studio 1.3.0
type: blog
image: /images/release-130/predict-owl-region.gif
order: 91
meta_title: Label Studio Release Notes 1.3.0
meta_description: Release notes and information about Label Studio version 1.3.0, featuring ML-assisted labeling 
---

At Label Studio, we're always looking for ways to help you accelerate your data annotation process. With the release of version 1.3.0, you can perform model-assisted labeling with any connected [ML backend](/guide/ml.html). 

By using a machine learning model to interactively predict annotations, expert human annotators can work alongside with pretrained machine learning models or rule-based heuristics to more efficiently complete labeling tasks. 

ML-assisted labeling is applicable to many different data types. For example, it works with image segmentation and object detection tasks using rectangles, ellipses, polygons, brush masks, and keypoints, but automatically infer complex shapes on the screen like masks or polygons by interacting with simple primitives like rectangles or keypoints.
You can also perform ML-assisted labeling for named entity recognition tasks for HTML and text, in case you want to automatically find repetitive or semantically similar substring patterns within long texts.


### Example of interactive preannotations with Images

<br/><img src="/images/release-130/predict-owl-region.gif" alt="" class="gif-border" width="800px" height="533px" />

Upgrade to the latest version and select **Use for interactive preannotations** when you set up an ML backend, or edit an existing ML backend connection and toggle that option to get started today!

If you only want to selectively perform ML-assisted labeling, that's an option too! When you're labeling, you can toggle **Auto-Annotation** for specific tasks so that you can manually label more complicated tasks.

<br/><img src="/images/release-130/combo-manual-auto.gif" alt="" class="gif-border" width="800px" height="533px" />

For example, with this labeling configuration, the Brush mask tool is visible for manual labeling and the KeyPoint labeling tool is visible only when in auto-annotation mode. 
```xml
<View>
  <Image name="img" value="$image" zoomControl="true" zoom="true" rotateControl="true"/>
  <Brush name="brush" toName="img" smart="false" showInline="true"/>
  <KeyPoint name="kp" toName="img" smartOnly="true"/>
  <Labels name="lb" toName="img">
    <Label value="Bird"/>
    <Label value="Not Bird"/>
  </Labels>
</View>
```
This lets you create traditional brush mask annotations for some tasks, or use the smart keypoint labeling tool to assign keypoints to images and prompt a trained ML backend to predict brush mask regions based on the keypoints. 

<br/><img src="/images/release-130/labeling-yes-auto.png" alt="" class="gif-border" width="800px" height="415px" />

This also works for named entity recognition tasks. For example, if you have a long selection of text with multiple occurrences of an entity, you can set up a machine learning backend to identify identical or similar text spans based on a selection, 

```xml
 <View>
  <Labels name="label" toName="text" smart="true">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>
  <Text name="text" value="$ner"/>
</View>
```

<br/><img src="/images/release-130/text-annotation.gif" alt="" class="gif-border" width="" height="" />

Depending on whether speed or precision is more important in your labeling process, you can choose whether to automatically accept the predicted labels. If you deselect the option to auto accept annotation suggestions, you can manually accept predicted regions before submitting an annotation. 

<br/><img src="/images/release-130/accept-predictions.gif" alt="" class="gif-border" width="800px" height="533px" />

Of course, with the eraser tool (improved with new granularity in this release!) you can manually correct any incorred predicted regions.

<br/><img src="/images/release-130/edit-predicted-mask.gif" alt="" class="gif-border" width="800px" height="533px" />


### Example of interactive preannotations with texts

Here is an example you can label all >400 occurences of the word "Lorem Ipsum" in the long text in one click:

<GIF HERE>

Try it yourself by downloading [Machine Learning backend for substring matching](https://github.com/heartexlabs/label-studio-ml-backend/pull/32)!
Use this backend to take your text labeling efficiency to the next level. Or you can do much more, by replacing rule-based substring matching with more sophisticated NLP models like [Transformers](https://github.com/heartexlabs/label-studio-transformers)!
Read [ML backend guide]() on how to easily create your own ML backend for interactive preannotations



Install or upgrade Label Studio and [start using ML-assisted labeling with interactive preannotations](/guide/ml.html#Get-interactive-pre-annotations) today!


## Other improvements

ML-assisted labeling is the most exciting part of this release, but it's not the only improvement we've made. We improved the functionality of the filtering options on the data manager, and also improved semantic segmentation workflows. Check out the full list of improvements and bug fixes in the [release notes on GitHub](https://github.com/heartexlabs/label-studio/releases/tag/v1.3.0). 

