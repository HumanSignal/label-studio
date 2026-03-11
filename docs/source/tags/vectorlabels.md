---
title: VectorLabels
short: VectorLabels
type: tags
order: 433
meta_title: Vector Label Tag for Labeling Vectors in Images
meta_description: Use the VectorLabels tag and label vectors in images for semantic segmentation machine learning and data science projects.
---

The `VectorLabels` tag is used to create labeled vectors. 

Use with the following data types: image.

![Screenshot](/images/tags/vector.png)

## Path and point basics

| Action                      | Instruction |
|------------------------------|-------------|
| **Add points**               | Click on empty space. |
| **Add points to path segments** | Press <code>Shift</code> while clicking on a segment that is between two points. |
| **End or exit the path**     | Press <code>Esc</code> or double-click on the last point you added to the path. |
| **Move points**              | Simply click a point and drag to reposition. |
| **Delete points**            | Press <code>Alt</code> or <code>Option</code> and click on an existing point. |

!!! note
    <span id="region-note">Several options require you to complete the path and then re-select it as a region.</span> 
    
    The easiest way to handle this is to enable **Select region after creating it** in your labeling settings (found below the labeling interface in the labeling stream and Quick View). 
    
    You can also first exit the path and then reselect it by clicking on a segment within the path or by clicking it under the **Regions** panel. 

    Selected paths are highlighted red. For this reason, you should avoid red when choosing label colors for your vector paths.


## Advanced

### Multi-select

With multi-select, you can drag multiple points to reposition or resize them. 

<video style="max-width: 600px;" class="gif-border" autoplay loop muted>
      <source src="/images/tags/vector-move.mp4">
</video>

| Action                   | Instruction |
|---------------------------|-------------|
| **Select multiple points** | <ul><li>To select all points in the path, press <code>Cmd</code> or <code>Ctrl</code> and then click any point in the path.</li><li>To select individual points in a path, first select the path as a region (<a href="#region-note">see the note above</a>). Then press <code>Cmd</code> or <code>Ctrl</code> as you click points.</li></ul> |
| **Select multiple paths** | Use the move tool (the arrow) to click and drag multiple paths/shapes. |
| **Resize multiple paths** | Use the move tool (the arrow) to select multiple paths and then click and drag points in the selection box |
| **Clear selection**       | Click on any point or press <code>Esc</code>. | 

### Closed paths

You can create closed paths to create polygon shapes. To create closed paths, use the `closable="true"` parameter in your labeling configuration. 

![Screenshot](/images/tags/vector-closed.png)

| Action                 | Instruction                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| **Close the path**   | Double-click on your final point. This automatically adds a segment between your first point and final point.      |
| **Break closed path**   | Press `Alt` or `Option` and click on a vector segment in a closed path to reopen it.  Click on a point to delete the point.      |

### Skeleton

You can create skeleton vectors using the `skeleton="true"` parameter in your labeling configuration. 

When enabled, new points connect to the active point and not the last added point. 

![Screenshot](/images/tags/vector-skeleton.png)


## Usage examples

### Basic vector path

```html
<View>
 <Image name="image" value="$image" />
 <VectorLabels name="labels" toName="image">
   <Label value="Road" />
   <Label value="Boundary" />
 </VectorLabels>
</View>
```

### Closed polygon 

```html
<View>
 <Image name="image" value="$image" />
 <VectorLabels
   name="polygons"
   toName="image"
   closable="true"
   minPoints="3"
   maxPoints="20"
 >
   <Label value="Building" />
   <Label value="Park" />
 </VectorLabels>
</View>
```

### Skeleton mode for branching paths

```html
<View>
 <Image name="image" value="$image" />
 <VectorLabels
   name="skeleton"
   toName="image"
   skeleton="true"
   closable="false"
 >
   <Label value="Tree" />
   <Label value="Branch" />
 </VectorLabels>
</View>
```


### Keypoint annotation tool

```html
<View>
 <Image name="image" value="$image" />
 <VectorLabels
   name="keypoints"
   toName="image"
   closable="false"
   minPoints="1"
   maxPoints="1"
 >
   <Label value="Eye" />
   <Label value="Nose" />
   <Label value="Mouth" />
 </VectorLabels>
</View>
```

### Point-constrained drawing

```html
<View>
 <Image name="image" value="$image" />
 <VectorLabels
   name="constrained"
   toName="image"
   closable="true"
   snap="pixel"
   minPoints="4"
   maxPoints="12"
 >
   <Label value="Region" />
 </VectorLabels>
</View>
```

## Tag parameters

{% insertmd includes/tags/vectorlabels.md %}


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
| value.vectorlabels | <code>Array.&lt;string&gt;</code> | array of label names assigned to this vector |

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
    "closed": false,
    "vectorlabels": ["Road"]
  }
}
```