---
title: Label Studio v1.1 is now available!
type: blog
image: /images/
order: 93
meta_title: Label Studio Release Notes 1.1.0
meta_description: Release notes and information about Label Studio version 1.1.0, with improved data labeling functionality for image annotations and object character recognition (OCR) labeling for machine learning projects.
---

Label Studio version 1.1 is now available, delivering on our promises in our [public roadmap](https://github.com/heartexlabs/label-studio/blob/master/roadmap.md).

The main focus of this release is on improving the image annotation experience, whether you're adding shapes, bounding boxes, drawing masks, or performing object character recognition (OCR) with images. 

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

If you've ever wanted to assign labels to regions at different times or using different groups of annotators, now you can. 

Add a label to a region before or after creating the region. Select the region on the image or using the sidebar, then select the label to apply to the region.

INSERTGIFHERE

This workflow is perfect for two-step labeling, where you want one annotator to create regions and another annotator to label the regions, or cases where you want to import predicted bounding boxes or polygons from a machine learning model, then correct the placement of the detected objects and label them.

## YOLO export support
Label Studio now supports exporting annotations in YOLO labeling format, which is especially helpful for image annotations. 

## OCR improvements

Separate from expanded image annotation functionality, we've also improved our OCR labeling support for when you're extracting text from images.













