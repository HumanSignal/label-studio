---
title: Labels
type: tags
order: 412
meta_title: Labels Tag for Labeling Regions
meta_description: Customize Label Studio by using the Labels tag to provide a set of labels for labeling regions in tasks for machine learning and data science projects.
---

The Labels tag provides a set of labels for labeling regions in tasks for machine learning and data science projects. Use the Labels tag to create a set of labels that can be assigned to identified region and specify the values of labels to assign to regions.

All types of Labels can have dynamic value to load labels from task. This task data should contain a list of options to create underlying <Label>s. All the parameters from options will be transferred to corresponding tags.

The Labels tag can be used with audio and text data types. Other data types have type-specific Labels tags.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels for a region |
| [maxUsages] | <code>number</code> |  | Maximum number of times a label can be used per task |
| [showInline] | <code>boolean</code> | <code>true</code> | Whether to show labels in the same visual line |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of rectangle highlighting the label |
| [fillColor] | <code>string</code> |  | Rectangle fill color in hexadecimal |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [value] | <code>string</code> |  | Task data field containing a list of dynamically loaded labels (see example below) |

### Example

Basic labeling configuration to apply labels to a passage of text

```html
<View>
  <Labels name="type" toName="txt-1">
    <Label alias="B" value="Brand" />
    <Label alias="P" value="Product" />
  </Labels>
  <Text name="txt-1" value="$text" />
</View>
```
**Example** *(This part of config with dynamic labels)*  
```html
<Labels name="product" toName="shelf" value="$brands" />
<!-- {
  "data": {
    "brands": [
      { "value": "Big brand" },
      { "value": "Another brand", "background": "orange" },
      { "value": "Local brand" },
      { "value": "Green brand", "alias": "Eco", showalias: true }
    ]
  }
} -->
```
**Example** *(is equivalent to this config)*  
```html
<Labels name="product" toName="shelf">
  <Label value="Big brand" />
  <Label value="Another brand" background="orange" />
  <Label value="Local brand" />
  <Label value="Green brand" alias="Eco" showAlias="true" />
</Labels>
```
