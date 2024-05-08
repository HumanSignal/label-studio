---
title: Hugging Face NER
type: guide
tier: all
order: 25
hide_menu: true
hide_frontmatter_title: true
meta_title: Label Studio tutorial to run Hugging Face NER backend
meta_description: This tutorial explains how to run a Hugging Face NER backend in Label Studio. 
categories:
    - Natural Language Processing
    - Named Entity Recognition
    - Hugging Face
image: "/tutorials/hf-ner.png"
---

<!--

-->

# Hugging Face NER model with Label Studio

This project uses a custom machine learning backend model for Named Entity Recognition (NER) with Hugging Face's transformers and Label Studio.

The model instantiates `AutoModelForTokenClassification` from Hugging Face's transformers library and fine-tunes it on the NER task.

- If you want to use this model only in inference mode, it serves predictions from the pre-trained model. 
- If you want to fine-tune the model, you can use the Label Studio interface to provide training data and train the model.

Read more about the compatible models from [Hugging Face's official documentation](https://huggingface.co/docs/transformers/en/tasks/token_classification)


## Labeling configuration

This ML backend works with the default NER template from Label Studio. You can find this by selecting Label Studio's pre-built NER template when configuring the labeling interface. It is available under **Natural Language Processing > Named Entity Recognition**:

```xml
<View>
  <Labels name="label" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>

  <Text name="text" value="$text"/>
</View>
```

You can then customize the template to suit your needs (for example, modifying the label names). However, note the model outputs compatibility:

> If you plan to use your model only for the inference, make sure the output label names are compatible with what is listed in XML labeling configuration. If you plan to train the model, you have to provide the baseline pretrained model that can be fine-tuned (i.e. where the last layer can be trained, for example, `distilbert/distilbert-base-uncased`). Otherwise, you may see the error about tensor sizes mismatch during training.

## Running with Docker (recommended)

1. Start the Machine Learning backend on `http://localhost:9090` with the prebuilt image:

```bash
docker-compose up
```

2. Validate that backend is running

```bash
$ curl http://localhost:9090/
{"status":"UP"}
```

3. Create a project in Label Studio. Then from the **Model** page in the project settings, [connect the model](https://labelstud.io/guide/ml#Connect-the-model-to-Label-Studio). The default URL is `http://localhost:9090`.


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
label-studio-ml start ./huggingface_ner
```

# Configuration

Parameters can be set in `docker-compose.yml` before running the container.


The following common parameters are available:
- `BASIC_AUTH_USER` - Specify the basic auth user for the model server
- `BASIC_AUTH_PASS` - Specify the basic auth password for the model server
- `LOG_LEVEL` - Set the log level for the model server
- `WORKERS` - Specify the number of workers for the model server
- `THREADS` - Specify the number of threads for the model server
- `BASELINE_MODEL_NAME`: The name of the baseline model to use. Default is `dslim/bert-base-NER`.
- `FINETUNED_MODEL_NAME`: The name of the fine-tuned model. Default is `finetuned_model`.
- `LABEL_STUDIO_HOST`: The host of the Label Studio instance. Default is 'http://localhost:8080'.
- `LABEL_STUDIO_API_KEY`: The API key for the Label Studio instance.
- `START_TRAINING_EACH_N_UPDATES`: The number of updates after which to start training. Default is `10`.
- `LEARNING_RATE`: The learning rate for the model. Default is `1e-3`.
- `NUM_TRAIN_EPOCHS`: The number of training epochs. Default is `10`.
- `WEIGHT_DECAY`: The weight decay for the model. Default is `0.01`.
- `MODEL_DIR`: The directory where the model is stored. Default is `'./results'`.

> Note: The `LABEL_STUDIO_API_KEY` is required for training the model. This can be found by logging
  into Label Studio and [going to the **Account & Settings** page](https://labelstud.io/guide/user_account#Access-token). 

# Customization

The ML backend can be customized by adding your own models and logic inside `./huggingface_ner/model.py`.

Modify the `predict()` and `fit()` methods to implement your own logic.