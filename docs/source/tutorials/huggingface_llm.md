---
title: Hugging Face Large Language Model (LLM)
type: guide
tier: all
order: 20
hide_menu: true
hide_frontmatter_title: true
meta_title: Label Studio tutorial to run Hugging Face Large Language Model backend
meta_description: This tutorial explains how to run Hugging Face Large Language model backend in Label Studio. Hugging Face Large Language Model Backend is a machine learning backend designed to work with Label Studio, providing a custom model for text generation.
categories:
    - Generative AI
    - Large Language Model
    - Text Generation
    - Hugging Face
image: "/tutorials/hf-llm.png"
---

# Hugging Face Large Language Model backend

This machine learning backend is designed to work with Label Studio, providing a custom model for text generation. The model is based on the Hugging Face's transformers library and uses a pre-trained model.

Check [text generation pipelines on Hugging Face](https://huggingface.co/tasks/text-generation) for more details.

## Before you begin

Before you begin, you must install the [Label Studio ML backend](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#quickstart). 

This tutorial uses the [`huggingface_llm` example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/huggingface_llm). 

## Label Studio XML labeling config

This ML backend is compatible with a Label Studio labeling configuration that uses a `<TextArea>` tag. Here is an example of a compatible labeling configuration:

```xml
<View>
    <Text name="input_text" value="$text"/>
  <TextArea name="generated_text"  toName="input_text"/>
</View>
```

When you open the task in Label Studio, the text box will show the generated text based on the prompt defined in `<Text>`. Be sure you include some instructions in prompt (for example, _"Summarize the following text: ..."_) to see the meaningful results.

## Running with Docker (recommended)

1. Start the Machine Learning backend on `http://localhost:9090` with the prebuilt image:

```bash
docker-compose up
```

2. Validate that the backend is running:

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
label-studio-ml start ./huggingface_llm
```

# Configuration

Parameters can be set in `docker-compose.yml` before running the container.

The following common parameters are available:
- `MODEL_NAME`: The name of the pre-trained model to use for text generation. Default is `facebook/opt-125m`.
- `MAX_LENGTH`: The maximum length of the generated text. Default is `50`.
- `BASIC_AUTH_USER`: The basic auth user for the model server.
- `BASIC_AUTH_PASS`: The basic auth password for the model server.
- `LOG_LEVEL`: The log level for the model server.
- `WORKERS`: The number of workers for the model server.
- `THREADS`: The number of threads for the model server.

# Customization

The ML backend can be customized by adding your own models and logic inside the `./huggingface_llm` directory.