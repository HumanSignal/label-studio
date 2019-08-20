---
title: Image
type: guide
order: 303
---

Image tag shows an image on the page

### Parameters

-   `name` **[string]** name of the element
-   `value` **[string]** value
-   `width` **[string]** image width (optional, default `100%`)
-   `maxWidth` **[string]** image maximum width (optional, default `750px`)

### Examples

```html
<View>
  <Image value="$url"></Image>
</View>
```

```html
<View>
  <Image value="https://imgflip.com/s/meme/Leonardo-Dicaprio-Cheers.jpg" width="100%" maxWidth="750px"></Image>
</View>
```
