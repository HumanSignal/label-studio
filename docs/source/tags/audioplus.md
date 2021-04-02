---
title: AudioPlus
type: tags
order: 302
meta_title:
meta_description:
---

AudioPlus tag plays audio and shows its wave

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | value of the element |
| [volume] | <code>boolean</code> | <code>false</code> | show the volume slider (from 0 to 1) |
| [speed] | <code>boolean</code> | <code>false</code> | show the speed slider (from 0.5 to 3) |
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
