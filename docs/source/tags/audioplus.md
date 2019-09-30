---
title: AudioPlus
type: tags
order: 302
---

AudioPlus tag plays the audio and shows its wave making it available for region tagging

### Parameters

-   `name` **[string]** of the element
-   `value` **[string]** of the element
-   `zoom` **[boolean]** show the zoom slider (optional, default `true`)
-   `volume` **[boolean]** show the volume slider (optional, default `true`)
-   `speed` **[boolean]** show the speed slider (optional, default `true`)

### Examples

```html
<View>
  <Labels name="lbl-1" toName="audio-1">
    <Label value="Hello"></Label>
    <Label value="World"></Label>
  </Labels>
  <Rating name="rate-1" toName="audio-1"></Rating>
  <AudioPlus name="audio-1" value="$audio"></AudioPlus>
</View>
```
