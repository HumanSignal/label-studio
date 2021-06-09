---
title: Choices
type: tags
order: 403
meta_title: Choices Tags for Multiple Choice Labels
meta_description: Label Studio Choices Tags customize Label Studio for multiple choice labels for machine learning and data science projects.
---

Choices tag, create a group of choices, radio, or checkboxes. Shall
be used for a single or multi-class classification.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the group |
| toName | <code>string</code> |  | name of the element that you want to label |
| [choice] | <code>single</code> \| <code>single-radio</code> \| <code>multiple</code> | <code>single</code> | single or multi-class |
| [showInline] | <code>boolean</code> | <code>false</code> | show items in the same visual line |
| [required] | <code>boolean</code> | <code>false</code> | validation if choice has been selected |
| [requiredMessage] | <code>string</code> |  | message to show if validation fails |
| [visibleWhen] | <code>region-selected</code> \| <code>choice-selected</code> \| <code>no-region-selected</code> |  | show the contents of a view when condition is true |
| [whenTagName] | <code>string</code> |  | narrow down visibility by name of the tag, for regions use the name of the object tag, for choices use the name of the choices tag |
| [whenLabelValue] | <code>string</code> |  | narrow down visibility by label value |
| [whenChoiceValue] | <code>string</code> |  | narrow down visibility by choice value |
| [perRegion] | <code>boolean</code> |  | use this tag for region labeling instead of the whole object labeling |

### Example
```html
<View>
  <Choices name="gender" toName="txt-1" choice="single-radio">
    <Choice alias="M" value="Male" />
    <Choice alias="F" value="Female" />
  </Choices>
  <Text name="txt-1" value="John went to see Marry" />
</View>
```
