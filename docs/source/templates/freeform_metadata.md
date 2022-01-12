---
title: Freeform Metadata
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 601
meta_title: 
meta_description: 
---


## Labeling Configuration

```html
<View>
  <Style>
    input[type="text"][name^="table"] { border-radius: 0px; border-right: none;}
    input[type="text"][name^="table_metric"] { border-right: 1px solid #ddd; }
    div[class*=" TextAreaRegion_mark"] {background: none; height: 33px; border-radius: 0; min-width: 135px;}
  </Style>

  <Text value="$text" name="text"/>

  <View style="display: grid;  grid-template-columns: 1fr 1fr; max-height: 300px; width: 400px">
    <TextArea name="table_name_1" toName="text" placeholder="name" editable="true" maxSubmissions="1"/>
    <TextArea name="table_value_1" toName="text" placeholder="value" editable="true" maxSubmissions="1"/>
    <TextArea name="table_name_2" toName="text" placeholder="name" editable="true" maxSubmissions="1"/>
    <TextArea name="table_value_2" toName="text" placeholder="value" editable="true" maxSubmissions="1"/>
    <TextArea name="table_name_3" toName="text" placeholder="name" editable="true" maxSubmissions="1"/>
    <TextArea name="table_value_3" toName="text" placeholder="value" editable="true" maxSubmissions="1"/>
  </View>
</View>
```