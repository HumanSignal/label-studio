---
title: Image Key Points
type: templates
order: 206
---

Key Points labeling for the images

<img src="/images/screens/image_keypoints.png" class="img-template-example" title="Images Key Points" />

## Run

```bash
python server.py -c config.json -l ../examples/image_keypoints/config.xml -i ../examples/image_keypoints/tasks.json -o output_keypoints
```

## Config 

```html
<View>
  <KeyPointLabels name="tag" toName="img" strokewidth="5">
    <Label value="Ear" background="blue"></Label>
    <Label value="Lip" background="red"></Label>
  </KeyPointLabels>
  <Image name="img" value="$image" zoom="true"></Image>
</View>
```
