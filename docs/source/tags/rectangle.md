---
title: Rectangle
type: tags
order: 407
---

Rectangle is used to add rectangle (BBox) to an image

### Parameters

-   `name` **[string]** name of the element
-   `toname` **[string]** name of the image to label
-   `opacity` **float** opacity of rectangle (optional, default `0.6`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeColor` **[string]** stroke color (optional, default `#f48a42`)
-   `strokeWidth` **[number]** width of the stroke (optional, default `1`)
-   `canRotate` **[boolean]** show or hide rotation handle (optional, default `true`)

### Examples

```html
<View>
  <Rectangle name="rect-1" toName="img-1"></Rectangle>
  <Image name="img-1" value="$img"></Image>
</View>
```
