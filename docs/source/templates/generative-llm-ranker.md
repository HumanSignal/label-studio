---
title: LLM Ranker
type: templates
category: Generative AI
cat: generative-ai
order: 906
is_new: t
meta_title: Create a Ranked Dataset for LLMs with Label Studio
meta_description: Create a ranked dataset for LLMs with Label Studio for your machine learning and data science projects.
---

## Overview

This template provides you with a worklow to rank the quality of a large language model (LLM) responses.

Using this template will give you the ability to compare the quality of the responses from different LLMs,and rank the dynamic set of items with a handy drag-and-drop interface.

This enables the following use cases:

1. Categorize the LLM responses by different types: relevant, irrelevant, biased, offensive, etc.
2. Compare and rank the quality of the responses from different models.
3. Rank contextual items for retrieval-augmented generation based chat bots and in-context learning.
4. Build [the preference model for RLHF](https://github.com/heartexlabs/RLHF)
5. Evaluate results of semantic search
6. [LLM routing](https://betterprogramming.pub/unifying-llm-powered-qa-techniques-with-routing-abstractions-438e2499a0d0)

Looking for a model to get started with the fine-tuning process? Check out [our guide on the Label Studio Blog](https://labelstud.io/blog/five-large-language-models-you-can-fine-tune-today/).

## How to create the dataset

Collect a prompt and a list of items you want to display in each task in the following JSON format:

```json
{
  "prompt": "What caused the ancient library of Alexandria to be destroyed?",
  "items": [
    { "id": "llm_1", "title": "LLM 1", "body": "Wars led to library's ruin." },
    { "id": "llm_2", "title": "LLM 2", "body": "Library's end through various wars." },
    { "id": "llm_3", "title": "LLM 3", "body": "Ruin resulted from library wars." }
  ]
}
```

Collect dataset examples and store them in `dataset.json` file.

## How to configure the labeling interface

The `LLM Ranker` template includes the following labeling interface in XML format:

```xml
<View>
   <View style="display: flex; align-items: center; font-size: 1em;">
      <View style="margin: 0.5em 0.5em 0 0;">
        <Header value="Task: " style="font-size: 1em;"/>
      </View>
      <Text name="task" value="Drag and rank the given AI model responses based on their relevance to the prompt and the level of perceived bias."/>
    </View>
   <View style="display: flex; align-items: center; box-shadow: 2px 2px 5px #999; padding: 10px; border-radius: 5px; background-color: #E0E0E0; font-size: 1.25em;">
      <View style="margin: 0 1em 0 0">
        <Header value="Prompt: "  />
      </View>
      <Text name="prompt" value="$prompt"/>
    </View>
    <View>
      <List name="answers" value="$items" title="All Results" />
      <Style>
        .htx-ranker-column {
          background: #f8f8f8;
          width: 50%;
          padding: 20px;
          border-radius: 3px;
          box-shadow: 0px 2px 5px 0px rgba(0,0,0,0.1);
        }
    
        .htx-ranker-item {
          background: #e0e0e0;
          color: #333;
          font-size: 16px;
          width: 100%;
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 3px;
          box-shadow: 0px 2px 5px 0px rgba(0,0,0,0.1);
        }
        .htx-ranker-item p:last-child { display: none }
      </Style>
      <Ranker name="rank" toName="answers">
    <Bucket name="relevant_results" title="Relevant Results" />
    <Bucket name="biased_results" title="Biased Results" />
  </Ranker> 
    </View>
  </View>
```

The configuration includes the following elements:

- `<Text>` - the tag that instructs to display the prompt. The `value` attribute should be set to the name of the prompt element, i.e. `prompt` in this case.
- `<List>` - the tag that instructs to display the list of items. The `value` attribute should be set to the name of the list element (in this case `items`).
- `<Ranker>` - the tag that instructs to ranker the items in the list. The `toName` attribute should be set to the name of the list element.
- `<Bucket>` - the tag that instructs to create a bucket for the ranked items. Each bucket represents the high-level category of items to be ranked inside this category. The `name` attribute should be set to the name of the bucket.

Items can be styled in Style tag by using `.htx-ranker-item` class.

## Starting your labeling project

*Need a hand getting started with Label Studio? Check out our [Zero to One Tutorial](https://labelstud.io/blog/zero-to-one-getting-started-with-label-studio/).*

1. Create new project in Label Studio
2. Go to `Settings > Labeling Interface > Browse Templates > Generative AI > LLM Ranker`
3. Save the project

Alternatively, you can create project by using our Python SDK:

```python
import label_studio_sdk

ls = label_studio_sdk.Client('YOUR_LABEL_STUDIO_URL', 'YOUR_API_KEY')
project = ls.create_project(title='LLM Ranker', label_config='<View>...</View>')
```

## Import the dataset

To import your dataset, in the project settings go to `Import` and upload the dataset file `dataset.json`.

Using the Python SDK, import the dataset with input prompts into Label Studio using the `PROJECT_ID` of the project you've just created.

Run the following code:

```python
from label_studio_sdk import Client

ls = Client(url='<YOUR-LABEL-STUDIO-URL>', api_key='<YOUR-API_KEY>')

project = ls.get_project(id=PROJECT_ID)
project.import_tasks('dataset.json')
```

If you want to create prelabeled data (for example, ranked order of the items produced by LLM), you can import the dataset with pre-annotations:

```python
project.import_tasks([{
    "data": {"prompt": "...", "items": [...]},
    "predictions": [{
          "type": "ranker",
          "value": {
            "ranker": {
              "_": [
                "llm_2",
                "llm_1"
              ],
              "biased_results": ["llm_3"],
              "relevant_results": []
            }
          },
          "to_name": "prompt",
          "from_name": "rank"
        }]
}])
```
Under `"value"` group, you can specify different bucket names. Note `"_"` used as a special key that represents the original, non-categorized list.

## Export the dataset

Labeling results can be exported in JSON format. To export the dataset, go to `Export` in the project settings and download the file.

Using python SDK you can export the dataset with annotations from Label Studio

```python
annotations = project.export_tasks(format='JSON')
```

The output of annotations in `"value"` is expected to contain the following structure:

```json
"value": {
    "ranker": {
      "_": [
        "llm_2",
        "llm_1"
      ],
      "biased_results": ["llm_3"],
      "relevant_results": []
    }
}
```

where:

- `"_"` is a special key that represents the original, non-categorized list (same as in the import preannotations example above).
- `"biased_results"` and `"relevant_results"` are the names of the buckets defined in the labeling interface.

## Related tags

- [Ranker](/tags/ranker.html)
- [List](/tags/list.html)
- [Text](/tags/text.html)
