---
title: HyperTextLabels
type: tags
order: 406
---

HyperTextLabels tag creates labeled hyper text (HTML)

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of the element |
| toName | <code>string</code> | name of the html element to label |

### Example
```html
<View>
  <HyperTextLabels name="labels" toName="ht">
    <Label value="Face" />
    <Label value="Nose" />
  </HyperTextLabels>
  <HyperText name="ht" value="$html" />
</View>
```
