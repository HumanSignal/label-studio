---
title: Polygon
type: tags
order: 417
meta_title: Polygon Tag for Adding Polygons to Images
meta_description: Customize Label Studio with the Polygon tag by adding polygons to images for segmentation machine learning and data science projects.
---

The `Polygon` tag is used to add polygons to an image without selecting a label. This can be useful when you have only one label to assign to the polygon. Use for image segmentation tasks.

Use with the following data types: image.

{% insertmd includes/tags/polygon.md %}

### Freehand drawing

When the `fflag_feat_front_polygon_freehand` feature flag is enabled, select the Polygon tool and press and drag to draw a contour with a mouse, pen, or primary touch. The contour is simplified when the pointer is released and is saved as one undoable polygon. The flag is off by default; with it disabled, the existing click-to-place behavior is unchanged.

### Example

Basic labeling configuration for polygonal image segmentation

```html
<View>
  <Polygon name="rect-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
