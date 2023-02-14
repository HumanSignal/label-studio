---
title: View
type: tags
order: 506
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
| [visibleWhen] | <code>region-selected</code> \| <code>choice-selected</code> \| <code>no-region-selected</code> | Show the contents of a view when condition is true |
| [whenTagName] | <code>string</code> | Narrow down visibility by tag name. For regions, use the name of the object tag, for choices, use the name of the choices tag. |
| [whenLabelValue] | <code>string</code> | Narrow down visibility by label value |
| [whenChoiceValue] | <code>string</code> | Narrow down visibility by choice value |

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
