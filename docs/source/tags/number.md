---
title: Number
type: tags
order: 413
is_new: t
---

Number adds numeric classification

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| [min] | <code>number</code> |  | Minimum number value |
| [max] | <code>number</code> |  | Maximum number value |
| [step] | <code>number</code> | <code>1</code> | Step for value increment/decrement |
| [defaultValue] | <code>number</code> |  | Default number value |
| hotkey | <code>string</code> |  | HotKey for increasing number value |
| [required] | <code>boolean</code> | <code>false</code> | Whether number is required or not |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [perRegion] | <code>boolean</code> |  | Use this tag to label regions instead of the whole object |

### Example
```html
<View>
  <Text name="txt" value="$text" />
  <Number name="number" toName="txt" max="10" />
</View>
```
