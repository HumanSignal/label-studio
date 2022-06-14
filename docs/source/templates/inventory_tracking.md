---
title: Inventory Tracking
type: templates
category: Dynamic Labels
cat: dynamic-labels
order: 152
meta_title: Label exact products on the shelves
meta_description: 
---

## Labeling Configuration

```xml
<View>
  <Image name="image" value="$image"/>
  <PolygonLabels name="objects" toName="image" value="$objects"/>
</View>
```

## Example data

```json
{
  "data": {
    "image": "https://htx-pub.s3.amazonaws.com/templates/inventory-tracking/shelf.jpeg",
    "objects": [{
      "value": "CocaCola",
      "html": "<img width='100' src='https://htx-pub.s3.amazonaws.com/templates/inventory-tracking/cocacola.png'/>"
    }, {
      "value": "RedBull",
      "html": "<img width='100' src='https://htx-pub.s3.amazonaws.com/templates/inventory-tracking/redbull.png'/>"
    }, {
      "value": "Burn",
      "html": "<img width='100' src='https://htx-pub.s3.amazonaws.com/templates/inventory-tracking/burn.png'/>"
    }, {
      "value": "Breezer",
      "html": "<img width='100' src='https://htx-pub.s3.amazonaws.com/templates/inventory-tracking/breezer.png'/>"
    }, {
      "value": "Monster",
      "html": "<img width='100' src='https://htx-pub.s3.amazonaws.com/templates/inventory-tracking/monster.png'/>"
    }]
  }
}
```
