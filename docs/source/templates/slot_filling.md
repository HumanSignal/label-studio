---
title: Slot Filling and Intent Classification
type: templates
category: Conversational AI
cat: conversational-ai
order: 404
meta_title: Slot Filling and Intent Classification Data Labeling Template
meta_description: Template for slot filling in natural language understanding use cases with intent classification for dialogue with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/intent-classification-and-slot-filling.png" alt="" class="gif-border" width="552px" height="408px" />

For natural language understanding cases when you need to detect the intent of a speaker in dialogue, perform intent classification and slot filling to identify the entities related to the intent of the dialogue, and classify those entities. 

Use this template to provide a section of dialogue, assign labels to spans of text in the dialogue, and classify the intent of the dialogue. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <ParagraphLabels name="entity_slot" toName="dialogue">
    <Label value="Person" background="#ff0012"/>
    <Label value="Organization" background="#2311de" />
    <Label value="Location" background="#00ff01"/>
    <Label value="Datetime" />
    <Label value="Quantity" />
  </ParagraphLabels>
  <Paragraphs name="dialogue" value="$dialogue" layout="dialogue" />
    <Choices name="intent" toName="dialogue"
         choice="single" showInline="true">
        <Choice value="Greeting"/>
        <Choice value="Customer request"/>
        <Choice value="Small talk"/>
    </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [ParagraphLabels](/tags/paragraphlabels.html) control tag to apply labels to specific dialogue spans:
```xml
<ParagraphLabels name="entity_slot" toName="dialogue">
    <Label value="Person" background="#ff0012"/>
    <Label value="Organization" background="#2311de" />
    <Label value="Location" background="#00ff01"/>
    <Label value="Datetime" />
    <Label value="Quantity" />
</ParagraphLabels>
```

Use the [Paragraphs](/tags/paragraphs.html) object tag to display dialogue:
```xml
<Paragraphs name="dialogue" value="$dialogue" layout="dialogue" />
```
  
Use the [Choices](/tags/choices.html) control tag to select a single classification tag for the dialogue and have annotators classify the intent of the dialogue:
```xml
<Choices name="intent" toName="dialogue" 
         choice="single" showInline="true">
    <Choice value="Greeting"/>
    <Choice value="Customer request"/>
    <Choice value="Small talk"/>
</Choices>
```
The `choice="single"` parameter restricts the annotators to one choice selection, and `showInline="true"` controls the display of the choices on the labeling interface. 

## Related tags

- [ParagraphLabels](/tags/paragraphlabels.html)
- [Label](/tags/label.html)
- [Paragraphs](/tags/paragraphs.html)
- [Choices](/tags/choices.html)
