---
title: KeypointLabels
type: tags
order: 408
---

KeyPointLabels tag creates labeled keypoints

### Parameters

-   `name` **[string]** name of the element
-   `toname` **[string]** name of the image to label
-   `opacity` **float** opacity of rectangle (optional, default `0.9`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeWidth` **[number]** width of stroke (optional, default `1`)
-   `choice` **(single | multiple)** configure if you can select just one or multiple labels (optional, default `single`)
-   `showInline` **[boolean]** show labels in the same visual line (optional, default `false`)

### Examples

```html
<View>
  <KeyPointLabels name="labels" toName="image">
    <Label value="Person"></Label>
    <Label value="Animal"></Label>
  </KeyPointLabels>
  <Image name="image" value="$image"></Image>
</View>
```
