---
title: List
type: tags
order: 411
meta_title: List Tags for Lists
meta_description: Label Studio List Tags customize Label Studio with lists for machine learning and data science projects.
---

List element, used for ranking results. Great choice for recomendation systems.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| elementValue | <code>string</code> | lookup key for child object |
| elementTag | <code>Text</code> \| <code>Image</code> \| <code>Audio</code> | element used to render children |
| value | <code>string</code> | list value |
| name | <code>string</code> | of group |
| [sortedHighlightColor] | <code>string</code> | color |
| [axis] | <code>string</code> | axis used for drag-n-drop |
| [lockAxis] | <code>string</code> | lock axis |

### Example
```html
<View>
 <HyperText value="$markup"></HyperText>
 <List name="ranker" value="$replies" elementValue="$text" elementTag="Text" ranked="true" sortedHighlightColor="#fcfff5"></List>
</View>
```
