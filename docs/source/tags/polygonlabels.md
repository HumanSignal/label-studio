---
title: PolygonLabels
type: tags
order: 406
---

PolygonLabels tag, create labeled polygons

### Parameters

-   `name` **[string]** name of tag
-   `toname` **[string]** name of image to label
-   `opacity` **[number]** opacity of polygon (optional, default `0.6`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeColor` **[string]?** stroke color
-   `strokeWidth` **[number]** width of stroke (optional, default `1`)
-   `pointSize` **(small | medium | large)** size of polygon handle points (optional, default `medium`)
-   `pointStyle` **(rectangle | circle)** style of points (optional, default `rectangle`)
-   `choice` **(single | multiple)** configure if you can select just one or multiple labels (optional, default `single`)
-   `showInline` **[boolean]** show labels in the same visual line (optional, default `false`)

### Examples

```html
<View>
  <Image name="image" value="$image"></Image>
  <PolygonLabels name="lables" toName="image">
    <Label value="Car"></Label>
    <Label value="Sign"></Label>
  </PolygonLabels>
</View>
```
