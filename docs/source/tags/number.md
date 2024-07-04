---
title: Number
type: tags
order: 414
meta_title: Number Tag to Numerically Classify
meta_description: Customize Label Studio with the Number tag to numerically classify tasks in your machine learning and data science projects.
---

The Number tag supports numeric classification. Use to classify tasks using numbers.

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| [min] | <code>number</code> |  | Minimum number value |
| [max] | <code>number</code> |  | Maximum number value |
| [step] | <code>number</code> | <code>1</code> | Step for value increment/decrement |
| [defaultValue] | <code>number</code> |  | Default number value; will be added automatically to result for required fields |
| [hotkey] | <code>string</code> |  | Hotkey for increasing number value |
| [required] | <code>boolean</code> | <code>false</code> | Whether number is required or not |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [perRegion] | <code>boolean</code> |  | Use this tag to classify specific regions instead of the whole object |
| [perItem] | <code>boolean</code> |  | Use this tag to classify specific items inside the object instead of the whole object |
| [slider] | <code>boolean</code> | <code>false</code> | Use slider look instead of input; use min and max to add your constraints |

### Example

Basic labeling configuration for numeric classification of text

```html
<View>
  <Text name="txt" value="$text" />
  <Number name="number" toName="txt" max="10" />
</View>
```
