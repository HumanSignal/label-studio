---
title: HTML Entity Recognition
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 504
meta_title: HTML Entity Resolution Data Labeling Template
meta_description: Template for performing HTML document entity resolution with Label Studio for your machine learning and data science projects.
---

Perform named entity recognition for HTML documents.

<img src="/images/screens/html_document.png" class="img-template-example" title="HTML Documents" />

## Labeling Configuration 

```html
<View>
  <Labels name="ner" toName="text">
    <Label value="Person"></Label>
    <Label value="Organization"></Label>
  </Labels>
  <HyperText name="text" value="$text"></HyperText>
</View>
```
## Related tags

- [Labels](/tags/labels.html)
- [HyperText](/tags/hypertext.html)