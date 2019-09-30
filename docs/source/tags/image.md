---
title: Image
type: tags
order: 303
---

Image tag shows an image on the page

### Parameters

-   `name` **[string]** name of the element
-   `value` **[string]** value
-   `width` **[string]** image width (optional, default `100%`)
-   `maxWidth` **[string]** image maximum width (optional, default `750px`)
-   `zoom` **[boolean]** enable zooming an image by the mouse wheel (optional, default `false`)
-   `negativeZoom` **[boolean]**  enable zooming out an image (optional, default `false`)
-   `zoomBy` **[float]** scale factor (optional, default `1.1`)
-   `grid` **[boolean]** show grid (optional, default `false`)
-   `gridSize` **[number]** size of the grid (optional, default `30`)
-   `gridColor` **[string]** color of the grid, opacity is 0.15 (optional, default `#EEEEF4`)

### Examples

```html
<View>
  <Image value="$url"></Image>
</View>
```

```html
<View>
  <Image value="https://imgflip.com/s/meme/Leonardo-Dicaprio-Cheers.jpg" zoom="true" grid="true"></Image>
</View>
```
