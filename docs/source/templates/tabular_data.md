---
title: Tabular Data
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 603
meta_title: 
meta_description: 
---

If you need to validate data stored in a table, use this template to display data in a tabular format and ask questions about the contents of the table. 

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

## Related tags

- [Table](/tags/table.html)
- [Choices](/tags/choices.html)
