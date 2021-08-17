---
title: AudioPlus
type: tags
order: 302
meta_title:
meta_description:
---

AudioPlus tag plays audio and shows its waveform.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Value of the element |
| [volume] | <code>boolean</code> | <code>false</code> | Whether to show a volume slider (from 0 to 1) |
| [speed] | <code>boolean</code> | <code>false</code> | Whether to show a speed slider (from 0.5 to 3) |
| [zoom] | <code>boolean</code> | <code>true</code> | Whether to show the zoom slider |
| [hotkey] | <code>string</code> |  | Hotkey used to play or pause audio |

### Example
```html
<View>
  <Labels name="lbl-1" toName="audio-1">
    <Label value="Guitar" />
    <Label value="Drums" />
  </Labels>
  <Rating name="rate-1" toName="audio-1" />
  <AudioPlus name="audio-1" value="$audio" />
</View>
```
