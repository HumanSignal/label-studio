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
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | value |
| [width] | <code>string</code> | <code>&quot;100%&quot;</code> | image width |
| [maxWidth] | <code>string</code> | <code>&quot;750px&quot;</code> | image maximum width |
| [zoom] | <code>boolean</code> | <code>false</code> | enable zooming an image by the mouse wheel |
| [negativeZoom] | <code>boolean</code> | <code>false</code> | enable zooming out an image |
| [zoomBy] | <code>float</code> | <code>1.1</code> | scale factor |
| [grid] | <code>boolean</code> | <code>false</code> | show grid |
| [gridSize] | <code>number</code> | <code>30</code> | size of the grid |
| [gridColor] | <code>string</code> | <code>&quot;\&quot;#EEEEF4\&quot;&quot;</code> | color of the grid, opacity is 0.15 |
| [zoomControl] | <code>boolean</code> | <code>false</code> | show zoom controls in toolbar |
| [brightnessControl] | <code>boolean</code> | <code>false</code> | show brightness control in toolbar |
| [contrastControl] | <code>boolean</code> | <code>false</code> | show contrast control in toolbar |
| [rotateControl] | <code>boolean</code> | <code>false</code> | show rotate control in toolbar |

### Example
```html
<View>
  <!-- Take the image url from the url column in JSON/CSV -->
  <Image value="$url"></Image>
</View>
```
### Example
```html
<View>
  <Image value="https://imgflip.com/s/meme/Leonardo-Dicaprio-Cheers.jpg" width="100%" maxWidth="750px" />
</View>
```
