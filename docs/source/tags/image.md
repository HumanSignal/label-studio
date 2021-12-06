---
title: Image
type: tags
order: 304
meta_title: Image Tags for Images
meta_description: Customize Label Studio with the Image tag to annotate images for computer vision machine learning and data science projects.
---

The Image tag shows an image on the page. Use for all image annotation tasks to display an image on the labeling interface.

Use with the following data types: images

When you annotate image regions with this tag, the annotations are saved as percentages of the original size of the image, from 0-100.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing a path or URL to the image |
| [width] | <code>string</code> | <code>&quot;100%&quot;</code> | Image width |
| [maxWidth] | <code>string</code> | <code>&quot;750px&quot;</code> | Maximum image width |
| [zoom] | <code>boolean</code> | <code>false</code> | Enable zooming an image with the mouse wheel |
| [negativeZoom] | <code>boolean</code> | <code>false</code> | Enable zooming out an image |
| [zoomBy] | <code>float</code> | <code>1.1</code> | Scale factor |
| [grid] | <code>boolean</code> | <code>false</code> | Whether to show a grid |
| [gridSize] | <code>number</code> | <code>30</code> | Specify size of the grid |
| [gridColor] | <code>string</code> | <code>&quot;\&quot;#EEEEF4\&quot;&quot;</code> | Color of the grid in hex, opacity is 0.15 |
| [zoomControl] | <code>boolean</code> | <code>false</code> | Show zoom controls in toolbar |
| [brightnessControl] | <code>boolean</code> | <code>false</code> | Show brightness control in toolbar |
| [contrastControl] | <code>boolean</code> | <code>false</code> | Show contrast control in toolbar |
| [rotateControl] | <code>boolean</code> | <code>false</code> | Show rotate control in toolbar |
| [crosshair] | <code>boolean</code> | <code>false</code> | – Show crosshair cursor |

### Example
```html
<!--Labeling configuration to display an image on the labeling interface-->
<View>
  <!-- Retrieve the image url from the url field in JSON or column in CSV -->
  <Image name="image" value="$url" rotateControl="true" zoomControl="true"></Image>
</View>
```
