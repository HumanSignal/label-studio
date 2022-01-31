---
title: Machine Translation
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 207
meta_title: Machine Translation Data Labeling Template
meta_description: Template for providing translations of text with Label Studio for your machine learning and data science projects.
---

If you want to improve existing machine translation capabilities, you want to provide a dataset with robust and accurate translation examples. Use this template to read a text in one language and store a translation in another language.

<div id="main-preview"></div>

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

## Related tags

- [Header](/tags/header.html)
- [Text](/tags/text.html)
- [TextArea](/tags/textarea.html)

