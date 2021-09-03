---
title: Filter
type: tags
order: 501
meta_title: Filter Tags for Filter Search
meta_description: Label Studio Filter Tags customize Label Studio with filter search for machine learning and data science projects.
---

Add a filter search for a large number of labels.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [placeholder] | <code>string</code> | <code>&quot;\&quot;Quick Filter\&quot;&quot;</code> | Placeholder text for filter |
| [minlength] | <code>number</code> | <code>3</code> | Size of the filter |
| [style] | <code>string</code> |  | CSS style of the string |
| [hotkey] | <code>string</code> |  | Hotkey to use to focus on the filter text area |

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
