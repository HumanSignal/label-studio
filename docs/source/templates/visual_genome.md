---
title: Visual Genome
type: templates
category: Dynamic Labels
cat: dynamic-labels
order: 154
meta_title: Label different described features
meta_description: 
---

## Labeling Configuration

```xml
<View>
  <View style="display: flex; flex-wrap: wrap;">
    <View className="label-column">
      <Header value="Regions"/>
      <RectangleLabels name="regions" toName="image" value="$regions"/>
  </View>
    <View className="label-column">
      <Header value="Attributes"/>
    <RectangleLabels name="attributes" toName="image" value="$attributes"/>
    </View>
    <View className="label-column">
      <Header value="Relationships"/>
    <RectangleLabels name="relationships" toName="image" value="$relationships"/>
    </View>
  
  </View>
  <Image name="image" value="$image"/>
  <Style>
  .label-column .lsf-labels {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  </Style>
</View>
```

## Example data

```json
{ "data": {
  "image": "https://htx-pub.s3.amazonaws.com/templates/visual-genome/panda.jpeg",
  "regions": [
    { "value": "panda bear holding something in it's paw" },
    { "value": "trees behind the panda out of focus" },
    { "value": "piece of bamboo in panda's paw" },
    { "value": "bamboo next to panda" },
    { "value": "the panda is cute" }
  ],
  "attributes": [
    { "value": "markings is black" },
    { "value": "nose is black" },
    { "value": "face is round" },
    { "value": "wood is round" }
  ],
  "relationships": [
    { "value": "hole ON log" },
    { "value": "tree BEHIND bear" },
    { "value": "mouth OF panda" }
  ]
}}
```
