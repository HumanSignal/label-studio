---
title: Side-by-Side LLM Output Comparison
type: templates
category: LLM Evaluations
cat: llm-evaluations
order: 960
is_new: t
meta_description: Evaluate a side-by-side comparison of two LLM responses. 
date: 2024-07-26 14:48:48
---

<img src="/images/templates/side-by-side-comparison.png" alt="" class="gif-border" width="700px"/>

Sometimes you need to compare two different model responses or compare the model response with a ground truth. In this template, two options are presented side by side, and then you click to select the one that matches your criteria. 

For a tutorial on how to use this template with the Label Studio SDK, see [Evaluate LLM Responses](https://api.labelstud.io/tutorials/tutorials/evaluate-llm-responses). 

## Configure the labeling interface

[Create a project](/guide/setup_project) with the following labeling configuration:

```xml
<View className="root">
  <Style>
    .root {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Roboto',
        sans-serif;
      line-height: 1.6;
      background-color: #f0f0f0;
    }

    .container {
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 5px;
      box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.1), 0 6px 20px 0 rgba(0, 0, 0, 0.1);
    }

    .prompt {
      padding: 20px;
      background-color: #0084ff;
      color: #ffffff;
      border-radius: 5px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1), 0 3px 10px 0 rgba(0, 0, 0, 0.1);
    }

    .answers {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
    }

    .answer-box {
      flex-basis: 49%;
      padding: 20px;
      background-color: rgba(44, 62, 80, 0.9);
      color: #ffffff;
      border-radius: 5px;
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1), 0 3px 10px 0 rgba(0, 0, 0, 0.1);
    }

    .answer-box p {
      word-wrap: break-word;
    }

    .answer-box:hover {
      background-color: rgba(52, 73, 94, 0.9);
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .lsf-richtext__line:hover {
      background: unset;
    }

    .answer-box .lsf-object {
      padding: 20px
    }
  </Style>
  <View className="container">
    <View className="prompt">
      <Text name="prompt" value="$prompt" />
    </View>
    <View className="answers">
      <Pairwise name="comparison" toName="answer1,answer2"
                selectionStyle="background-color: #27ae60; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.2); border: 2px solid #2ecc71; cursor: pointer; transition: all 0.3s ease;" />
      <View className="answer-box">
        <Text name="answer1" value="$answer1" />
      </View>
      <View className="answer-box">
        <Text name="answer2" value="$answer2" />
      </View>
    </View>
  </View>
</View>
```

This configuration includes the following elements:

* `<View>` - All labeling configurations must include a base `View` tag. In this configuration, the `View` tag is used to configure the display of blocks, similar to the div tag in HTML. It helps in organizing the layout of the labeling interface.
* `<Style>` - The `Style` tag is used to define CSS styles that apply to the elements within the `View`. In this configuration, it sets styles for various classes various sections of the labeling interface layout. 
* `<Text>` -  The `Text` tag is used to display text provided by the input data. Given the example input data below, the text blocks are either displaying information from the `prompt` or one of the responses (`answer1` or `answer2`). You will likely want to adjust the values to match your own JSON structure. 
* `<Pairwise>` - The `Pairwise` tag is used to display the selection element. It presents the options for the user to click and select. Read more about [Label Studio template for pairwise comparison](generative-pairwise-human-preference).

## Input data

In this example, you are including the prompt and then two responses from different LLMs. 

```json
[
  {
    "data": {
      "prompt": "What is the capital of France?",
      "answer1": "Paris",
      "answer2": "London"
    }
  }
]
```



## Related tags

- [View](/tags/view.html)
- [Style](/tags/style.html)
- [Text](/tags/text.html)
- [Pairwise](/tags/pairwise.html)