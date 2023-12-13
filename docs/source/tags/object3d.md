---
title: Object3D
type: tags
order: 305
is_new: t
meta_title: Object3D Tags for Object3Ds
meta_description: Customize Label Studio with the Object3D tag to annotate object3ds for computer vision machine learning and data science projects.
---

The `Object3D` tag shows an object3d on the page. Use for all object3d annotation tasks to display an object3d on the labeling interface.

Use with the following data types: object3ds.

When you annotate object3d regions with this tag, the annotations are saved as percentages of the original size of the object3d, from 0-100.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing a path or URL to the object3d |
| [valueList] | <code>string</code> |  | References a variable that holds a list of object3d URLs |
| [smoothing] | <code>boolean</code> |  | Enable smoothing, by default it uses user settings |
| [width] | <code>string</code> | <code>&quot;100%&quot;</code> | Object3D width |
| [maxWidth] | <code>string</code> | <code>&quot;750px&quot;</code> | Maximum object3d width |
| [zoom] | <code>boolean</code> | <code>false</code> | Enable zooming an object3d with the mouse wheel |
| [negativeZoom] | <code>boolean</code> | <code>false</code> | Enable zooming out an object3d |
| [zoomBy] | <code>float</code> | <code>1.1</code> | Scale factor |
| [grid] | <code>boolean</code> | <code>false</code> | Whether to show a grid |
| [gridSize] | <code>number</code> | <code>30</code> | Specify size of the grid |
| [gridColor] | <code>string</code> | <code>&quot;#EEEEF4&quot;</code> | Color of the grid in hex, opacity is 0.15 |
| [zoomControl] | <code>boolean</code> | <code>false</code> | Show zoom controls in toolbar |
| [brightnessControl] | <code>boolean</code> | <code>false</code> | Show brightness control in toolbar |
| [contrastControl] | <code>boolean</code> | <code>false</code> | Show contrast control in toolbar |
| [rotateControl] | <code>boolean</code> | <code>false</code> | Show rotate control in toolbar |
| [crosshair] | <code>boolean</code> | <code>false</code> | Show crosshair cursor |
| [horizontalAlignment] | <code>left</code> \| <code>center</code> \| <code>right</code> | <code>left</code> | Where to align object3d horizontally. Can be one of "left", "center", or "right" |
| [verticalAlignment] | <code>top</code> \| <code>center</code> \| <code>bottom</code> | <code>top</code> | Where to align object3d vertically. Can be one of "top", "center", or "bottom" |
| [defaultZoom] | <code>auto</code> \| <code>original</code> \| <code>fit</code> | <code>fit</code> | Specify the initial zoom of the object3d within the viewport while preserving its ratio. Can be one of "auto", "original", or "fit" |
| [crossOrigin] | <code>none</code> \| <code>anonymous</code> \| <code>use-credentials</code> | <code>none</code> | Configures CORS cross domain behavior for this object3d, either "none", "anonymous", or "use-credentials", similar to [DOM `img` crossOrigin property](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/crossOrigin). |

### Example

Labeling configuration to display an object3d on the labeling interface

```html
<View>
  <!-- Retrieve the object3d url from the url field in JSON or column in CSV -->
  <Object3D name="object3d" value="$url" rotateControl="true" zoomControl="true"></Object3D>
</View>
```
### Example

Labeling configuration to perform multi-object3d segmentation

```html
<View>
  <!-- Retrieve the object3d url from the url field in JSON or column in CSV -->
  <Object3D name="object3d" valueList="$object3ds" rotateControl="true" zoomControl="true"></Object3D>
</View>
<!-- {
  "data": {
    "object3ds": [
      "https://object3ds.unsplash.com/photo-1556740734-7f3a7d7f0f9c?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80",
      "https://object3ds.unsplash.com/photo-1556740734-7f3a7d7f0f9c?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80",
    ]
  }
} -->
```
