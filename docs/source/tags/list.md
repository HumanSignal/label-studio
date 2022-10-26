---
title: List
type: tags
order: 413
meta_title: List Tag for Lists
meta_description: Customize Label Studio with lists for machine learning and data science projects.
---

Use the List tag to rank results, for example for recommendation systems.

Use with the following data types: audio, image, HTML, paragraphs, text

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| elementValue | <code>string</code> |  | Lookup key for a child object |
| [elementTag] | <code>Text</code> \| <code>Image</code> \| <code>Audio</code> | <code>Text</code> | Object tag used to render children |
| value | <code>string</code> |  | List values |
| name | <code>string</code> |  | Name of group |
| [sortedHighlightColor] | <code>string</code> |  | Sorted color in HTML color name |
| [axis] | <code>x</code> \| <code>y</code> | <code>y</code> | Axis used for drag and drop |
| lockAxis | <code>x</code> \| <code>y</code> |  | Whether to lock the axis |

### Example
```html
<!--Labeling configuration for a list of possible reply options that can be ranked-->
<View>
 <HyperText name="page" value="$markup"></HyperText>
 <List name="ranker" value="$replies" elementValue="$text" elementTag="Text" ranked="true" sortedHighlightColor="#fcfff5"></List>
</View>
```
