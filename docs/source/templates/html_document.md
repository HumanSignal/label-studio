---
title: HTML Documents NER
type: templates
order: 205
is_new: t
---

Named entity for the HTML Documents

<img src="/images/screens/html_document.png" class="img-template-example" title="HTML Documents" />

## Run

```bash
python server.py -c config.json -l ../examples/html_document/config.xml -i ../examples/html_document/tasks.json -o output_html_ner
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
