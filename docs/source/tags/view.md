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
