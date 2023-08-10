---
title: Choice
type: tags
order: 403
meta_title: Choice Tag for Single Choice Labels
meta_description: Customize Label Studio with choice tags for simple classification tasks in machine learning and data science projects.
---

The `Choice` tag represents a single choice for annotations. Use with the `Choices` tag or `Taxonomy` tag to provide specific choice options.

[^1]: `ff_dev_2007_rework_choices_280322_short` should be enabled to use `html` attribute

[^2]: The `hint` attribute works only when `fflag_feat_front_prod_309_choice_hint_080523_short` is enabled

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Choice value |
| [selected] | <code>boolean</code> | Specify whether to preselect this choice on the labeling interface |
| [alias] | <code>string</code> | Alias for the choice. If used, the alias replaces the choice value in the annotation results. Alias does not display in the interface. |
| [style] | <code>style</code> | CSS style of the checkbox element |
| [hotkey] | <code>string</code> | Hotkey for the selection |
| [html] | <code>string</code> | can be used to show enriched content[^1], it has higher priority than `value`, however `value` will be used in the exported result (should be properly escaped) |
| [hint] | <code>string</code> | Hint for choice on hover[^2] |

### Example

Basic text classification labeling configuration

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
