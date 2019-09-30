---
title: Polygon
type: tags
order: 405
---

Polygon is used to add polygons to an image

### Parameters

-   `name` **[string]** name of tag
-   `toname` **[string]** name of image to label
-   `opacity` **[number]** opacity of polygon (optional, default `0.6`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeColor` **[string]?** stroke color
-   `strokeWidth` **[number]** width of stroke (optional, default `1`)
-   `pointSize` **(small | medium | large)** size of polygon handle points (optional, default `medium`)
-   `pointStyle` **(rectangle | circle)** style of points (optional, default `rectangle`)

### Examples

```html
<View>
  <Polygon name="rect-1" toName="img-1" value="Add Rectangle"></Polygon>
  <Image name="img-1" value="$img"></Image>
</View>
```
