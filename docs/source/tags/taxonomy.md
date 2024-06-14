---
title: Taxonomy
type: tags
order: 426
meta_title: Taxonomy Tag for Hierarchical Labels
meta_description: Customize Label Studio with the Taxonomy tag and use hierarchical labels for machine learning and data science projects.
---

The `Taxonomy` tag is used to create one or more hierarchical classifications, storing both choice selections and their ancestors in the results. Use for nested classification tasks with the `Choice` tag.

You can define nested classifications using the `Choice` tag, or retrieve external classifications using the `apiUrl` parameter. For more information on these options, see the [Taxonomy template page](/templates/taxonomy).

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to classify |
| [apiUrl] | <code>string</code> |  | **Beta** -- Retrieve the taxonomy from a remote source. This can be a JSON-formatted file or a hierarchical data source read as an API. For more information, see the [Taxonomy template page](/templates/taxonomy) |
| [leafsOnly] | <code>boolean</code> | <code>false</code> | Allow annotators to select only leaf nodes of taxonomy |
| [showFullPath] | <code>boolean</code> | <code>false</code> | Whether to show the full path of selected items |
| [pathSeparator] | <code>string</code> | <code>&quot;/&quot;</code> | Separator to show in the full path (default is " / "). To avoid errors, ensure that your data does not include this separator |
| [maxUsages] | <code>number</code> |  | Maximum number of times a choice can be selected per task or per region |
| [maxWidth] | <code>number</code> |  | Maximum width for dropdown |
| [minWidth] | <code>number</code> |  | Minimum width for dropdown |
| [required] | <code>boolean</code> | <code>false</code> | Whether taxonomy validation is required |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |
| [placeholder=] | <code>string</code> |  | What to display as prompt on the input |
| [perRegion] | <code>boolean</code> |  | Use this tag to classify specific regions instead of the whole object |
| [perItem] | <code>boolean</code> |  | Use this tag to classify specific items inside the object instead of the whole object |
| [legacy] | <code>boolean</code> |  | Use this tag to enable the legacy version of the Taxonomy tag. The legacy version supports the ability for annotators to add labels as needed. However, when true, the `apiUrl` parameter is not usable. |

### Example

Labeling configuration for providing a taxonomy of choices in response to a passage of text

```html
<View>
  <Taxonomy name="media" toName="text">
    <Choice value="Online">
      <Choice value="UGC" />
      <Choice value="Free" />
      <Choice value="Paywall">
        <Choice value="NY Times" />
        <Choice value="The Wall Street Journal" />
      </Choice>
    </Choice>
    <Choice value="Offline" />
  </Taxonomy>
  <Text name="text" value="You'd never believe what he did to the country" />
</View>
```
