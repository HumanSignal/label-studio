---
title: Evaluate RAG with RAGAS
type: templates
category: LLM Evals
cat: llm-evals
order: 970
is_new: t
meta_description: Use RAGAS metrics to evaluation LLM responses. 
date: 2024-07-26 14:49:57
---

<img src="/images/templates/evaluate-rag-automated-metrics.png" alt="" class="gif-border" />

You can use this template when working with the RAG quickstart ML backend. NEED TO LINK AFTER MERGE

The RAGAS ML backend connects Label Studio to [OpenAI](https://platform.openai.com/), allowing you to interact with chat and embedding models. 

It supports question answering and evaluation using RAG, given a list of questions as tasks, and a folder containing documentation (for example, a `/docs` path within a Github repository that has been cloned on your computer).

The labeling interface includes the following elements:

- A question that is provided to the LLM. This is defined in `text` field of your source JSON. 
- Additional instructions to pass to the AI. You can input these instructions in a text field in Label Studio to pass to OpenAI.  
- 

## Configure the labeling interface

[Create a project](/guide/setup_project) with the following labeling configuration. Once you have created the project, you will need to connect the ML backend. (LIIIINK)

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
      <Header style="padding-right: 1em;" value="RAGAS evaluation (averaged, 0 to 100):"/><Number name="float_eval" toName="context" defaultValue="0" />
    </View>
    <TextArea name="ragas"
              toName="context"
              rows="2"
              maxSubmissions="1"
              showSubmitButton="false"
              smart="false"
              placeholder="RAGAS evaluation will appear here..."
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

## Input data

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