---
title: Evaluate RAG with Ragas
type: templates
category: LLM Evaluations
cat: llm-evaluations
order: 970
is_new: t
meta_description: Use Ragas metrics to evaluation LLM responses. 
date: 2024-07-26 14:49:57
---

<img src="/images/templates/evaluate-rag-automated-metrics.png" alt="" class="gif-border" width="700px"/>

This template uses the [Ragas](https://docs.ragas.io/en/stable/) framework to evaluate your RAG pipeline. When given a prompt, it will use Ragas and OpenAI to return the following:

* An LLM-generated response to the prompt (the ML backend example uses OpenAI). 
* Ragas scores for [faithfulness](https://docs.ragas.io/en/latest/concepts/metrics/faithfulness.html) and [answer relevancy](https://docs.ragas.io/en/latest/concepts/metrics/answer_relevance.html).
* An LLM-generated evaluation of the response. 
* A comprehensive overview of precisely which documents were used for context. 

## Prerequisites

This template requires an ML backend to work. Follow the instructions outlined in [RAG Quickstart Labeling](https://github.com/HumanSignal/label-studio-ml-backend/tree/agi-builders-workshop-rag/label_studio_ml/examples/rag_quickstart) to connect the ML backend to your project. 

You will need an OpenAI API key and a directory with documentation files to use as context. 

!!! info Tip
    If you are just looking to experiment with this template and the ML backend, you can clone the [Label Studio repository](https://github.com/HumanSignal/label-studio) and use the `label-studio\docs` directory as your context. 

## Configure the labeling interface

Use the following labeling configuration for your project:

```xml
<View>
    <Style>
        .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
        .text-container {
        background-color: white;
        border-radius: 10px;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
        padding: 20px;
        font-family: 'Courier New', monospace;
        line-height: 1.6;
        font-size: 16px;
        }
        .ragas input {
            background: none;
            border: none;
            padding: 0;
            margin-top: -8px;
            font-size: 20px;
            font-weight: 600;
        }
        .ragas input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
    </Style>
    <Header value="Question:"/>
    <View className="text-container">
        <Text name="context" value="$text"/>
    </View>
    <Header value="Additional instructions for the LLM prompt (optional):"/>
    <View className="prompt">
        <TextArea name="prompt"
                  toName="context"
                  rows="4"
                  editable="true"
                  showSubmitButton="false"
                  placeholder="Provide additional instructions here then Shift+Enter - to provide none, simply enter a space then shift+enter."
        />
    </View>
    <Header value="Response:"/>
    <TextArea name="response"
              toName="context"
              rows="4"
              editable="true"
              maxSubmissions="1"
              showSubmitButton="false"
              smart="false"
              placeholder="Generated response will appear here..."
    />
  	<View className="ragas" >
    <View style="display: flex;">
      <Header style="padding-right: 1em;" value="Ragas evaluation (averaged, 0 to 100):"/><Number name="float_eval" toName="context" defaultValue="0" />
    </View>
    <TextArea name="ragas"
              toName="context"
              rows="2"
              maxSubmissions="1"
              showSubmitButton="false"
              smart="false"
              placeholder="Ragas evaluation will appear here..."
    />
  	</View>
    <View className="evaluation" >
    <View style="display: flex;">
      <Header style="padding-right: 1em;" value="Textual evaluation:"/>
    </View>
    <TextArea name="evaluation"
              toName="context"
              rows="2"
              maxSubmissions="1"
              showSubmitButton="false"
              smart="false"
              placeholder="Textual evaluation will appear here..."
    />
    </View>
    <Header value="Documentation:"/>
    <View className="documentation">
    <TextArea name="documentation"
              toName="context"
              rows="2"
              maxSubmissions="1"
              showSubmitButton="false"
              smart="false"
              placeholder="Retrieved documentation will appear here..."
    />
    </View>
</View>
```

This configuration includes the following elements:

* `<View>` - All labeling configurations must include a base `View` tag. In this configuration, the `View` tag is used to configure the display of blocks, similar to the div tag in HTML. It helps in organizing the layout of the labeling interface.
* `<Style>` - The `Style` tag is used to define CSS styles that apply to the elements within the `View`. In this configuration, it sets styles for various classes various sections of the labeling interface layout. 
* `<Header>` - The `Header` tag is used to display a header or title within the labeling interface. The text of the header is defined in the `value` parameter. 
* `<TextArea>` -  The `TextArea` tag provides a field where you can enter text. In this case, most of the text fields will be auto-completed by the ML backend. There is one field where you can provide additional instructions to the LLM (for example, by asking it to format the answer as a list). Press **Shift + Enter** to submit your instructions. 


## Input data

Using the configuration above, you would want to structure your input data to have a `text` element. This is the LLM prompt. For example:

```json
[
  {
    "id": 1,
    "data": {
      "text": "What are the system requirements for Label Studio?"
    }
  },
  {
    "id": 2,
    "data": {
      "text": "How do I update Label Studio?"
    }
  }
]
```

## Related tags

- [View](/tags/view.html)
- [Style](/tags/style.html)
- [TextArea](/tags/textarea.html)
- [Header](/tags/header.html)
