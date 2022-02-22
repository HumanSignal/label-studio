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

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!-- Use the Text object tag to specify the text data to be annotated-->
  <Text name="query" value="$query" />
    <!-- Use the Header tag to provide instructions to the annotators-->
  <Header value="Select document related to the query:" />
    <!-- Add styling to the View tag to control the appearance of the text samples and choices-->
  <View style="display: flex">
    <View>
        <!-- Use the Text object tag to display 3 other text snippets-->
    <Text name="text1" value="$text1" />
    <Text name="text2" value="$text2" />
    <Text name="text3" value="$text3" />
    </View>
      <!-- Add styling to the View tag to place the choices next to the text samples-->
    <View style="padding: 30px">
        <!--Use the Choices control tag to require a selection from annotators, 
        and allow them to select multiple text snippets that apply-->
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
- [View](/tags/view.html)
- [Choices](/tags/choices.html)