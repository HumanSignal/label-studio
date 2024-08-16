---
title: Visual Ranker
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 560
is_new: t
meta_title: Create a ranked dataset for text-to-image models with Label Studio
meta_description: Template for creating a ranked dataset for text-to-image models with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/visual-ranker.png" alt="" class="gif-border" width="700px"/>

The template provides the workflow to rank the quality of the text-to-image models responses, like Dall-E, Midjourney, Stable Diffusion etc.

Using this template gives the ability to compare the quality of the responses from different generative AI  models, and rank the dynamic set of items with handy drag-and-drop interface.

This is helpful for the following use cases:

1. Categorize the responses by different types: relevant, irrelevant, biased, offensive, etc.
2. Compare and rank the quality of the responses from different models.
3. Evaluate results of semantic search
4. Personalisation and recommendation systems, marketplace product search

## How to create the dataset

Collect a prompt and a list of images you want to display in each task in the following form:

```json

[{
  "prompt": "Generate a high-quality image of a stylish, ergonomic chair for a home office. ",
  "images": [
      {
          "id": "chair_1",
          "html": "<img src='/static/samples/chairs/chair1.png'/>"
      },
        {
          "id": "chair_2",
          "html": "<img src='/static/samples/chairs/chair2.png'/>"
      },
        {
          "id": "chair_3",
          "html": "<img src='/static/samples/chairs/chair3.png'/>"
      },
        {
          "id": "chair_4",
          "html": "<img src='/static/samples/chairs/chair4.png'/>"
      }
  ]
}, ...]
```

Each each contain `"html"` field where you can specify the path to the image you want to display.
This is a generic HTML renderer, so you can use any HTML tags here.

Collect dataset examples and store them in `dataset.json` file.

## Starting your labeling project

*Need a hand getting started with Label Studio? Check out our [Zero to One Tutorial](https://labelstud.io/blog/zero-to-one-getting-started-with-label-studio/).*

1. Create a  new project in Label Studio
2. Go to `Settings > Labeling Interface > Browse Templates > Generative AI > LLM Ranker`
3. Save the project

Alternatively, you can create project by using python SDK:

```python
import label_studio_sdk

ls = label_studio_sdk.Client('YOUR_LABEL_STUDIO_URL', 'YOUR_API_KEY')
project = ls.create_project(title='Visual Ranker', label_config='<View>...</View>')
```

## Import the dataset

To import dataset, in the project settings go to `Import` and upload the dataset file `dataset.json`.

Using python SDK you can import the dataset with input prompts into Label Studio. With the `PROJECT_ID` of the project
you've just created, run the following code:

```python
from label_studio_sdk import Client

ls = Client(url='<YOUR-LABEL-STUDIO-URL>', api_key='<YOUR-API_KEY>')

project = ls.get_project(id=PROJECT_ID)
project.import_tasks('dataset.json')
```

## Setup the labeling interface

Use the following configuration for the labeling interface:

```xml
<View>
      <Style>
          <!-- Customize your CSS styles here -->
      </Style>

   <View className="product-panel">
      <Text name="prompt" value="$prompt"/>
    </View>
    <View>
      <List name="generated_images" value="$images" title="Generated Images" />
      <Ranker name="rank" toName="generated_images">
  </Ranker> 
    </View>
  </View>
```
It includes the following elements:
- `<Text>` that defines the prompt for the task
- `<List>` that displays the list of generated images to assess
- `<Ranker>` that adds functionality to rerank the images

## Export the dataset

Labeling results can be exported in JSON format. To export the dataset, go to `Export` in the project settings and download the file.

Using the Python SDK you can export the dataset with annotations from Label Studio.

```python
annotations = project.export_tasks(format='JSON')
```

The output of annotations in `"value"` is expected to contain the following structure:

```json
"value": {
    "ranker": {
      "rank": [
        "chair_2",
        "chair_4",
        "chair_3",
        "chair_1"
      ]
    }
}
```

The items in the list are "id" of the images, sorted in the ranked order

## Related tags

- [Ranker](/tags/ranker.html)
- [List](/tags/list.html)
