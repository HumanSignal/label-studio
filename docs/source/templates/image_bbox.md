---
title: Image Object Detection
type: templates
order: 205
---

Image bounding box labeling

<img src="/images/screens/image_bbox.png" class="img-template-example" title="Images Bbounding box" />

## Run

```bash
python server.py -c config.json -l ../examples/image_bbox/config.xml -i ../examples/image_bbox/tasks.json -o output
```

## Config 

```html
<View>
  <Image name="img" value="$image"></Image>
  <RectangleLabels name="tag" toName="img">
    <Label value="Planet"></Label>
    <Label value="Moonwalker" background="blue"></Label>
  </RectangleLabels>
</View>
```
