---
title: Image
type: tags
order: 304
meta_title: Image Tags for Images
meta_description: Label Studio Image Tags customize Label Studio for images for machine learning and data science projects.
---

Image tag shows an image on the page.
All the region numbers are percents of image original sizes — [0, 100]

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Value |
| [width] | <code>string</code> | <code>&quot;100%&quot;</code> | Image width |
| [maxWidth] | <code>string</code> | <code>&quot;750px&quot;</code> | Maximum image width |
| [zoom] | <code>boolean</code> | <code>false</code> | Enable zooming an image with the mouse wheel |
| [negativeZoom] | <code>boolean</code> | <code>false</code> | Enable zooming out an image |
| [zoomBy] | <code>float</code> | <code>1.1</code> | Scale factor |
| [grid] | <code>boolean</code> | <code>false</code> | Show grid |
| [gridSize] | <code>number</code> | <code>30</code> | Specify size of the grid |
| [gridColor] | <code>string</code> | <code>&quot;\&quot;#EEEEF4\&quot;&quot;</code> | Color of the grid, opacity is 0.15 |
| [zoomControl] | <code>boolean</code> | <code>false</code> | Show zoom controls in toolbar |
| [brightnessControl] | <code>boolean</code> | <code>false</code> | Show brightness control in toolbar |
| [contrastControl] | <code>boolean</code> | <code>false</code> | Show contrast control in toolbar |
| [rotateControl] | <code>boolean</code> | <code>false</code> | Show rotate control in toolbar |
| [crosshair] | <code>boolean</code> | <code>false</code> | – Show crosshair cursor |

### Example
```html
<View>
  <!-- Take the image url from the url column in JSON/CSV -->
  <Image name="image" value="$url" rotateControl="true" zoomControl="true"></Image>
</View>
```
