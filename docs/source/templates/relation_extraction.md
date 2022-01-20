---
title: Relation Extraction
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 205
meta_title: 
meta_description: 
---

If you need to train a natural language processing model to perform relationship extraction tasks, use this template to create a dataset. This template prompts an annotator to label text spans and identify relationships between the spans. For example, identifying people and organizations, and adding relation arrows and labels to identify who founded an organization. 


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

## Related tags

- [Relations](/tags/relations.html)
- [Labels](/tags/labels.html)
- [Text](/tags/text.html)
