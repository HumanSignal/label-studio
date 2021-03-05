---
title: Choice
type: tags
order: 403
---

Choice tag represents a single choice

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | choice value |
| [selected] | <code>boolean</code> | if this label should be preselected |
| [alias] | <code>string</code> | alias for the label |
| [style] | <code>style</code> | css style of the checkbox element |
| [hotkey] | <code>string</code> | hotkey |

### Example
```html
<View>
  <Choices name="gender" toName="txt-1" choice="single">
    <Choice value="Male" />
    <Choice value="Female" />
  </Choices>
  <Text name="txt-1" value="John went to see Marry" />
</View>
```
