---
title: Machine Translation
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 207
meta_title: Machine Translation Data Labeling Template
meta_description: Template for providing translations of text with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/machine-translation.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to improve existing machine translation capabilities, you want to provide a dataset with robust and accurate translation examples. Use this template to read a text in one language and store a translation in another language.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

<!--Might need to remove preview if adding a number of rows doesn't make this work better due to outdated LSF-->

## Labeling Configuration

```html
<View>
    <!--Use styling on the View tag to place the two text samples side by side-->
  <View style="display: grid; grid-template: auto/1fr 1fr; column-gap: 1em">
      <!--Use the Header tag to provide instructions to the annotator-->
    <Header value="Read the text in English" />
    <Header value="Provide translation in Spanish" />
<!--Use the Text object tag to specify the text to be translated-->
  <Text name="english" value="$english" />
<!--Use the TextArea control tag to provide an editable, required text box to provide
a translation of the text, and include a Submit button for annotators-->
  <TextArea name="spanish" toName="english" transcription="true" 
            showSubmitButton="true" maxSubmissions="1" editable="true"
            required="true" rows="5"/>
  </View>
</View>
```

## Related tags

- [View](/tags/view.html)
- [Header](/tags/header.html)
- [Text](/tags/text.html)
- [TextArea](/tags/textarea.html)

