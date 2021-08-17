---
title: List
type: tags
order: 411
meta_title: List Tags for Lists
meta_description: Label Studio List Tags customize Label Studio with lists for machine learning and data science projects.
---

List element, used for ranking results. Great choice for recomendation systems.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| elementValue | <code>string</code> |  | Lookup key for a child object |
| [elementTag] | <code>Text</code> \| <code>Image</code> \| <code>Audio</code> | <code>Text</code> | Element used to render children |
| value | <code>string</code> |  | List values |
| name | <code>string</code> |  | Name of group |
| [sortedHighlightColor] | <code>string</code> |  | Color |
| [axis] | <code>x</code> \| <code>y</code> | <code>y</code> | Axis used for drag and drop |
| lockAxis | <code>x</code> \| <code>y</code> |  | Lock axis |

### Example
```html
<View>
 <HyperText name="page" value="$markup"></HyperText>
 <List name="ranker" value="$replies" elementValue="$text" elementTag="Text" ranked="true" sortedHighlightColor="#fcfff5"></List>
</View>
```
