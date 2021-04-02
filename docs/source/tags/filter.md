---
title: Filter
type: tags
order: 501
meta_title: Filter Tags for Filter Search
meta_description: Label Studio Filter Tags customize Label Studio with filter search for machine learning and data science projects.
---

Filter search for large amount of labels

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [placeholder] | <code>string</code> |  | placeholder text of filter |
| [minlength] | <code>number</code> | <code>4</code> | size of filter |
| [style] | <code>string</code> |  | css style string |
| [hotkey] | <code>string</code> |  | hotkey to focus on filter text area |

### Example
```html
<View>
  <Filter name="filter" toName="ner"
          hotkey="shift+f" minlength="0"
          placeholder="Filter" />
  <Labels name="ner" toName="text" showInline="false">
    <Label value="Person" />
    <Label value="Organization" />
  </Labels>
  <Text name="text" value="$text" />
</View>
```
