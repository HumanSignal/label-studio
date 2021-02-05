This an example of using [Nvidia's NeMo toolkit](https://github.com/NVIDIA/NeMo) for creating ASR/NLU/TTS pre-labels.

## Automatic Speech Recognition

With ASR models, you can do audio pre-annotations drawn within a text area, aka _transcriptions_.

<div style="margin:auto; text-align:center; width:100%"><img src="/images/nemo-asr.png" style="opacity: 0.7"/></div>


1. Follow [this installation guide](https://github.com/NVIDIA/NeMo#installation) to set up NeMo environment
2. Initialize Label Studio machine learning backend
    ```bash
    label-studio-ml init my_model --from label_studio/ml/examples/nemo/asr.py
    ```
3. Start machine learning backend:
   ```bash
   label-studio-ml start my_model
   ```
   
After this app starts on the default 9090 port, configure the template for ASR:
1. In Label Studio, open the project settings page.
2. From the templates list, select `Speech Transcription`. You can also create your own with `<TextArea>` and `<Audio>` tags. 
