---
title: Object Detection with Bounding Boxes
type: templates
category: Computer Vision
cat: computer-vision
order: 110
meta_title: Image Object Detection Data Labeling Template
meta_description: Template for performing object detection with rectangular bounding boxes with Label Studio for your machine learning and data science projects.
---


If you want to perform object detection, you need to create a labeled dataset. Use the following template to add rectangular bounding boxes to images, and label the contents of the bounding boxes.

<a href="https://app.humansignal.com/b/gCS4-aPiMkpbbuRGoI6D6SULvsim6bZr"
  target="_blank" rel="noopener" aria-label="Open in Label Studio" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgb(109,135,241);padding:8px 12px;background:rgb(87 108 193);color:white;font-weight:500;font-family:sans-serif;gap:6px;transition:background 0.2s ease;" onmouseover="this.style.background='rgb(97 122 218)'" onmouseout="this.style.background='rgb(87 108 193)'">
  <svg style="width:20px;height:20px" viewBox="0 0 26 26" fill="none"><path fill="none" d="M3.5 4.5h19v18h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.7 7.503h-7.087V5.147H7.588V2.792h11.025V.436H25.7v7.067Zm-18.112 0H5.225v10.994H2.863V7.503H.5V.436h7.088v7.067Zm0 18.061v-7.067H.5v7.067h7.088ZM25.7 18.497v7.067h-7.088v-2.356H7.588v-2.355h11.025v-2.356H25.7Zm-2.363 0V7.503h-2.363v10.994h2.363Z" fill="white"/></svg>
  <span style="font-size:14px">Open in Label Studio</span>
  <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" fill="white"/></svg>
</a>

<br>
<img src="/images/templates/object-detection-with-bounding-boxes.png" alt="" class="gif-border" width="552px" height="408px" />

<i>Figure 1: Object detection with bounding boxes.</i>

## Rotation and anchor point

Note that when you rotate rectangles (bounding boxes), the anchor point is different depending on how you perform the rotation.

### Bounding box rotation in Label Studio UI

If you rotate a bounding box using your mouse in the labeling interface, the rotation anchor point is the **center** of the rectangle.

![Diagram showing mouse rotation](../images/rectangle_ui_rotation.jpg)

### Bounding box rotation in the Label Studio results

If you rotate by directly editing the rotation angle under the **Info** panel of the labeling interface, the rotation anchor point is the **top left** of the rectangle. This is also how it is saved in the Label Studio `annotation.result[]['value']` (regardless of how you performed the rotation): 

```json
 { 
  "x": 50,  # top left corner of the bounding box from 0 to 100% of the image width
  "y": 60,  # top left corner of the bounding box from 0 to 100% of the image height
  "width": 10,  # width of the bounding box from 0 to 100% of the image width
  "height": 20,  # height of the bounding box from 0 to 100% of the image height
  "rotation": 45  # rotation angle in degrees around the top left corner of the bounding box
}
```

![Diagram showing result rotation](../images/rectangle_db_rotation.jpg)

## Create a rotated bounding box

As an annotator, you can create a rotated bounding box with the "three point click" or "two point click" feature to annotate images.  

  - First point click - Starting point of the location to draw the bounding box.
  - Second point click - Define the rotation and width of the bounding box.
  - Third point click - Draw the height of the bounding box.

!!! note
    The three-point click action is only available when using the `<Rectangle>` tag. It is not available for `<RectangleLabels>`. 

The origin anchor `0,0` is placed with the first click, similar to the basic bounding box. The second anchor will indicate the angle of the edge for `0,1` and the width of the bounding box. The third and final anchor `1,1` will determine the height or final dimension of the bounding box. Three clicks is required to create a rotated bounding box.

1. **Starting point of the location to draw the bounding box**: With a tag selected and mouse on canvas, on-click to place first anchor `0,0` anywhere on the canvas.


!!! note 
    - The Canvas guides will indicate the orientation and location for the x-axis and y-axis of the crosshair cursor.
    - Bounding box label indicates the top and center of the box being created within the canvas. It does not indicate the orientation.

2. **Define the rotation and width of the bounding box**: Move the mouse to the location to place the second anchor.

!!! note 
    The canvas guides will show you where the cursor is and also indicates the orientation.

To complete the top edge of the box, `click` and `release` to place the second cursor.

3. **Draw the height of the bounding box**: Again, move the cursor to place the final anchor of the bounding box and complete the creation flow. Now, the bottom edge of the bounding box will follow the cursor to illustrate the height.

4. **Select and rotate the rectangle**: Now, you can select and rotate the rectangle without moving the cursor. 

After the box has been completed it will remain in selected state, unless determined otherwise.


  <br>
  <div style="margin:auto; text-align:center;"><img src="/images/two-point-click.png" style="opacity: 0.8"/></div>
  <i>Figure 2: Two point click rectangle.</i>

    
  <br>
  <div style="margin:auto; text-align:center;"><img src="/images/three-point-click.png" style="opacity: 0.8"/></div>
  <i>Figure 3: Three point click rectangle.</i>

  After you create the bounding box, you can do the following: 
    - Adjust it by moving the anchors or edges to the desired location on the canvas.
    - Determine that the orientation of the bounding box is effected.
    - See the orientation of the bounding box and determine the direction during the creation process.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Image](/tags/image.html) object tag to specify the image to label:
```xml
<Image name="image" value="$image"/>
```
  
Use the [RectangleLabels](/tags/rectanglelabels.html) control tag to add labels and rectangular bounding boxes to your image at the same time. Use the [Label](/tags/label.html) tag to control the color of the boxes:
```xml
  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>
```

## Enhance this template

### Add descriptions to detected objects

If you want to add further context to object detection tasks with bounding boxes, you can add some **per-region** conditional labeling parameters to your labeling configuration. 

For example, to prompt annotators to add descriptions to detected objects, you can add the following to your labeling configuration:
```xml
  <View visibleWhen="region-selected">
    <Header value="Describe object" />
    <TextArea name="answer" toName="image" editable="true"
              perRegion="true" required="true" />
    <Choices name="choices" toName="image"
             perRegion="true">
      <Choice value="Correct"/>
      <Choice value="Broken"/>
    </Choices>
  </View>
```
The `visibleWhen` parameter of the [View](/tags/view.html) tag hides the description prompt from annotators until a bounding box is selected. 

After the annotator selects a bounding box, the [Header](/tags/header.html) appears and provides instructions to annotators.

The [TextArea](/tags/textarea.html) control tag displays an editable text box that applies to the selected bounding box, specified with the `perRegion="true"` parameter. You can also add a `placeholder` parameter to provide suggested text to annotators. 

In addition, you can prompt annotators to provide additional feedback about the content of the bounding box, such as the status of the item in the box, using the [Choices](/tags/choices.html) tag with the `perRegion` parameter.

## Related tags

- [Image](/tags/image.html)
- [RectangleLabels](/tags/rectanglelabels.html)
- [Rectangle](/tags/rectangle.html)
- [Label](/tags/label.html)
