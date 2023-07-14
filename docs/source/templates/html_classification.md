---
title: HTML Classification
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 605
meta_title: HTML Classification Data Labeling Template
meta_description: Template for classifying HTML documents with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates-misc/html-classification.png" alt="" class="gif-border" width="552px" height="352px" />

For content moderation and other use cases where you want to classify HTML content, you can use this template. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Choices name="toxicity" toName="web_page" choice="multiple" showInline="true">
    <Choice value="Toxic" background="red"/>
    <Choice value="Severely Toxic" background="brown"/>
    <Choice value="Obscene" background="green"/>
    <Choice value="Threat" background="blue"/>
    <Choice value="Insult" background="orange"/>
    <Choice value="Hate" background="grey"/>
  </Choices>

  <View style="border: 1px solid #CCC;
               border-radius: 10px;
               padding: 5px">
    <HyperText name="web_page" value="$text"/>
  </View>
</View>
```
## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

The [Choices](/tags/choices.html) control tag specifies the options to use to classify the website content. 
```xml
  <Choices name="toxicity" toName="web_page" choice="multiple" showInline="true">
    <Choice value="Toxic" background="red"/>
    <Choice value="Severely Toxic" background="brown"/>
    <Choice value="Obscene" background="green"/>
    <Choice value="Threat" background="blue"/>
    <Choice value="Insult" background="orange"/>
    <Choice value="Hate" background="grey"/>
  </Choices>
```
The `choice` parameter lets annotators select multiple choices, and the `showInline` parameter displays all the choices in a row. This template provides numerous content moderation choice values, but you can modify the template to provide different choices.

Styling on the [View](/tags/view.html) tag adds a border around the website content to make it clear to annotators what is website content: 
```xml
  <View style="border: 1px solid #CCC;
               border-radius: 10px;
               padding: 5px">
```

The [HyperText](/tags/hypertext.html) object tag displays the website content, specified in the `text` key of Label Studio JSON format or imported as plain text.
```xml
    <HyperText name="web_page" value="$text"/>
```


## Related tags
- [Choices](/tags/choices.html)
- [HyperText](/tags/hypertext.html)
- [View](/tags/view.html)
