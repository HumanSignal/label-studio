---
title: View
type: guide
order: 508
---

## View

View element. It's analogous to div element in html and can be used to visual configure display of blocks

### Parameters

-   `display` **(block | inline)** 
-   `backgroundColor` **hexColor** background color
-   `style` **style** css style string

### Examples

```html
<View style="display: flex;">
 <View style="flex: 50%">
  <Header value="Facts:"></Header>
  <Text name="text" value="$fact"></Text>
 </View>
 <View style="flex: 50%; margin-left: 1em">
  <Header value="Enter your question:"></Header>
  <TextArea name="question" ></TextArea>
 </View>
</View>
```
