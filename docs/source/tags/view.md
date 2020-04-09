---
title: View
type: tags
order: 508
---

View element. It's analogous to div element in html and can be used to visual configure display of blocks

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| display | <code>block</code> \| <code>inline</code> |  |
| [style] | <code>string</code> | css style string |
| [className] | <code>string</code> | class name of the css style to apply |
| [visibleWhen] | <code>region-selected</code> \| <code>choice-selected</code> \| <code>no-region-selected</code> | show the contents of a view when condition is true |
| [whenTagName] | <code>string</code> | narrow down visibility by name of the tag, for regions use the name of the object tag, for choices use the name of the choices tag |
| [whenLabelValue] | <code>string</code> | narrow down visibility by label value |
| [whenChoiceValue] | <code>string</code> | narrow down visibility by choice value |

### Example  
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
