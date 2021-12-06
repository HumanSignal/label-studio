---
title: HTML Documents NER
type: templates
order: 302
meta_title: HTML Document Data Labeling Template
meta_description: Label Studio HTML Document Template for named entity recognition in machine learning and data science data labeling projects.
---

Perform named entity recognition for HTML documents.

<img src="/images/screens/html_document.png" class="img-template-example" title="HTML Documents" />

## Run

```bash
label-studio init html_document_project
label-studio start html_document_project 
```

After starting Label Studio, set up the labeling interface and browse to this template.

## Config 

```html
<View>
  <Labels name="ner" toName="text">
    <Label value="Person"></Label>
    <Label value="Organization"></Label>
  </Labels>
  <HyperText name="text" value="$text"></HyperText>
</View>
```
