---
title: Label Studio v1.1 is now available!
type: blog
image: /images/release-110/HEADERIMAGE.PNG
order: 93
meta_title: Label Studio Release Notes 1.1.0
meta_description: Release notes and information about Label Studio version 1.1.0, with improved data labeling functionality for image annotations and object character recognition (OCR) labeling for machine learning projects.
---

Label Studio version 1.1 is now available, delivering on our promises in our [public roadmap](https://github.com/heartexlabs/label-studio/blob/master/roadmap.md).

The main focus of this release is on improving the image annotation experience, whether you're adding shapes, bounding boxes, drawing masks, or performing object character recognition (OCR) with images. 

<br/><img src="/images/release-110/EXAMPLE.gif" alt="Gif of adding rectangles, polygons, brushes, and keypoint labels to an image in the Label Studio UI." class="gif-border" />

Read on for the exciting highlights of this release!

## Performance improvements 

We want Label Studio to be faster and more responsive when adding bounding boxes and shapes to images, so this release includes performance optimizations. Now you can add hundreds of bounding boxes to an image without significant user interface delays.

## Create any type of image regions quickly

If you want to add different types of regions to your image annotations, now you can! 

Draw whichever shapes or masks that you want on your images, whether its rectangles, ellipses, polygons, brush masks, or keypoints! 

You can combine the different types of Control tags in the labeling configuration that you create for the labeling interface, like the following example:

```xml
<View>
  <Image name="image" value="$image" />
  <Rectangle name="rect" toName="image" />
  <Ellipse name="ellipse" toName="image" />
  <KeyPoint name="kp" toName="image" />
  <Polygon name="polygon" toName="image" />
  <Brush name="brush" toName="image" />
  <Choices name="choices" toName="image">
    <Choice value="yes"></Choice>
    <Choice value="no"></Choice>
  </Choices>
<Labels name="labels" toName="image" fillOpacity="0.5" strokeWidth="5">
  <Label value="cheese" background="green"></Label>
  <Label value="bun" background="blue"></Label>
  </Labels>
</View>
```

Then, you can use the multi-tool selector to choose whether to add a rectangle, ellipse, keypoint, polygon, or brush region to the image.

## Quickly create, hide, and remove regions

With this added flexibility comes faster labeling! You can now add a rectangle or an ellipse to your image with just two clicks, or double click to create a polygon, rectangle, or ellipse. 

If you accidentally select a point on an image while creating a polygon, just double click to remove the erroneous point and continue creating the region. You need to have at least three polygon points to be able to remove one.

While you could previously show or hide regions one by one, now you can toggle the visibility of all regions at once, and also hide all regions for a specific label at once. This makes it easier to create overlapping regions.

## Assign labels after creating regions

If you perform data annotation in stages or with different groups of annotators, you might want to separate creating regions with bounding boxes and brushes, from assigning labels to those regions. With Label Studio 1.1, that's now possible!

Add a label to a region before or after creating the region. Select the region on the image or using the sidebar, then select the label to apply to the region.

<br/><img src="/images/release-110/EXAMPLE2.gif" alt="Gif of adding rectangles and polygons to an image, then labeling them afterward using the Label Studio UI." class="gif-border" />

This workflow is perfect for two-step labeling, where you want one annotator to create regions and another annotator to label the regions, or cases where you want to import predicted bounding boxes or polygons from a machine learning model, then correct the placement of the detected objects and label them. See more in [Advanced image labeling](labeling.html#Advanced-image-labeling).

## YOLO export support
Label Studio now supports exporting annotations in YOLO labeling format, which is especially helpful for image annotations. Read more in [Export annotations and data from Label Studio](export.html#YOLO).

## OCR improvements

Separate from expanded image annotation functionality, we've also improved our OCR labeling support for when you're extracting text from images. 

<br/><img src="/images/release-110/EXAMPLEOCR.gif" alt="Gif of adding recognized text in the sidebar after adding a rectangle bounding box in the Label Studio UI." class="gif-border" />

Write the text for a selected region in the sidebar, rather than at the bottom of the labeling interface, making it easier to see all the recognized text regions that you've identified and transcribed.











