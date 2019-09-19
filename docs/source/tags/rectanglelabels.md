---
title: RectangleLabels
type: guide
order: 408
---

## RectangleLabels

RectangleLabels tag creates labeled rectangles

### Parameters

-   `name` **[string]** name of the element
-   `toname` **[string]** name of the image to label
-   `opacity` **float** opacity of rectangle (optional, default `0.6`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeColor` **[string]?** stroke color
-   `strokeWidth` **[number]** width of stroke (optional, default `1`)
-   `canRotate` **[boolean]** show or hide rotation handle (optional, default `true`)

### Examples

```html
<View>
  <RectangleLabels name="labels" toName="image">
    <Label value="Person"></Label>
    <Label value="Animal"></Label>
  </RectangleLabels>
  <Image name="image" value="$image"></Image>
</View>
```
