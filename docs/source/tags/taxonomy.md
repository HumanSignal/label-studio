---
title: Taxonomy
type: tags
order: 425
meta_title: Taxonomy Tags for Hierarchical Labels
meta_description: Label Studio Taxonomy Tags customize Label Studio by using hierarchical labels for machine learning and data science projects.
---

Taxonomy tag allows to select one or more hierarchical labels
storing both label and their ancestors.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the element that you want to classify |
| [leafsOnly] | <code>boolean</code> | <code>false</code> | Allow to select only leaf nodes of taxonomy |
| [maxUsages] | <code>number</code> |  | Maximum available usages |
| [required] | <code>boolean</code> | <code>false</code> | Whether taxonomy validation is required |
| [requiredMessage] | <code>string</code> |  | Message to show if validation fails |

### Example
```html
<View>
  <Taxonomy name="media" toName="text">
    <Choice value="Online">
      <Choice value="UGC" />
      <Choice value="Free" />
      <Choice value="Paywall">
        <Choice value="NYC Times" />
        <Choice value="The Wall Street Journal" />
      </Choice>
    </Choice>
    <Choice value="Offline" />
  </Taxonomy>
  <Text name="text" value="You'd never believe what he did to the country" />
</View>
```
