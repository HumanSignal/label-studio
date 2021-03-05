---
title: Pairwise
type: tags
order: 412
---

Pairwise element. Compare two different objects, works with any label studio object

### Parameters
**Params**: <code>string</code> [leftClass=left]  - class name of the left object  
**Params**: <code>string</code> [rightClass=left] - class name of the right object  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of the element |
| toName | <code>string</code> | names of the elements you want to compare |
| [selectionStyle] | <code>string</code> | style of the selection |

### Example
```html
<View>
  <Pairwise name="pairwise" leftClass="text1" rightClass="text2" toName="txt-1,txt-2"></Pairwise>
  <Text name="txt-1" value="Text 1" />
  <Text name="txt-2" value="Text 2" />
</View>
```
### Example

You can also style the appearence using the View tag:

```html
<View>
  <Pairwise name="pw" toName="txt-1,txt-2"></Pairwise>
  <View style="display: flex;">
    <View style="margin-right: 1em;"><Text name="txt-1" value="$text1" /></View>
    <View><Text name="txt-2" value="$text2" /></View>
  </View>
</View>
```
