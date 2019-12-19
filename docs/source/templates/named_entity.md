---
title: Named Entity Recognition
type: templates
order: 206
---

Named entity recognition for a piece of text

<img src="/images/screens/named_entity.png" class="img-template-example" title="Named Entity Recognition" />

## Run

```bash
python server.py -c config.json -l ../examples/named_entity/config.xml -i ../examples/named_entity/tasks.json -o output_ner
```

## Config 

```html
<View>
  <Labels name="ner" toName="text">
    <Label value="Person"></Label>
    <Label value="Organization"></Label>
    <Label value="Fact"></Label>
    <Label value="Money"></Label>
    <Label value="Date"></Label>
    <Label value="Time"></Label>
    <Label value="Ordinal"></Label>
    <Label value="Percent"></Label>
    <Label value="Product"></Label>
    <Label value="Language"></Label>
    <Label value="Location"></Label>
  </Labels>
  <Text name="text" value="$text"></Text>
</View>
```
