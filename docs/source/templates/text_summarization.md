---
title: Text Summarization
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 206
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
  <Header value="Please read the text" />
  <Text name="text" value="$text" />

  <Header value="Provide one sentence summary" />
  <TextArea name="answer" toName="text"
            showSubmitButton="true" maxSubmissions="1" editable="true"
            required="true" />
</View>
```