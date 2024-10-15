---
title: RAG with a Langchain search agent
type: guide
tier: all
order: 45
hide_menu: true
hide_frontmatter_title: true
meta_title: RAG with a Langchain search agent
meta_description: Use Langchain, OpenAI, and Google to generate responses based on Google search results. 
categories:
    - Generative AI
    - Retrieval Augmented Generation
    - Google
    - OpenAI
    - Langchain
image: "/tutorials/langchain.png"
---

# Langchain search agent

This example demonstrates how to use Label Studio with a custom Machine Learning backend.

It uses a [Langchain](https://www.langchain.com/)-based agent that accepts a text input, searches for Google,
and returns the answer based on the search results (a.k.a Retrieval Augmented Generation).

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`langchain_search_agent` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/langchain_search_agent). 

## Prerequisites

### Use Google Search

To use the Google search engine, you need to have a Google Custom Search Engine (CSE) API key and a search engine ID.

```
GOOGLE_API_KEY=<your_google_api_key>
GOOGLE_CSE_ID=<your_google_search_engine_id>
```

For more information, see [Programmable Search Engine ID](https://support.google.com/programmable-search/answer/12499034?hl=en).

### Use OpenAI

To use OpenAI, you need to have an OpenAI API key.

```
OPENAI_API_KEY=<your_openai_api_key>
```

For more information, see [Where do I find my OpenAI API Key?](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key).

## Labeling interface

The labeling interface must include:

- Input prompt
- LLM response
- Search results snippets
- Classification labels

#### Example

```xml

<View>
    <Style>
        .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
    </Style>
    <Text name="input" value="$text"/>
    <View className="prompt">
        <TextArea name="prompt" toName="input" maxSubmissions="1" editable="true"/>
    </View>
    <TextArea name="response" toName="input" maxSubmissions="1" editable="true"/>
    <TextArea name="snippets" toName="input"/>
    <Choices name="classification" toName="input" choice="single" showInLine="true">
        <Choice value="Good"/>
        <Choice value="Bad"/>
    </Choices>
</View>
```

## Quickstart

1. Build and start the Machine Learning backend on `http://localhost:9090`:

```bash
docker-compose up
```

2. Validate that the backend is running:

```bash
$ curl http://localhost:9090/health
{"status":"UP"}
```

3. Create a project in Label Studio. Then from the **Model** page in the project settings, [connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio). The default URL is `http://localhost:9090`.