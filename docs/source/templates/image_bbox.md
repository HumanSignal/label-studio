---
title: Image Object Detection
type: templates
order: 205
---

Image bounding box labeling

![Image object detection](https://user.fm/files/v2-04a15361580d038bd9392a225e2569e4/Screen%20Shot%202019-08-01%20at%2011.38.16%20PM.png "Image BBox")

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
