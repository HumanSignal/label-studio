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

You can enhance this template in many ways.

### Perform multi-classification

You can use styling to visually separate different classification options to provide annotators a multi-classification task for text.

For example, wrap the individual choice options for a single [Choices](/tags/choices.html) control tag in [View](/tags/view.html) tags that adjust the styling:
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
Add [Header](/tags/header.html) tags to each section to visually separate the choices on the interface, while still storing all choices with the text sample in the annotations.

### Combine multiple types of labeling in three columns

You can also perform other types of labeling in addition to text classification as part of one labeling task. In this example, you can create a three column view on the labeling interface, with the text sample to annotate in the center column and classification choices and named entity recognition labels in the other columns. Because tags in a labeling configuration are rendered in order, the order of the elements specifies which column each content appears within.

Start by adding styling to the [View](/tags/view.html) tag for the labeling configuration to flex the display:
```xml
<View style="display: flex;">
```

Then use styling with a new [View](/tags/view.html) tag to create a column for the named entity recognition labels:
```xml
  <View style="width: 150px; padding: 0 1em; margin-right: 0.5em; background: #f1f1f1; border-radius: 3px">    
    <Labels name="label" toName="text">
      <Label value="Person" />
      <Label value="Organization" />
    </Labels>
  </View>
```

Specify the [Text](/tags/text.html) object tag in another set of [View](/tags/view.html) tags to place it in the center column. 
```xml
  <View>
    <Text name="text" value="$text" />
  </View>
```

Then create a third column with a [View](/tags/view.html) tag to display the available [Choices](/tags/choices.html) for classification, including a [Header](/tags/header.html) to provide guidance to annotators:
```xml
  <View style="padding: 0 1em; margin-left: 0.5em; background: #f1f1f1; border-radius: 3px">
    <Choices name="importance" toName="text">
      <Header value="Text Importance" />
      <Choice value="High" />
      <Choice value="Medium" />
      <Choice value="Low" />
    </Choices>
  </View>
```

Don't forget to close the original [View](/tags/view.html) tag:
```xml
</View>
```

## Related tags
- [Text](/tags/text.html)
- [Choices](/tags/choices.html)
- [Choice](/tags/choice.html)
- [View](/tags/view.html)
- [Header](/tags/header.html)

## Related templates
- [Named Entity Recognition](named_entity.html)
- [Image Classification](image_classification.html)
- [Slot Filling and Intent Classification](slot_filling.html)
