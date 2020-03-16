---
title: Audio
type: tags
order: 301
---

Audio tag plays a simple audio file

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of the element |
| value | <code>string</code> | value of the element |
| hotkey | <code>string</code> | hotkey used to play/pause audio |

### Example  
```html
<View>
  <Audio name="audio" value="$audio" />
</View>
```
### Example  

Audio classification

```html
<View>
  <Audio name="audio" value="$audio" />
  <Choices name="ch" toName="audio">
    <Choice value="Positive" />
    <Choice value="Negative" />
  </Choices>
</View>
```
### Example

Audio transcription

```html
<View>
  <Audio name="audio" value="$audio" />
  <TextArea name="ta" toName="audio" />
</View>
```
