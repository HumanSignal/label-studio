---
title: Choices
type: tags
order: 403
meta_title: Choices Tags for Multiple Choice Labels
meta_description: Label Studio Choices Tags customize Label Studio for multiple choice labels for machine learning and data science projects.
---

Use the Choices tag to create a group of choices, radio buttons, or checkboxes. Can
be used for single or multi-class classification.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the group of choices |
| toName | <code>string</code> |  | Name of the data item that you want to label |
| [choice] | <code>single</code> \| <code>single-radio</code> \| <code>multiple</code> | <code>single</code> | Single or multi-class classification |
| [showInline] | <code>boolean</code> | <code>false</code> | Show items in the same visual line |
| [required] | <code>boolean</code> | <code>false</code> | Validate whether a choice has been selected |
| [requiredMessage] | <code>string</code> |  | Show a message if validation fails |
| [visibleWhen] | <code>region-selected</code> \| <code>choice-selected</code> \| <code>no-region-selected</code> |  | When true, show the contents of a view |
| [whenTagName] | <code>string</code> |  | Narrow down visibility by name of the tag, for regions use the name of the object tag, for choices use the name of the choices tag |
| [whenLabelValue] | <code>string</code> |  | Narrow down visibility by label value |
| [whenChoiceValue] | <code>string</code> |  | Narrow down visibility by choice value |
| [perRegion] | <code>boolean</code> |  | use this tag for region labeling instead of the whole object labeling |

### Example
```html
<View>
  <Choices name="gender" toName="txt-1" choice="single-radio">
    <Choice alias="M" value="Male" />
    <Choice alias="F" value="Female" />
    <Choice alias="NB" value="Nonbinary" />
    <Choice alias="X" value="Other" />
  </Choices>
  <Text name="txt-1" value="John went to see Mary" />
</View>
```
