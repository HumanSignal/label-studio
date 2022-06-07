---
title: Tabular Data
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 603
meta_title: Tabular Data Labeling Template
meta_description: Template for labeling tabular data with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/tabular-data.png" alt="" class="gif-border" width="552px" height="408px" />

If you need to validate data stored in a table, use this template to display data in a tabular format and ask questions about the contents of the table. 

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <Header value="Table with {key: value} pairs"/>
    <Table name="table" value="$item"/>
    <Choices name="choice" toName="table">
        <Choice value="Correct"/>
        <Choice value="Incorrect"/>
    </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Header](/tags/header.html) tag to provide details to annotators:
```xml
<Header value="Table with {key: value} pairs"/>
```

Use the [Table](/tags/table.html) object tag to display tabular data:
```xml
<Table name="table" value="$item"/>
```

Use the [Choices](/tags/choices.html) control tag to classify the table contents:
```xml
<Choices name="choice" toName="table">
    <Choice value="Correct"/>
    <Choice value="Incorrect"/>
</Choices>
```


## Related tags

- [Header](/tags/header.html)
- [Table](/tags/table.html)
- [Choices](/tags/choices.html)
