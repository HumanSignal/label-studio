---
title:
type: blog
order: 60
---

## Automatic Speech Recognition

This an example of using [Nvidia's NeMo toolkit](https://github.com/NVIDIA/NeMo) for creating ASR/NLU/TTS pre-labels.

With ASR models, you can do audio pre-annotations drawn within a text area, aka _transcriptions_.

<div style="margin:auto; text-align:center; width:100%"><img src="/images/nemo-asr.png" style="opacity: 0.7"/></div>

## Start using it

1. Follow [this installation guide](https://github.com/NVIDIA/NeMo#installation) to set up the NeMo environment.

2. On the same server or Docker container as NeMo, [install Label Studio](https://labelstud.io/guide/#Quickstart). 

3. Create or download <a href="https://github.com/heartexlabs/label-studio/tree/master/label_studio_ml/examples/nemo/asr.py">asr.py</a> from Github into the current directory (or use `label_studio_ml/examples/nemo/asr.py` from the Label Studio package).

4. Initialize the Label Studio machine learning backend with the ASR example: 
    ```bash
    label-studio-ml init my_model --from asr.py
    ```
   
5. Start the machine learning backend:

   ```bash
   label-studio-ml start my_model
   ```
   Wait until ML backend app starts on the default 9090 port.

6. Start Label Studio: 
   ```bash
   label-studio start my_project --init
   ```
   
7. In Label Studio, open the project Settings page.

8. From the template list, select `Speech Transcription`. You can also create your own with `<TextArea>` and `<Audio>` tags. Or copy this labeling config into LS: 
    ```xml
    <View>
      <Header value="Audio transcription:"/>
      <Audio name="audio" value="$url" height="46"/>
      <TextArea name="answer" transcription="true"
                toName="audio" rows="3" maxSubmissions="1"/>
    
      <Style>
      [dataneedsupdate]{display:flex;align-items:center}
      [dataneedsupdate]>div:first-child{flex-grow:1;order:2}
      [dataneedsupdate]>div:last-child{margin-top:0 !important;margin-right:1em}
      [dataneedsupdate] button{height:46px}
      [dataneedsupdate] button span:nth-child(2){display:none}
      </Style>
    </View>
    ```
9. Open the Model page in Label Studio.
    > Note: The NeMo engine downloads models automatically. This can take some time and could cause Label Studio UI to hang on the Model page while the models download.   

10. Add the ML backend using this address: `http://localhost:9090`

11. Import audio data and start reviewing pre-labels.

