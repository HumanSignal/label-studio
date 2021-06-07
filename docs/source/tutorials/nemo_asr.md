---
title:
type: blog
order: 60
---

## Automatic Speech Recognition with NVIDIA NeMo

This an example of using [Nvidia's NeMo toolkit](https://github.com/NVIDIA/NeMo) for creating Automatic Speech Recognition (ASR), Natural Language Understanding (NLU) or Text-to-Speech (TTS) pre-annotations.

With the NeMo ASR models, you can create audio pre-annotations with a text area, aka _transcriptions_.

<div style="margin:auto; text-align:center; width:100%"><img src="/images/nemo-asr.png" style="opacity: 0.7"/></div>

## Start using it

1. Follow [this installation guide](https://github.com/NVIDIA/NeMo#installation) to set up the NeMo environment.

2. On the same server or Docker container as NeMo, [install Label Studio](https://labelstud.io/guide/#Quickstart). 

3. Install the Label Studio machine learning backend. From the command line, run the following: 
```bash
git clone https://github.com/heartexlabs/label-studio-ml-backend  
```
4. Set up the Label Studio ML backend environment:
```bash
cd label-studio-ml-backend
# Install label-studio-ml and its dependencies
pip install -U -e .
# Install the nemo example dependencies
pip install -r label_studio_ml/examples/requirements.txt
```

5. Initialize the Label Studio machine learning backend with the ASR example
```bash
label-studio-ml init my_model --from label_studio_ml/examples/nemo/asr.py
```

6. Start the machine learning backend. By default, the model starts on localhost with port 9090.
```bash
label-studio-ml start my_model
```

7. Start Label Studio:
```bash
label-studio start my_project --init
```
   
8. In Label Studio, open the Settings page for your project and open the Labeling Interface section.

9. From the template list, select `Automatic Speech Recognition`. You can also create your own with `<TextArea>` and `<Audio>` tags. Or copy this labeling config into the Label Studio UI: 
```xml    
 <View>
  <Audio name="audio" value="url" zoom="true" hotkey="ctrl+enter" />
  <Header value="Provide Transcription" />
  <TextArea name="answer" transcription="true" toName="audio" rows="4" editable="true" maxSubmissions="1" />
</View>
```
10. In your project settings, open the Machine Learning page in the Label Studio UI. 
    > Note: It takes some time to download models from the NeMo engine. The Label Studio UI might hang until the models finish automatically downloading.

10. Click **Add Model** and add the ML backend using this URL: `http://localhost:9090`

11. Import audio data and start reviewing pre-annotations.

