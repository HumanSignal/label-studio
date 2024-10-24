---
title: Classify text with a BERT model
type: guide
tier: all
order: 35
hide_menu: true
hide_frontmatter_title: true
meta_title: BERT-based text classification
meta_description: Tutorial on how to use BERT-based text classification with your Label Studio project
categories:
    - Natural Language Processing
    - Text Classification
    - BERT
    - Hugging Face
image: "/tutorials/bert.png"
---

# BERT-based text classification

The NewModel is a BERT-based text classification model that is designed to work with Label Studio. This model uses the Hugging Face Transformers library to fine-tune a BERT model for text classification. The model is trained on the labeled data from Label Studio and then used to make predictions on new data.  With this model connected to Label Studio, you can: 

- Train a BERT model on your labeled data directly from Label Studio.
- Use any model for [AutoModelForSequenceClassification](https://huggingface.co/transformers/v3.0.2/model_doc/auto.html#automodelforsequenceclassification) from the Hugging Face model hub.
- Fine-tune the model on your specific task and use it to make predictions on new data.
- Automatically download the labeled tasks from Label Studio and prepare the data for training.
- Customize the training parameters such as learning rate, number of epochs, and weight decay.

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`bert_classifier` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/bert_classifier). 


## Running with Docker (recommended)

1. Start the Machine Learning backend on `http://localhost:9090` with the prebuilt image:

```bash
docker-compose up
```

2. Validate that backend is running:

```bash
$ curl http://localhost:9090/
{"status":"UP"}
```

3. Create a project in Label Studio. Then from the **Model** page in the project settings, [connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio). The default URL is `http://localhost:9090`.

> Warning! Note the current limitation of the ML backend: models are loaded dynamically from huggingface.co. You may need the `HF_TOKEN` env variable provided in your environment. Consequently, this may result in a slow response time for the first prediction request. If you are experiencing timeouts on Label Studio side (i.e., no predictions are visible when opening the task), check the logs of the ML backend for any errors, and refresh the page in a few minutes.

## Building from source (advanced)

To build the ML backend from source, you have to clone the repository and build the Docker image:

```bash
docker-compose build
```

## Running without Docker (advanced)

To run the ML backend without Docker, you have to clone the repository and install all dependencies using pip:

```bash
python -m venv ml-backend
source ml-backend/bin/activate
pip install -r requirements.txt
```

Then you can start the ML backend:

```bash
label-studio-ml start ./dir_with_your_model
```


## Labeling configuration

In project `Settings > Labeling Interface > Browse Templates > Natural Language Processing > Text Classification`, you can find the default labeling configuration for text classification in Label Studio. This configuration includes a single `<Choices>` output and a single `<Text>` input. 
Feel free to modify the set of labels in the `<Choices>` tag to match your specific task, for example:

```xml
<View>
  <Text name="text" value="$text" />
  <Choices name="label" toName="text" choice="single" showInLine="true">
    <Choice value="label one" />
    <Choice value="label two" />
      <Choice value="label three" />
  </Choices>
</View>
```


## Configuration

Parameters can be set in `docker-compose.yml` before running the container.

The following common parameters are available:

- `BASIC_AUTH_USER` - Specify the basic auth user for the model server
- `BASIC_AUTH_PASS` - Specify the basic auth password for the model server
- `LOG_LEVEL` - Set the log level for the model server
- `WORKERS` - Specify the number of workers for the model server
- `THREADS` - Specify the number of threads for the model server
- `BASELINE_MODEL_NAME`: The name of the baseline model to use for training. Default is `bert-base-multilingual-cased`.

## Training

The following parameters are available for training:

- `LABEL_STUDIO_HOST` (required): The URL of the Label Studio instance. Default is `http://localhost:8080`.
- `LABEL_STUDIO_API_KEY` (required): The [API key](https://labelstud.io/guide/user_account#Access-token) for the Label Studio instance.
- `START_TRAINING_EACH_N_UPDATES`: The number of labeled tasks to download from Label Studio before starting training. Default is 10.
- `LEARNING_RATE`: The learning rate for the model training. Default is 2e-5.
- `NUM_TRAIN_EPOCHS`: The number of epochs for model training. Default is 3.
- `WEIGHT_DECAY`: The weight decay for the model training. Default is 0.01.
- `FINETUNED_MODEL_NAME`: The name of the fine-tuned model. Default is `finetuned_model`. Checkpoints will be saved under this name.

> Note: The `LABEL_STUDIO_API_KEY` is required for training the model. You can find the API key in Label Studio under the [**Account & Settings** page](https://labelstud.io/guide/user_account#Access-token).


# Customization

The ML backend can be customized by adding your own models and logic inside the `./bert_classifier` directory.