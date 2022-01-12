---
title: Relation Extraction
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 205
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
   <Relations>
    <Relation value="org:founded_by"/>
    <Relation value="org:founded"/>
  </Relations>
  <Labels name="label" toName="text">
    <Label value="Organization" background="orange"/>
    <Label value="Person" background="green"/>
    <Label value="Datetime" background="blue"/>
  </Labels>

  <Text name="text" value="$text"/>
</View>
```