---
title: AudioPlus
type: guide
order: 302
---

AudioPlus tag plays audio and shows its wave

### Parameters

-   `name` **[string]** of the element
-   `value` **[string]** of the element
-   `hasZoom` **[boolean]** speficy if audio has zoom functionality
-   `regionBG` **[string]** region color
-   `selectedRegionBG` **[string]** selected region background

### Examples

```html
<View>
 <Labels name="lbl-1" toName="audio-1"><Label value="Hello"></Label><Label value="World"></Label></Labels>
 <Rating name="rate-1" toName="audio-1"></Rating>
 <AudioPlus name="audio-1" value="$audio"></AudioPlus>
</View>
```
