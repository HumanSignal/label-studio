---
title: Named Entity Recognition
type: templates
order: 206
---

Named entity recognition for a piece of text

![Named Entity Recognition](https://user.fm/files/v2-cfb599a352fe6c17d209599ce95e7e25/Screen%20Shot%202019-08-01%20at%209.48.24%20PM.png "Named Entity Recognition")

## Run

```bash
python server.py -c config.json -l ../examples/named_entity/config.xml -i ../examples/named_entity/tasks.json -o output
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
