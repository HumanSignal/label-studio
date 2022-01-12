---
title: Document Retrieval
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 602
meta_title: 
meta_description: 
---

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