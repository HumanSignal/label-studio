---
title: Perform Interactive ML-Assisted Labeling with Label Studio 1.3.0
type: blog
image: /images/release-130/130-preannotations.gif
order: 91
meta_title: Label Studio Release Notes 1.3.0
meta_description: Release notes and information about Label Studio version 1.3.0, featuring ML-assisted labeling 
---

At Label Studio, we're always looking for ways to help you accelerate your data annotation process. With the release of version 1.3.0, you can perform model-assisted labeling with any connected [ML backend](/guide/ml.html). By using a machine learning model to interactively predict annotations, expert human annotators can work alongside an untrained, partially trained, or pretrained machine learning model to more efficiently complete labeling tasks. 

ML-assisted labeling works with image segmentation and object detection tasks using rectangles, ellipses, polygons, brush masks, and keypoints. You can also perform ML-assisted labeling with HTML and text named entity recognition tasks. 

<br/><img src="/images/release-130/130-preannotations.gif" alt="" class="gif-border" width="" height="" />


Upgrade to the latest version and select **Use for interactive preannotations** when you set up an ML backend, or edit an existing ML backend connection and toggle that option to get started today!

If you only want to selectively perform ML-assisted labeling, that's an option too! When you're labeling, you can toggle **Auto-Annotation** for specific tasks so that you can manually label more complicated tasks.

<br/><img src="/images/release-130/130-preannotations.gif" alt="" class="gif-border" width="" height="" />

For example, with this example labeling configuration, the Brush mask tool is visible for manual labeling and the KeyPoint labeling tool is visible only when in auto-annotation mode. 
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

<br/><img src="/images/release-130/130-preannotations.gif" alt="" class="gif-border" width="" height="" />

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

To further accelerate your ML-assisted labeling, you can choose to automatically accept the predicted labels. 

## Other improvements

ML-assisted labeling is the most exciting part of this release, but it's not the only improvement we've made. We improved the functionality of the filtering options on the data manager, and also improved semantic segmentation. 


Install or upgrade Label Studio and [start using ML-assisted labeling with interactive preannotations](/guide/ml.html) today!