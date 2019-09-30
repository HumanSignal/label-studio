---
title: KeyPoint
type: tags
order: 407
---

KeyPoint is used to add a keypoint to an image

### Parameters

-   `name` **[string]** name of the element
-   `toname` **[string]** name of the image to label
-   `opacity` **float** opacity of rectangle (optional, default `0.9`)
-   `fillColor` **[string]** keypoint fill color (optional, default `8bad00`)
-   `strokeWidth` **[number]** width of the stroke (optional, default `1`)

### Examples

```html
<View>
  <KeyPoint name="rect-1" toName="img-1"></KeyPoint>
  <Image name="img-1" value="$img"></Image>
</View>
```
