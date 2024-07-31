---
title: Evaluate RAG with Human Feedback
type: templates
category: LLM Evaluations
cat: llm-evaluations
order: 965
is_new: t
meta_description: Evaluate the contextual relevancy of retrieved documents and rate the LLM response. 
date: 2024-07-26 14:49:29
---

<img src="/images/templates/evaluate-rag-human-feedback.png" alt="" class="gif-border" width="700px"/>

When dealing with RAG (Retrieval-Augmented Generation) pipeline, your goal is not only evaluating a single LLM response, but also incorporating various assessments of the retrieved documents like contextual and answer relevancy and faithfulness.

In this example, you will create a labeling interface that aims to evaluate:

- Contextual relevancy of the retrieved documents
- Answer relevancy
- Answer faithfulness

For a tutorial on how to use this template with the Label Studio SDK, see [Evaluate LLM Responses](https://api.labelstud.io/tutorials/tutorials/evaluate-llm-responses). 

## Configure the labeling interface

[Create a project](/guide/setup_project) with the following labeling configuration:

```xml
<View>
  <Style>
    .htx-text {white - space: pre-wrap;}
    .question {
    font - size: 120%;
    width: 800px;
    margin-bottom: 0.5em;
    border: 1px solid #eee;
    padding: 0 1em 1em 1em;
    background: #fefefe;
  }
    .answer {
    font - size: 120%;
    width: 800px;
    margin-top: 0.5em;
    border: 1px solid #eee;
    padding: 0 1em 1em 1em;
    background: #fefefe;
  }
    .doc-body {
    white - space: pre-wrap;
    overflow-wrap: break-word;
    word-break: keep-all;
  }
    .doc-footer {
    font - size: 85%;
    overflow-wrap: break-word;
    word-break: keep-all;
  }
    h3 + p + p {font - size: 85%;} /* doc id */
  </Style>

  <View className="question">
    <Header value="Question"/>
    <Text name="question" value="$question"/>
  </View>

  <View style="margin-top: 2em">
    <Header value="Context"/>
    <List name="results" value="$similar_docs" title="Retrieved Documents"/>
    <Ranker name="rank" toName="results">
      <Bucket name="relevant" title="Relevant"/>
      <Bucket name="non_relevant" title="Non Relevant"/>
    </Ranker>
  </View>

  <View className="answer">
    <Header value="Answer"/>
    <Text name="answer" value="$answer"/>
  </View>
  <Collapse>
    <Panel value="How relevant is the answer to the provided context?">
      <Choices name="answer_relevancy" toName="question" showInline="true">
        <Choice value="Relevant" html="&lt;div class=&quot;thumb-container&quot; style=&quot;display: flex; gap: 20px;&quot;&gt;
  &lt;div class=&quot;thumb-box&quot; id=&quot;thumb-up&quot; style=&quot;width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;&quot;&gt;
      &lt;span class=&quot;thumb-icon&quot; style=&quot;font-size: 48px;&quot;&gt;&amp;#128077;&lt;/span&gt; &lt;!-- Thumbs Up Emoji --&gt;
  &lt;/div&gt;&lt;/div&gt;"/>
        <Choice value="Non Relevant" html="&lt;div class=&quot;thumb-container&quot; style=&quot;display: flex; gap: 20px;&quot;&gt;
&lt;div class=&quot;thumb-box&quot; id=&quot;thumb-down&quot; style=&quot;width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;&quot;&gt;
      &lt;span class=&quot;thumb-icon&quot; style=&quot;font-size: 48px;&quot;&gt;&amp;#128078;&lt;/span&gt; &lt;!-- Thumbs Down Emoji --&gt;
  &lt;/div&gt;
&lt;/div&gt;"/>
      </Choices>

    </Panel>
  </Collapse>

  <Collapse>
    <Panel value="If the answer factually aligns with the retrieved context?">
      <Choices name="faithfulness" toName="question" showInline="true">
        <Choice value="Relevant" html="&lt;div class=&quot;thumb-container&quot; style=&quot;display: flex; gap: 20px;&quot;&gt;
  &lt;div class=&quot;thumb-box&quot; id=&quot;thumb-up&quot; style=&quot;width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;&quot;&gt;
      &lt;span class=&quot;thumb-icon&quot; style=&quot;font-size: 48px;&quot;&gt;&amp;#128077;&lt;/span&gt; &lt;!-- Thumbs Up Emoji --&gt;
  &lt;/div&gt;&lt;/div&gt;"/>
        <Choice value="Non Relevant" html="&lt;div class=&quot;thumb-container&quot; style=&quot;display: flex; gap: 20px;&quot;&gt;
&lt;div class=&quot;thumb-box&quot; id=&quot;thumb-down&quot; style=&quot;width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;&quot;&gt;
      &lt;span class=&quot;thumb-icon&quot; style=&quot;font-size: 48px;&quot;&gt;&amp;#128078;&lt;/span&gt; &lt;!-- Thumbs Down Emoji --&gt;
  &lt;/div&gt;
&lt;/div&gt;"/>
      </Choices>

    </Panel>
  </Collapse>
</View>
```

This configuration includes the following elements:

* `<View>` - All labeling configurations must include a base `View` tag. In this configuration, the `View` tag is used to configure the display of blocks, similar to the div tag in HTML. It helps in organizing the layout of the labeling interface.
* `<Style>` - The `Style` tag is used to define CSS styles that apply to the elements within the `View`. In this configuration, it sets styles for various classes various sections of the labeling interface layout. 
* `<Header>` - The `Header` tag is used to display a header or title within the labeling interface. The text of the header is defined in the `value` parameter. 
* `<Text>` -  The `Text` tag is used to display text provided by the input data. Given the example input data below, the text blocks are either displaying information from the `question` or `answer` keys in the source JSON. You will likely want to adjust these variables to match your own JSON data. 
* `<List>` - List the retrieved documents. Given the example input data below, you are populating the list from the `similar_docs` field in the source JSON. 
* `<Ranker>` - The `Ranker` tag creates UI elements that allow you to rank the list items by dragging and dropping them into different buckets.
* `<Bucket>` - The `Bucket` tag defines a category or container within the Ranker where items can be placed.
- `<Collapse>` - The `Collapse` tag creates a collapsible section that can be expanded or collapsed by the user.
- `<Panel>` - The `Panel` tag is used within a Collapse element to define the content that can be expanded or collapsed.
- `<Choices>` - The `Choices` tag presents a set of options for the annotator to choose from, specified by the `name` and `toName` parameters.
- `<Choice>` - The `Choice` tag defines an individual option within the Choices tag. In this example, choices are stylized to appear as clickable thumbs up and thumbs down icons. 


## Input data

In this example, you are including the prompt, the response, and the documents used for context.  

```json
[
  {
    "data": {
      "question": "Can I use Label Studio for LLM evaluation?",
      "answer": "Yes, you can use Label Studio for LLM evaluation.",
      "similar_docs": [
        {"id": 0, "body": "Label Studio is a data labeling tool."},
        {"id": 1, "body": "Label Studio is a data labeling tool for AI projects."}
      ]
    }
  }
]
```

### Use LlamaIndex

You can collect such data using the [LlamaIndex framework](https://www.llamaindex.ai/).

```
pip install llama-index
```

For example, you can use a script to create a RAG pipeline to answer user queries regarding GitHub issues:

```python
import os
from llama_index.readers.github import GitHubRepositoryIssuesReader, GitHubIssuesClient
from llama_index.core import VectorStoreIndex, StorageContext, load_index_from_storage
from llama_index.core.callbacks import CallbackManager, LlamaDebugHandler, CBEventType

reader = GitHubRepositoryIssuesReader(
github_client=GitHubIssuesClient(),
owner="HumanSignal",
repo="label-studio",
)

llama_debug = LlamaDebugHandler()
callback_manager = CallbackManager([llama_debug])


# check if storage already exists
PERSIST_DIR = "./llama-index-storage"
if not os.path.exists(PERSIST_DIR):
# load the documents and create the index
documents = reader.load_data(state=GitHubRepositoryIssuesReader.IssueState.CLOSED)
index = VectorStoreIndex.from_documents(documents, callback_manager=callback_manager)
# store it for later
index.storage_context.persist(persist_dir=PERSIST_DIR)
else:
# load the existing index
storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
index = load_index_from_storage(storage_context, callback_manager=callback_manager)

query_engine = index.as_query_engine()
question = "Can I use Label Studio for LLM evaluation?"
answer = query_engine.query(query)

# accessing the list of top retrieved documents from callback
event_pairs = llama_debug.get_event_pairs(CBEventType.RETRIEVE)
retrieved_nodes = list(event_pairs[0][1].payload.values())[0]
retrieved_documents = [node.text for node in retrieved_nodes]
```

Now you can use the SDK to construct a task that can be directly imported into Label Studio project given the labeling configuration described above:

```python
task = {
  "question": question,
  "answer": answer,
  "similar_docs": [{"id": i, "body": text} for i, text in enumerate(retrieved_documents)]
}
```

## Related tags

- [View](/tags/view.html)
- [Style](/tags/style.html)
- [Text](/tags/text.html)
- [Header](/tags/header.html)
- [Ranker](/tags/ranker.html)
- [Collapse](/tags/collapse.html)
- [List](/tags/list.html)
- [Choices](/tags/choices.html)
- [Choice](/tags/choice.html)