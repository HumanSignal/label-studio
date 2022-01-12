---
title: Machine Translation
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 207
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
  <View style="display: grid; grid-template: auto/1fr 1fr; column-gap: 1em">
    <Header value="Read the text in English" />
    <Header value="Provide translation in Spanish" />

  <Text name="english" value="$english" />

  <TextArea name="spanish" toName="english" transcription="true"
            showSubmitButton="true" maxSubmissions="1" editable="true"
            required="true"/>
  </View>
</View>
```