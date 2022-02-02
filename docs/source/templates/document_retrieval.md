---
title: Document Retrieval
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 602
meta_title: Document Retrieval Data Labeling Template
meta_description: Template for annotating documents for document retrieval tasks with Label Studio for your machine learning and data science projects. 
---

If you want to start training document retrieval or recommender models, you might want to develop a dataset with that identifies similar documents. Use this template to identify and choose documents that are related to a specific query or an existing document.

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

## Related tags

- [Text](/tags/text.html)
- [Choices](/tags/choices.html)