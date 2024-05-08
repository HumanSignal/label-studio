---
title: Automatic Speech Recognition with NVidia NeMo
type: guide
tier: all
order: 60
hide_menu: true
hide_frontmatter_title: true
meta_title: Automatic Speech Recognition with NeMo
meta_description: Tutorial on how to use set up Nvidia NeMo to use for ASR tasks in Label Studio
categories:
    - Audio/Speech Processing
    - Automatic Speech Recognition
    - NeMo
    - NVidia
image: "/tutorials/nvidia.png"
---

<!--

-->

# ASR with NeMo

This example demonstrates how to use the [NeMo](https://github.com/NVIDIA/NeMo/blob/main/nemo/collections/asr/README.md) to perform ASR (Automatic Speech Recognition) in Label Studio.

Use this model if you want to transcribe and fix your audio data.

## Labeling interface

This example works with the Label Studio's pre-built **Audio Transcription** template (available under **Audio Processing > Audio Transcription**).  

```xml
<View>
  <Audio name="audio" value="$audio" zoom="true" hotkey="ctrl+enter" />
  <Header value="Provide Transcription" />
  <TextArea name="transcription" toName="audio"
            rows="4" editable="true" maxSubmissions="1" />
</View>
```

But you can use any other labeling interface that combines `<Audio>` and `<TextArea>` elements.

> Warning: If you use files hosted in Label Studio (e.g. audio files directly uploaded via import dialog), you must provide the `LABEL_STUDIO_URL` and `LABEL_STUDIO_API_KEY` environment variables to the ML backend. For more information about finding your Label Studio API key, [see our documentation](https://labelstud.io/guide/user_account#Access-token).

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
label-studio-ml start ./nemo_asr
```

## Configuration

Parameters can be set in `docker-compose.yml` before running the container.


The following common parameters are available:
- `MODEL_NAME` - Specify the model name for the ASR. (`QuartzNet15x5Base-En` by default)
- `BASIC_AUTH_USER` - Specify the basic auth user for the model server
- `BASIC_AUTH_PASS` - Specify the basic auth password for the model server
- `LOG_LEVEL` - Set the log level for the model server
- `WORKERS` - Specify the number of workers for the model server
- `THREADS` - Specify the number of threads for the model server
- `LABEL_STUDIO_HOST`: The host of the Label Studio instance. Default is `http://localhost:8080`.
- `LABEL_STUDIO_API_KEY`: The API key for the Label Studio instance.

## Customization

The ML backend can be customized by adding your own models and logic inside `./nemo_asr/model.py`.