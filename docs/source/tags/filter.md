---
title: Filter
type: tags
order: 502
meta_title: Filter Tag for Filter Search
meta_description: Customize Label Studio with the Filter tag to filter labels to accelerate labeling for machine learning and data science projects.
---

Use the Filter tag to add a filter search for a large number of labels or choices. Use with the Labels tag or Choices tag.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [placeholder] | <code>string</code> | <code>&quot;\&quot;Quick Filter\&quot;&quot;</code> | Placeholder text for filter |
| [minlength] | <code>number</code> | <code>3</code> | Size of the filter |
| [style] | <code>string</code> |  | CSS style of the string |
| [hotkey] | <code>string</code> |  | Hotkey to use to focus on the filter text area |

### Example

Add a filter to labels for a named entity recognition task

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
