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

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the ParagraphLabels control tag to apply labels 
    to specific dialogue spans-->
  <ParagraphLabels name="entity_slot" toName="dialogue">
    <Label value="Person" background="#ff0012"/>
    <Label value="Organization" background="#2311de" />
    <Label value="Location" background="#00ff01"/>
    <Label value="Datetime" />
    <Label value="Quantity" />
  </ParagraphLabels>
    <!--Use the Paragraphs object tag to display dialogue-->
  <Paragraphs name="dialogue" value="$dialogue" layout="dialogue" />
    <!--Use the Choices control tag to select a single 
    classification tag for the dialogue-->
    <Choices name="intent" toName="dialogue"
         choice="single" showInLine="true">
        <Choice value="Greeting"/>
        <Choice value="Customer request"/>
        <Choice value="Small talk"/>
    </Choices>
</View>
```

## Related tags

- [ParagraphLabels](/tags/paragraphlabels.html)
- [Label](tags/label.html)
- [Paragraphs](/tags/paragraphs.html)
- [Choices](/tags/choices.html)