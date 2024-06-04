---
title: View
type: tags
order: 505
meta_title: View Tag for Defining How Blocks are Displayed
meta_description: Customize how blocks are displayed on the labeling interface in Label Studio for machine learning and data science projects.
---

The `View` element is used to configure the display of blocks, similar to the div tag in HTML.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| display | <code>block</code> \| <code>inline</code> |  |
| [style] | <code>string</code> | CSS style string |
| [className] | <code>string</code> | Class name of the CSS style to apply. Use with the Style tag |
| [idAttr] | <code>string</code> | Unique ID attribute to use in CSS |
| [visibleWhen] | <code>region-selected</code> \| <code>choice-selected</code> \| <code>no-region-selected</code> \| <code>choice-unselected</code> | Control visibility of the content. Can also be used with `when*` attributes below to narrow down visibility |
| [whenTagName] | <code>string</code> | Use with visibleWhen. Narrow down visibility by tag name. For regions, use the name of the object tag, for choices, use the name of the choices tag |
| [whenLabelValue] | <code>string</code> | Use with visibleWhen="region-selected". Narrow down visibility by label value |
| [whenChoiceValue] | <code>string</code> | Use with visibleWhen ("choice-selected" or "choice-unselected") and whenTagName, both are required. Narrow down visibility by choice value |

### Example

Create two cards that flex to take up 50% of the screen width on the labeling interface

```html
<View style="display: flex;">
  <View style="flex: 50%">
    <Header value="Facts:" />
    <Text name="text" value="$fact" />
  </View>
  <View style="flex: 50%; margin-left: 1em">
    <Header value="Enter your question:" />
    <TextArea name="question" />
  </View>
</View>
```
