---
title: Choice
type: tags
order: 402
meta_title: Choice Tags for Single Choice Labels
meta_description: Label Studio Choice Tags customize Label Studio for single choice labels for machine learning and data science projects.
---

Choice tag represents a single choice for annotations.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Choice value |
| [selected] | <code>boolean</code> | Specify whether to preselect this label on the labeling interface |
| [alias] | <code>string</code> | Alias for the label |
| [style] | <code>style</code> | CSS style of the checkbox element |
| [hotkey] | <code>string</code> | Hotkey for the selection |

### Example
```html
<View>
  <Choices name="gender" toName="txt-1" choice="single">
    <Choice value="Man" />
    <Choice value="Woman" />
    <Choice value="Nonbinary" />
    <Choice value="Other" />
  </Choices>
  <Text name="txt-1" value="John went to see Mary" />
</View>
```
