---
title: Audio
type: guide
order: 301
---

Audio tag plays a simple audio file

### Parameters

-   `name` **[string]** of the element
-   `value` **[string]** of the element
-   `hotkey` **[string]** hotkey used to play/pause audio

### Examples

```html
<View>
  <Audio name="audio" value="$audio"></Audio>
</View>
```

```html
<!-- Audio classification -->
<View>
  <Audio name="audio" value="$audio"></Audio>
  <Choices name="ch" toName="audio">
    <Choice value="Positive"></Choice>
    <Choice value="Negative"></Choice>
  </Choices>
</View>
```

```html
<!-- Audio transcription -->
<View>
  <Audio name="audio" value="$audio"></Audio>
  <TextArea name="ta" toName="audio"></TextArea>
</View>
```
