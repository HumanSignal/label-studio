---
title: Vector - Beta 🧪
short: Vector 🧪
type: tags
order: 430
meta_title: Vector Tag for Adding Vectors to Images
meta_description: Use the Vector tag by adding vectors to images for segmentation machine learning and data science projects.
---

The `Vector` tag is used to add vectors to an image without selecting a label. This can be useful when you have only one label to assign to the vector. 

Use with the following data types: image.

![Screenshot](/images/tags/vector.png)

## Path and point basics

| Action                      | Instruction |
|------------------------------|-------------|
| **Add points**               | Click on empty space. |
| **Add points to path segments** | Press <code>Shift</code> while clicking on a segment that is between two points. |
| **End or exit the path**     | Press <code>Esc</code> or click on the last point you added to the path. |
| **Move points**              | <ul><li>If you are actively creating the path, simply backtrack and click a point and drag to reposition.</li><li>If you have already exited the path, first select it again and then click an existing point to drag.</li></ul> |
| **Delete points**            | Press <code>Alt</code> or <code>Option</code> and click on an existing point. |

!!! note
    <span id="region-note">Several options require you to complete the path and then re-select it as a region.</span> 
    
    To do this, you must first exit the path and then reselect it by clicking on a segment within the path or by clicking it under the **Regions** panel. 

    Selected paths are highlighted red. For this reason, you should avoid red when choosing label colors for your vector paths.


## Advanced

### Multi-select

With multi-select, you can drag multiple points to reposition or rotate them. 

![Screenshot](/images/tags/vector-multi.png)

| Action                   | Instruction |
|---------------------------|-------------|
| **Select multiple points** | <ul><li>To select all points in the path, press <code>Cmd</code> or <code>Ctrl</code> and then click any point in the path.</li><li>To select individual points in a path, first select the path as a region (<a href="#region-note">see the note above</a>). Then press <code>Cmd</code> or <code>Ctrl</code> as you click points.</li></ul> |
| **Transform selection**   | Use transformer handles for rotation, scaling, and translation |
| **Clear selection**       | Click on any point or press <code>Esc</code>. | 


### Bézier curves

To use Bezier curves, you must enable them using the `curves="true"` parameter in your labeling configuration. Control points are shown when editing bezier points.

![Screenshot](/images/tags/vector-bezier.png)

| Action                 | Instruction                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| **Create a curve**      | As you click to add a point, hold while dragging your cursor.               |
| **Create a new curve point** | Press `Shift` while dragging a control point.                          |
| **Adjust a curve**      | First exit the path and then [re-select it as a region](#region-note). Then you can click and drag control points. |
| **Convert a point to a curve**| Press `Shift` and click the point once. |
| **Asymmetric curves**   | By default, the control points move in sync. To create asymmetric curves (only move one control point), press `Alt` or `Option` before clicking the control point. |

### Closed paths

You can create closed paths to create polygon shapes. To create closed paths, use the `closable="true"` parameter in your labeling configuration. 

![Screenshot](/images/tags/vector-closed.png)

| Action                 | Instruction                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| **Break closed path**   | Press `Alt` or `Option` and click on a segment in a closed path to reopen it.       |


### Skeleton

You can create skeleton vectors using the `skeleton="true"` parameter in your labeling configuration. 

When enabled, new points connect to the active point and not the last added point. 

![Screenshot](/images/tags/vector-skeleton.png)

## Tag parameters

{% insertmd includes/tags/vector.md %}

## Example

Basic labeling configuration for vector image segmentation

```html
<View>
    <Vector name="line-1" toName="img-1" />
    <Image name="img-1" value="$img" />
</View>
```

### Result parameters

**Kind**: global typedef  
**Returns**: <code>VectorRegionResult</code> - The serialized vector region data in Label Studio format  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| original_width | <code>number</code> | width of the original image (px) |
| original_height | <code>number</code> | height of the original image (px) |
| image_rotation | <code>number</code> | rotation degree of the image (deg) |
| value | <code>Object</code> |  |
| value.vertices | <code>Array.&lt;Object&gt;</code> | array of point objects with coordinates, bezier curve information, and point relationships |
| value.closed | <code>boolean</code> | whether the vector is closed (polygon) or open (polyline) |

#### Example results JSON export

```json
{
  "original_width": 1920,
  "original_height": 1280,
  "image_rotation": 0,
  "value": {
    "vertices": [
      { "id": "point-1", "x": 25.0, "y": 30.0, "prevPointId": null, "isBezier": false },
      { "id": "point-2", "x": 75.0, "y": 70.0, "prevPointId": "point-1", "isBezier": true,
        "controlPoint1": {"x": 50.0, "y": 40.0}, "controlPoint2": {"x": 60.0, "y": 60.0} }
    ],
    "closed": false
  }
}
```
