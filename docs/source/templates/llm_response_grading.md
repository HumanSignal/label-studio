---
title: LLM Response Grading
type: templates
category: LLM Evaluations
cat: llm-evaluations
order: 955
is_new: t
meta_description:  Assigning a grade to LLM responses based on how well it meets your internal guidelines. 
date: 2024-07-26 14:48:00
---

<img src="/images/templates/response-grading.png" alt="" class="gif-border" width="700px"/>

Sometimes it is useful to assign a grade to the LLM response based on the quality of the generated text.

In this example, you are grading an LLM's ability to summarize a document. The input data includes the document and the summary, and then you are rating the summary on a scale of 1 through 5. 

For a tutorial on how to use this template with the Label Studio SDK, see [Evaluate LLM Responses](https://api.labelstud.io/tutorials/tutorials/evaluate-llm-responses). 

## Configure the labeling interface

[Create a project](/guide/setup_project) with the following labeling configuration:

```xml
<View>
<Style>
  .root {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  }
  .container {
  display: flex;
  flex: 1;
  }
  .block {
  flex: 1;
  padding: 20px;
  box-sizing: border-box;
  }
  .scrollable {
  overflow-y: auto;
  height: calc(100vh - 80px); /* Adjust height to accommodate header and footer */
  }
  .long-document {
  background-color: #f9f9f9;
  border-right: 1px solid #ddd;
  }
  .short-summary {
  background-color: #f1f1f1;
  }
  .summary-rating {
  padding: 20px;
  background-color: #c3bcbc;
  border-top: 1px solid #ddd;
  text-align: center;
  }
  h2 {
  margin-top: 0;
  }
</Style>
<View className="root">
<View className="container">
  <View className="block long-document scrollable">
    <Header value="Long Document"/>
    <Text name="document" value="$document"/>
  </View>
  <View className="block short-summary">
    <Header value="Short Summary"/>
    <Text name="summary" value="$summary"/>
  </View>
</View>
<View className="summary-rating">
  <Header value="Rate the Document Summary:"/>
  <Rating name="rating" toName="summary" required="true"/>
</View>
</View>
</View>
```

This configuration includes the following elements:

* `<View>` - All labeling configurations must include a base `View` tag. In this configuration, the `View` tag is used to configure the display of blocks, similar to the div tag in HTML. It helps in organizing the layout of the labeling interface.
* `<Style>` - The `Style` tag is used to define CSS styles that apply to the elements within the `View`. In this configuration, it sets styles for various classes various sections of the labeling interface layout. 
* `<Header>` - The `Header` tag is used to display a header or title within the labeling interface. It takes a value attribute to set the text of the header. For example, `<Header value="Long Document"/>` displays "Long Document" as a header.
* `<Text>` -  The `Text` tag is used to display text provided by the input data. Given the example input data below, the text blocks are either displaying information from the `document` or `summary` keys in the JSON. You will likely want to adjust the value to match your own JSON structure.
* `<Rating>` - This displays star icons that you can use to rate the summary. You can customize the attributes for this tag to change the max rating. 


## Input data

Using the configuration above, you would want to structure your input data to have a `document` and `summary` element. For example:

```json
[
  {
    "data": {
      "document": [
        "Opossums, commonly known as possums in North America, are marsupials found primarily in the Americas. The most well-known species is the Virginia opossum (Didelphis virginiana), which ranges from Central America and the eastern United States to southern Canada. These adaptable creatures are known for their ability to thrive in a variety of environments, including both rural and urban areas. Opossums are also found in South America, where different species inhabit a range of ecosystems, from tropical rainforests to temperate forests.",
        "Opossums are highly adaptable in terms of habitat, often residing in woodlands, farmland, and even suburban backyards. They typically seek shelter in hollow trees, abandoned burrows, or any dark, enclosed space they can find. Opossums are nocturnal and omnivorous, with a diet that includes fruits, insects, small animals, and even carrion. Their opportunistic feeding habits contribute to their resilience and ability to live in close proximity to human settlements.",
        "In terms of behavior, opossums are solitary and nomadic, often moving to different locations in search of food. They are known for their unique defense mechanism of 'playing dead' or 'playing possum' when threatened, which involves mimicking the appearance and smell of a sick or dead animal to deter predators. Opossums have relatively short lifespans, typically living only 2 to 4 years in the wild. Despite their short lives, they reproduce quickly, with females giving birth to large litters of up to 20 young, although not all offspring typically survive to maturity.",
        "In popular culture, opossums often appear as symbols of resilience and survival due to their hardy nature and ability to adapt to various environments. They are sometimes depicted in a comical or misunderstood light, given their nocturnal habits and somewhat disheveled appearance. Despite this, they play a crucial role in the ecosystem by controlling insect and rodent populations and cleaning up carrion. Opossums have been featured in various forms of media, from cartoons and children's books to movies, often emphasizing their unique behaviors and survival strategies."
      ],
      "summary": "Opossums, primarily found in the Americas, are adaptable marsupials known for thriving in diverse environments, from rural to urban areas. They are nocturnal and omnivorous, often seeking shelter in dark, enclosed spaces and employing a unique defense mechanism of 'playing dead' to deter predators. In popular culture, opossums symbolize resilience and survival, playing a crucial role in ecosystems by controlling insect and rodent populations and cleaning up carrion."
    }
  }
]
```


## Related tags

- [View](/tags/view.html)
- [Style](/tags/style.html)
- [Header](/tags/header.html)
- [Text](/tags/text.html)
- [Rating](/tags/rating.html)