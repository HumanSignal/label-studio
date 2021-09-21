---
title: Perform Interactive ML-Assisted Labeling with Label Studio 1.3.0
type: blog
image: /images/release-130/predict-owl-region.gif
order: 91
meta_title: Label Studio Release Notes 1.3.0
meta_description: Release notes and information about Label Studio version 1.3.0, featuring ML-assisted labeling 
---

At Label Studio, we're always looking for ways to help you accelerate your data annotation process. With the release of version 1.3.0, you can perform [model-assisted labeling with any connected machine learning backend](/guide/ml.html#Get-interactive-preannotations). 

By interactively predicting annotations, expert human annotators can work alongside pretrained machine learning models or rule-based heuristics to more efficiently complete labeling tasks, helping you get more value from your annotation process and make progress in your machine learning workflow sooner.

<br/><img src="/images/release-130/predict-owl-region.gif" alt="Gif of using the smart keypoint tool to add a keypoint to an image of an adorable owl while auto-annotation is selected, then a spinner icon appears and turns into a checkmark, when it finishes there is a gray brush mask covering the owl, which is then labeled as Bird." class="gif-border" width="800px" height="533px" />

You can perform ML-assisted labeling with many different types of data. Supplement your image segmentation and object detection tasks that use rectangles, ellipses, polygons, brush masks, and keypoints, even automatically inferring complex shapes like masks or polygons by interacting with simple primitives such as rectangles or keypoints.

Beyond image labeling use cases, you can also use ML-assisted labeling for your named entity recognition tasks with HTML and text, in case you want to automatically find repetitive or semantically similar substring patterns within long text samples.

[Upgrade to the latest version](/guide/install.html) and select **Use for interactive preannotations** when you set up an ML backend, or edit an existing ML backend connection and toggle that option to get started today!

## Interactive preannotations with images

Set up an object detection or image segmentation machine learning backend and you can perform interactive pre-annotation with images! For example, you can send a keypoint to the machine learning model and it can return a predicted mask region for your image.

<br/><img src="/images/release-130/predict-bird-region.gif" alt="Same workflow as the owl gif, but this time featuring a robin or woodpecker-like bird." class="gif-border" width="800px" height="533px" />

Depending on whether speed or precision is more important in your labeling process, you can choose whether to automatically accept the predicted labels. If you deselect the option to auto accept annotation suggestions, you can manually accept predicted regions before submitting an annotation. 

<br/><img src="/images/release-130/accept-predictions.gif" alt="Gif of using the smart keypoint tool in labeling to add a keypoint to a bird in auto-annotation mode without having predicted regions auto-accepted. After the predicted brush mask appears, an x and a checkmark appear underneath the brush mask to let you accept or reject the mask." class="gif-border" width="800px" height="533px" />

Of course, with the eraser tool (improved with new granularity in this release!) you can manually correct any incorrect automatically predicted regions.

<br/><img src="/images/release-130/edit-predicted-mask.gif" alt="Gif of selecting a brush mask region, then selecting the eraser to erase the brush mask covering some flying geese that were covered by the brush mask region that was supposed to identify not birds, but missed some geese that were out of focus in the image." class="gif-border" width="800px" height="533px" />

## Selective preannotation with images 

If you only want to selectively perform ML-assisted labeling, that's an option too! When you're labeling, you can toggle **Auto-Annotation** for specific tasks so that you can manually label more complicated tasks.

<br/><img src="/images/release-130/combo-manual-auto.gif" alt="Gif showing labeling with the manual brush tool some tree branches as not bird, then enabling auto annotation and using the smart keypoint tool to select the bird and then a gray brush mask appears on the bird and that region is labeled as bird." class="gif-border" width="800px" height="533px" />

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

<br/><img src="/images/release-130/labeling-yes-auto.png" alt="Screenshot of the Label Studio UI with smart keypoint tools appearing in purple at the bottom of the toolbar because auto-annotation is enabled." class="gif-border" width="800px" height="415px" />

## Interactive pre-annotations for text

You can also get interactive pre-annotations for text or HTML when performing named entity recognition (NER) tasks. For example, if you have a long sample of text with multiple occurrences of a word or phrase, you can set up a machine learning backend to identify identical or similar text spans based on a selection. Amplify your text labeling efficiency with this functionality!

For example, you can label all instances of opossum in this excerpt from [Ecology of the Opossum on a Natural Area in Northeastern Kansas by Henry S. Fitch et al.](https://www.gutenberg.org/ebooks/37199) using the [Text Named Entity Recognition Template](/templates/named_entity.html).

<br/><img src="/images/release-130/possum-text-annotation.gif" alt="Gif scrolling through a long excerpt from the mentioned text about opossums in the Label Studio UI, then enabling auto-annotation and selecting the MISC tag and labeling the word opossum. After a few seconds, all other instances of opossum in the text are similarly labeled." class="gif-border" width="" height="" />

You can try this yourself by downloading this example [machine learning backend for substring matching](https://github.com/heartexlabs/label-studio-ml-backend/blob/master/label_studio_ml/examples/substring_matching/substring_matching.py), or take it to the next level using a more sophisticated NLP model like a [transformer](https://github.com/heartexlabs/label-studio-transformers). See more about how to [create your own machine learning backend](/guide/ml_create.html)

Install or upgrade Label Studio and [start using ML-assisted labeling with interactive preannotations](/guide/ml.html#Get-interactive-pre-annotations) today!

## Other improvements

ML-assisted labeling is the most exciting part of this release, but it's not the only improvement we've made. We improved the functionality of the filtering options on the data manager, and also improved semantic segmentation workflows. We also added new capabilities for exporting the results of large labeling projects by introducing export files. Start by [creating an export file](/api#operation/api_projects_exports_create) and then [download the export file](/api#operation/api_projects_exports_download_read) with the results.

Check out the full list of improvements and bug fixes in the [release notes on GitHub](https://github.com/heartexlabs/label-studio/releases/tag/v1.3.0).

