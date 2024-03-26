---
title: Advanced labeling
short: Advanced labeling
tier: all
type: guide
order: 215
order_enterprise: 115
meta_title: Advanced labeling
section: "Labeling"
parent: "labeling"
parent_enterprise: "labeling"
date: 2024-02-29 14:41:51
---


## Add multiple types of regions to image annotations
You can add multiple types of regions to image annotations. You can add any of the following:
- Rectangles
- Ellipses
- Keypoints
- Polygons
- Brush masks

To add different types of regions to your image annotations, follow this example.

Create a custom template for your labeling interface using the following example:

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
    <Label value="building" background="green"></Label>
    <Label value="vehicle" background="blue"></Label>
  </Labels>
</View>
```
This example makes rectangles, ellipses, polygons, keypoints, and brush masks available to the annotator, along with image classification choices of yes and no, and region labels of building and vehicle.

## Faster image labeling
You can add a rectangle or an ellipse to your image with just two clicks, or double click to create a polygon, rectangle, or ellipse. 

If you accidentally select a point on an image while creating a polygon, just double click to remove the erroneous point and continue creating the region. There must be at least three points on the polygon to be able to remove a point.

## Create regions without labels
When you're annotating images, you can create regions without applying labels. 

1. Create a custom template using the example provided above under [Add multiple types of regions to image annotations](#Add-multiple-types-of-regions-to-image-annotations).
2. Select which tool you want to use in the labeling toolbar. You only need to do this for the first task. 
3. Create a region by double-clicking or clicking and dragging to create a bounding box, or click the points necessary to construct a polygon.
4. Select the created region in the sidebar or on the image.
5. Select the label that you want to apply to the region.
6. Repeat these steps for any regions that you want to create.

This can be helpful for two-step labeling, where you want one annotator to create regions and another annotator to label the regions. 


## Perform ML-assisted labeling with interactive preannotations

If you have a machine learning backend set up to [get interactive preannotations](ml.html#Get-interactive-preannotations), you can choose whether to use those predictions while you label. 

1. After you start labeling, you can enable **Auto-Annotation** to see and use the smart option to assign a label to draw a shape, mask, or assign a keypoint. After using the smart option to draw on an image, or labeling a text or HTML span, the ML backend returns predictions.  
2. For image labeling, you can choose whether to **Auto accept annotation suggestions** after you enable auto-annotation. If you automatically accept annotation suggestions, regions show up automatically and are immediately created. If you don't automatically accept suggestions, the regions appear, but you can reject or approve them manually, either individually or all at once. Predicted text regions are automatically accepted.