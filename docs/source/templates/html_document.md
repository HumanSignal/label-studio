---
title: HTML Documents NER
type: templates
order: 302
---

Named entity for the HTML Documents

<img src="/images/screens/html_document.png" class="img-template-example" title="HTML Documents" />

## Run

```bash
label-studio init --template=html_document html_document_project
label-studio start html_document_project 
```

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
