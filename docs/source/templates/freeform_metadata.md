---
title: Freeform Metadata
type: templates
category: Structured Data Parsing
cat: structured-data-parsing
order: 601
meta_title: Freeform Metadata Data Labeling Template
meta_description: Template for adding freeform content metadata to tasks with Label Studio for your machine learning and data science projects.
---
<img src="/images/templates/freeform-metadata.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to collect metadata for a text sample for tagging purposes, or another reason, use this template to provide a table for annotators to type in freeform metadata about a text passage. You can modify this template to show an image or another data type by using a different tag. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Style tag to control how the table for freeform metadata appears.
    Use the div option to specify an existing div class CSS element and add custom CSS to it-->
  <Style>
    input[type="text"][name^="table"] { border-radius: 0px; border-right: none;}
    input[type="text"][name^="table_metric"] { border-right: 1px solid #ddd; }
    div[class*=" TextAreaRegion_mark"] {background: none; height: 33px; border-radius: 0; min-width: 135px;}
  </Style>
<!--Use the Text object tag to specify the text to label-->
  <Text value="$text" name="text"/>
<!--Add styling to the View tag to control how to display the TextArea tag options-->
  <View style="display: grid;  grid-template-columns: 1fr 1fr; max-height: 300px; width: 400px">
      <!--Use the TextArea Control tag to display editable text boxes to annotators, with placeholder values-->
    <TextArea name="table_name_1" toName="text" placeholder="name" editable="true" maxSubmissions="1"/>
    <TextArea name="table_value_1" toName="text" placeholder="value" editable="true" maxSubmissions="1"/>
    <TextArea name="table_name_2" toName="text" placeholder="name" editable="true" maxSubmissions="1"/>
    <TextArea name="table_value_2" toName="text" placeholder="value" editable="true" maxSubmissions="1"/>
    <TextArea name="table_name_3" toName="text" placeholder="name" editable="true" maxSubmissions="1"/>
    <TextArea name="table_value_3" toName="text" placeholder="value" editable="true" maxSubmissions="1"/>
  </View>
</View>
```

## Related tags

- [Style](/tags/style.html)
- [Text](/tags/text.html)
- [TextArea](/tags/textarea.html)