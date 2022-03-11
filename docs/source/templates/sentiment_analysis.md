---
title: Sentiment Analysis Text Classification
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 202
meta_title: Sentiment Analysis Data Labeling Template
meta_description: Template for classifying the sentiment of text with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/text-classification.png" alt="" class="gif-border" width="552px" height="408px" />

Classify the sentiment of text using this template. For example, if you want to classify the sentiment of reviews of musical instruments for sale on an online retailer.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration 

```html
<View>
  <Header value="Choose text sentiment:"/>
  <Text name="my_text" value="$reviewText"/>
  <Choices name="sentiment" toName="my_text" choice="single" showInline="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
  </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Choose text sentiment:"/>
```

Use the [Text](/tags/text.html) object tag to display the text to be classified:
```xml
<Text name="my_text" value="$reviewText"/>
```

Use the [Choices](/tags/choices.html) control tag to provide the classification options to annotators, allow them to only select one option, and display the choices in one line:
```xml
<Choices name="sentiment" toName="my_text" choice="single" showInline="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
</Choices>
```

## Enhance this template

### Multi-classification

You can use styling to visually separate different classification options to provide annotators a multi-classification task for text.

For example, wrap the individual choice options for a single [Choices](/tags/choices.html) control tag in [View](/tags/view.html) tags that adjust the styling, and add [Header](/tags/header.html) tags to each section to visually separate the choices on the interface, while still storing all choices with the text sample in the annotations:
```xml
  <Choices name="sentiment" toName="text" choice="multiple">
    <View style="display: flex; justify-content: space-between">
      <View style="width: 50%">
        <Header value="Select Topics" />
        <Choice value="Politics"/>
    	<Choice value="Business"/>
    	<Choice value="Sport"/>
      </View>
      <View>
        <Header value="Select Moods" />
        <Choice value="Cheerful"/>
    	<Choice value="Melancholy"/>
    	<Choice value="Romantic"/>
      </View>
    </View>
  </Choices>
```

## Related tags
- [Text](/tags/text.html)
- [Choices](/tags/choices.html)
- [Choice](/tags/choice.html)
- [View](/tags/view.html)
- [Header](/tags/header.html)


