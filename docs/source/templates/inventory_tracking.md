---
title: Inventory Tracking
type: templates
category: Computer Vision
cat: computer-vision
order: 152
meta_title: Label exact products on the shelves
meta_description: 
---

<!-- For the inventory tracking system, you can annotate the inventory item based on the visual analysis of the item. For example, if you want to annotate the product shelf based on a cocacola image then you can start drawing the annotation around the selected image. -->

Inventory Tracking system allows you to label exact products by given brand names illustrated by relevant sample photo. Every task with shelf photo also has a list of assiated brands to label.
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

Let's get through configuration. `View` is used only for layout purposes. The main thing here is the `value` in `PolygonLabels`, it allows us to load labels dynamically for every task from related array in task data, one `Label` per item. Every parameter from such item in data will be present as parameter in generated `Label` tag.

Also there is new `html` parameter for `Label` tag which allows to display rich content as label. This content should be html-escaped:
- `<` &rarr; `&lt;`
- `"` &rarr; `&quot;`
- `>` &rarr; `&gt;`
- etc.

Stored value still comes from `value` parameter, it's required.

You can also use usual static `Label`s inside `Labels` tag in combination with dynamic ones — static labels will be displayed first.

## Example data

We use `value=$objects` so we should set `objects` field in task data as the source for generated labels, every item contains parameters for such tags, these parameters can be different for every label, the only required is `value`. `html` content should be string-escaped, so it's better to use single quotes here.

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
