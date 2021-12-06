---
title: Label Studio v1.1 is now available!
type: blog
image: /images/release-110/multi-labeling.gif
order: 93
meta_title: Label Studio Release Notes 1.1.0
meta_description: Release notes and information about Label Studio version 1.1.0, with improved data labeling functionality for image annotations and object character recognition (OCR) labeling for machine learning projects.
---

Label Studio version 1.1 is now available, delivering on our promises in our [public roadmap](https://github.com/heartexlabs/label-studio/blob/master/roadmap.md).

Our main focus for this release was to improve the image annotation experience, whether you're adding shapes, bounding boxes, drawing brush masks, or performing optical character recognition (OCR) with images.

<br/><img src="/images/release-110/label-multiple-regions.gif" alt="Gif of adding polygons and rectangle regions and then labeling them to an aerial image of a city in the Label Studio UI." class="gif-border" width="800px" height="425px" />

Read on for the exciting highlights of this release!

## Performance improvements 

We want Label Studio to be faster and more responsive when adding bounding boxes and shapes to images, so this release includes performance optimizations. Now you can add hundreds of bounding boxes to an image without significant user interface delays.

## Quickly create any type of image region

If you want to combine different types of regions in your image annotations, now you can! 

Draw whichever shapes or masks that make sense for your images, from rectangles, ellipses, and polygons, to brush masks or keypoints! 

You can combine the different types of Control tags in the labeling configuration that you create for the labeling interface, like the following example:

```xml
<View>
  <Image name="image" value="$image" />
  <Rectangle name="rect" toName="image" />
  <Ellipse name="ellipse" toName="image" />
  <KeyPoint name="kp" toName="image" />
  <Polygon name="polygon" toName="image" />
  <Brush name="brush" toName="image" />
<Labels name="labels" toName="image" fillOpacity="0.5" strokeWidth="5">
  <Label value="Building" background="green"></Label>
  <Label value="Vehicle" background="blue"></Label>
  <Label value="Pavement" background="red"></Label>
  </Labels>
</View>
```

Then, you can use the multi-tool selector to choose whether to add a rectangle, ellipse, keypoint, polygon, or brush region to the image.

<br/><img src="/images/release-110/multi-labeling.gif" alt="Gif of adding polygons and brush labels to an aerial image of a city in the Label Studio UI." class="gif-border" width="800px" height="519px" />

See more in [Advanced image labeling](/guide/labeling.html#Advanced-image-labeling).

## Quickly create, hide, and remove regions

With this added flexibility in adding regions comes faster labeling! You can now add a rectangle or an ellipse to your image with just two clicks, or double click to create a polygon, rectangle, or ellipse. 

If you accidentally select a point on an image while creating a polygon, just double click to remove the erroneous point and continue creating the region. You need to have at least three polygon points to be able to remove one.

<br/><img src="/images/release-110/deletepolygonpoint.gif" alt="Gif of drawing a polygon and removing an accidental point of the polygon on an image in the Label Studio UI." class="gif-border" />

While you could previously show or hide regions one by one, now you can toggle the visibility of all regions at once, or hide all regions for a specific label. This makes it easier for you to create overlapping regions and look at specific labeled regions together. 

## Import partial predictions and finish labeling in Label Studio

If you perform data annotation in stages or with different groups of annotators, you might want to separate creating regions with bounding boxes and brushes, from assigning labels to those regions. With Label Studio 1.1, that's now possible!

You can now separate creating regions from assigning labels, which means you can import predicted bounding boxes or polygons from a machine learning model, then correct the placement of the detected objects and finish labeling them in Label Studio. This workflow is perfect for two-step labeling, where you want one annotator, or a machine learning model, to create regions and another annotator to label the regions. 

<br/><img src="/images/release-110/label-predicted-regions.gif" alt="Gif of labeling unlabeled rectangular, polygonal, and elliptical regions using the Label Studio UI." class="gif-border" width="800px" height="535px" />

For example, if you have a machine learning model to perform object detection that identifies regions of interest in images, you can upload those predictions to Label Studio and have human annotators apply labels to those regions of interest. If you're doing that with OCR, you can use a machine learning model to identify which regions in an image have text, and then add those predictions to Label Studio and have human annotators transcribe the recognized text. 

For more details and example JSON formats, see [Import pre-annotated data into Label Studio](/guide/predictions.html#Import-pre-annotated-regions-for-images). To create regions yourself, see [Advanced image labeling](/guide/labeling.html#Advanced-image-labeling).

## YOLO export support
Label Studio now supports exporting annotations in YOLO labeling format, which is especially helpful for image annotations. Read more in [Export annotations and data from Label Studio](/guide/export.html#YOLO).

## OCR improvements

Beyond the expanded image annotation functionality, we've also improved support for OCR labeling for when you're extracting text from images. 

<br/><img src="/images/release-110/OCR-example.gif" alt="Gif of adding recognized text in the sidebar after adding a rectangle bounding box on a receipt for a cotton canvas bag in the Label Studio UI." class="gif-border" width="800px" height="524px"  />

Write the text for a selected region in the sidebar, rather than at the bottom of the labeling interface, making it easier to see all the recognized text regions that you've identified and transcribed.

## Stay in touch

Sign up for the [Label Studio Newsletter](https://labelstudio.substack.com/) to find out about new features, tips for using Label Studio, and information about machine learning research and best practices.










