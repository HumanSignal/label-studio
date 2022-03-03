---
title: Document Retrieval
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 502
meta_title: Document Retrieval Data Labeling Template
meta_description: Template for annotating documents for document retrieval tasks with Label Studio for your machine learning and data science projects. 
---

<img src="/images/templates/document-retrieval.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to start training document retrieval or recommender models, you might want to develop a dataset with that identifies similar documents. Use this template to identify and choose documents that are related to a specific query or an existing document.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Text name="query" value="$query" />
  <Header value="Select document related to the query:" />
  <View style="display: flex">
    <View>
    <Text name="text1" value="$text1" />
    <Text name="text2" value="$text2" />
    <Text name="text3" value="$text3" />
    </View>
    <View style="padding: 30px">
    <Choices name="selection" toName="query" required="true" choice="multiple">
      <Choice value="One" />
      <Choice value="Two" />
  	  <Choice value="Three" />
    </Choices>
    </View>
  </View>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [Text](/tags/text.html) object tag to specify the text data to be annotated:
```xml
<Text name="query" value="$query" />
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Select document related to the query:" />
```  

Add styling to the [View](/tags/view.html) tag to control the appearance of the text samples and choices
```xml
<View style="display: flex">
```

Wrap the text snippets in a new [View](/tags/view.html) tag and use the [Text](/tags/text.html) object tag to display 3 other text snippets:
```xml
<View>
    <Text name="text1" value="$text1" />
    <Text name="text2" value="$text2" />
    <Text name="text3" value="$text3" />
</View>
```
    
Add styling to another [View](/tags/view.html) tag to place the choices next to the text samples, then use the [Choices](/tags/choices.html) control tag to require a selection from annotators and allow them to select multiple text snippets that apply:
```xml
<View style="padding: 30px">
    <Choices name="selection" toName="query" required="true" choice="multiple">
      <Choice value="One" />
      <Choice value="Two" />
  	  <Choice value="Three" />
    </Choices>
</View>
```

## Related tags

- [Text](/tags/text.html)
- [View](/tags/view.html)
- [Choices](/tags/choices.html)
