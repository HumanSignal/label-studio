---
title: Text Summarization
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 206
meta_title: Text Summarization Data Labeling Template
meta_description: Template for summarizing text with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/text-summarization.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to build a machine learning model to summarize text, use this template to create a dataset of one sentence summaries of text samples. You can also customize this template to ask for different types or lengths of summaries. 

## Interactive Template Preview

<div id="main-preview"></div>

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

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Please read the text" />
```

Use the [Text](/tags/text.html) object tag to display text:
```xml
<Text name="text" value="$text" />
```

Use the [TextArea](/tags/textarea.html) control tag to provide a text box with a submit button that annotators must type a summary into and can edit their responses:
```xml
  <TextArea name="answer" toName="text"
            showSubmitButton="true" maxSubmissions="1" editable="true"
            required="true" />
```

## Enhance this template

There are many ways to enhance this template.

### Display text box next to the text to summarize

If you want to display the text box next to the text to summarize, do the following:

1. Add flex display styling to the [View](/tags/view.html) tag for the labeling configuration: `<View style="display: flex;">`
2. Add new [View](/tags/view.html) tags to wrap the [Header](/tags/header.html) and the [Text](/tags/text.html) sample so that they display on the left.
3. Wrap the [TextArea](/tags/textarea.html) and [Header](/tags/header.html) tags in [View](/tags/view.html) tags with the following CSS styling so that they display neatly on the right:
```xml
<View style="width: 50%; padding-right: 2em; margin-left: 2em;">
```
Your fully enhanced labeling configuration looks like the following:
```xml
<View style="display: flex;">
  <View>
    <Header value="Please read the text" />
    <Text name="text" value="$text" />
  </View>
  <View style="width: 50%; padding-right: 2em; margin-left: 2em;">
    <Header value="Provide one sentence summary" />
    <TextArea name="answer" toName="text"
              showSubmitButton="true" maxSubmissions="1" editable="true"
              required="true" />
  </View>
```

### Display long text samples with a scrollbar

If you want to change how Label Studio displays long text samples on the labeling interface, you can use the [View](/tags/view.html) tags to wrap labeling tags with CSS styling. 

For example, you can constrain the text sample to a specific height, making it easier to keep the text summary that annotators provide visible.
```xml
<View style="height: 300px; overflow: auto;">
    <Text name="text" value="$longText" />
</View>
```

In this case, the entire labeling configuration looks like the following:
```xml
<View>
  <Header value="Please read the text" />
  <View style="height: 300px; overflow: auto;">
    <Text name="text" value="$longText" />
  </View>
  <Header value="Provide one sentence summary" />
  <TextArea name="answer" toName="text" 
            showSubmitButton="true" maxSubmissions="1" editable="true" 
            required="true" />
</View>
```

## Related tags

- [Header](/tags/header.html)
- [Text](/tags/text.html)
- [TextArea](/tags/textarea.html)
