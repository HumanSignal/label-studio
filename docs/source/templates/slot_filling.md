---
title: Slot Filling and Intent Classification
type: templates
category: Conversational AI
cat: conversational-ai
order: 404
meta_title: 
meta_description: 
---

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
         choice="single" showInLine="true">
        <Choice value="Greeting"/>
        <Choice value="Customer request"/>
        <Choice value="Small talk"/>
    </Choices>
</View>
```