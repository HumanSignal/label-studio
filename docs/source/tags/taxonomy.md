---
title: Taxonomy
type: tags
order: 423
meta_title: Taxonomy Tags for Hierarchical Labels
meta_description: Label Studio Taxonomy Tags customize Label Studio by using hierarchical labels for machine learning and data science projects.
---

Taxonomy tag allows to select one or more hierarchical labels
storing both label and their ancestors.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of the group |
| toName | <code>string</code> | name of the element that you want to label |

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
  <Text name="text" value="You never believe what he did to the country" />
</View>
```
