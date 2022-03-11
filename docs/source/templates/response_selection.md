---
title: Response Selection
type: templates
category: Conversational AI
cat: conversational-ai
order: 402
meta_title: Response Selection Data Labeling Template
meta_description: Template for selecting relevant responses for conversational AI use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/response-selection.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to refine the best response for a conversational AI use case, you can provide already-generated responses to annotators and have them choose the best one. 

Use this template to provide a section of dialogue and three text responses to the dialogue. Annotators then select the choice that corresponds with the best-fitting text response. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>  
  <Paragraphs name="prg" value="$dialogue" layout="dialogue" />
  <Header value="Choose a response" />
  <View style="display: flex">
    <View>
    <Text name="resp1" value="$respone" />
    <Text name="resp2" value="$resptwo" />
    <Text name="resp3" value="$respthree" />
    </View>
    <View style="padding: 50px;">
    <Choices name="resp" toName="prg" required="true">
      <Choice value="One" />
      <Choice value="Two" />
  	  <Choice value="Three" />
    </Choices>
    </View>
  </View>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Paragraphs](/tags/paragraphs.html) object tag to display dialogue to annotators:
```xml
<Paragraphs name="prg" value="$dialogue" layout="dialogue" />
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Choose a response" />
```

Use a new [View](/tags/view.html) tag to control the dsiplay of text and choices on the labeling interface:
```xml
  <View style="display: flex">
```

Use the [Text](/tags/text.html) object tag to display 3 different text samples, specified with variables in the `value` parameter:
```xml
<View>
    <Text name="resp1" value="$respone" />
    <Text name="resp2" value="$resptwo" />
    <Text name="resp3" value="$respthree" />
</View>
```

Style the [View](/tags/view.html) tag that wraps the choices to make sure there is space between the text samples and the corresponding choices:
```xml
    <View style="padding: 50px;">
    <Choices name="resp" toName="prg" required="true">
      <Choice value="One" />
      <Choice value="Two" />
  	  <Choice value="Three" />
    </Choices>
    </View>
```
Use the [Choices](/tags/choices.html) control tag to allow annotators to choose which text sample is the best response to the dialogue.

## Related Tags

- [Paragraphs](/tags/paragraphs.html)
- [Header](/tags/header.html)
- [View](/tags/view.html)
- [Text](/tags/text.html)
- [Choices](/tags/choices.html)