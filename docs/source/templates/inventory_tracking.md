---
title: Inventory Tracking
type: templates
category: Dynamic Labels
cat: dynamic-labels
order: 152
meta_title: Label exact products on the shelves
meta_description: 
---

For the inventory tracking system, you can annotate the inventory item based on the visual analysis of the item. For example, if you want to annotate the product shelf based on a cocacola image then you can start drawing the annotation around the selected image.
<br/>

<img src="/images/templates/inventory-tracking.png" alt="Inventory Tracking example" class="gif-border" width="552px" height="408px" />

## Labeling Configuration

```xml
<View>
  <View style="display:flex;justify-content:center">
    <PolygonLabels name="objects" toName="image" value="$objects"/>
  </View>
  <Image name="image" value="$image"/>
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
