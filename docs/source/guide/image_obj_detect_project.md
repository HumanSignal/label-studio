---
title: Create an object detection project in Label Studio
short: 
type: guide
order: 3
meta_title: 
meta_description: 
---

Create an image object detection project in Label Studio to add bounding boxes to images for machine learning and data science object detection use cases. 

## Prerequisites

Before you start, identify your data and how you want to label it.

### Identify your data

Determine the following:
- Where is your data stored? In a local directory? In cloud storage?
- In what format is your data stored? JPEG? PNG? Another image format? 
- How much image data do you want to label?
- Is it base64 encoded? 

### Identify how you want to label your data

Determine the following:
- What shapes you want to use to perform object detection — bounding boxes, ellipses, polygons, brush masks, or keypoints.
- What labels you want to apply to the shapes.

## Set up a project

Based on the labels that you want to use for your project and the type of labeling you want to perform, set up a labeling configuration.

### Start with a template

Label Studio includes a variety of image labeling templates.

Start with the one that fits your use case best:
- [Image Object Detection](/templates/image_bbox.html) for rectangular bounding boxes
- [Image Ellipse](/templates/image_ellipse.html) for ellipses
- [Image Polygons](/templates/image_polygons.html) for polygons


### Customize the labeling configuration 

After choosing your template for your use case, customize it to use the relevant labels for your use case, or make other changes. You can combine different shapes in one image labeling project. Review the available customization options for each tag used in the templates:
- [Image](/tags/image.html) - This object tag configures how to load the image data.
- [Ellipse](/tags/ellipse.html) - This control tag displays controls for labeling the image. Use to create unlabeled ellipses.
- [EllipseLabels](/tags/ellipselabels.html) - This control tag displays controls for labeling the image. Use for labeled ellipses
- [Polygon](/tags/polygon.html) - This control tag displays controls for labeling the image. Use to create unlabeled polygons.
- [PolygonLabels](/tags/polygonlabels.html) - This control tag displays controls for labeling the image. Use for labeled polygons.
- [Rectangle](/tags/rectangle.html) - This control tag displays controls for labeling the image. Use to create unlabeled rectangles.
- [RectangleLabels](/tags/rectanglelabels.html) - This control tag displays controls for labeling the image. Use for labeled rectangles.
- [Labels](/tags/labels.html) - This control tag displays labels. Use with unlabeled control tags if combining multiple shapes in one labeling project.

### Account for your data format 
As you customize your labeling configuration, make sure that it aligns with your dataset. See the following examples to make sure that your labeling configuration and dataset format align: 
- [Import image data from cloud storage as BLOBs](/storage.html)
- [Import JSON files that reference cloud storage URLs](/tasks.html#Basic-Label-Studio-JSON-format)
- [Import locally-stored images](/tasks.html#Import-data-from-a-local-directory)

## Add data

After setting up your project, add your data. You can add image data in any of the following formats: `.bmp, .gif, .jpg, .png, .svg, .webp`.

It's best to import image data from cloud storage as BLOBs. Label Studio does not store a local copy of images synced from cloud or local storage. 
