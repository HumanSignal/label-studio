---
title: AudioPlus
type: tags
order: 302
---

AudioPlus tag plays the audio and shows its wave making it available for region tagging

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | value of the element |
| [volume] | <code>boolean</code> | <code>true</code> | show the volume slider (from 0 to 1) |
| [speed] | <code>boolean</code> | <code>true</code> | show the speed slider (from 0.5 to 3) |
| [zoom] | <code>boolean</code> | <code>true</code> | show the zoom slider |
| [hotkey] | <code>string</code> |  | hotkey used to play/pause audio |

### Example  
```html
<View>
  <Labels name="lbl-1" toName="audio-1">
    <Label value="Hello" />
    <Label value="World" />
  </Labels>
  <Rating name="rate-1" toName="audio-1" />
  <AudioPlus name="audio-1" value="$audio" />
</View>
```
