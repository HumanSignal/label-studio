---
title: Table
type: tags
order: 307
meta_title: Table Tag to Display Keys & Values in Tables
meta_description: Customize Label Studio by displaying key-value pairs in tasks for machine learning and data science projects.
---

The `Table` tag is used to display object keys and values in a table.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Data field value containing JSON type for Table |
| [valueType] | <code>string</code> | Value to define the data type in Table |

### Example

Basic labeling configuration for text in a table

```html
<View>
  <Table name="text-1" value="$text"></Table>
</View>
```
