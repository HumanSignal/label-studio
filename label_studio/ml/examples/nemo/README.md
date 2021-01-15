This an example of using [NVidia's NeMo toolkit](https://github.com/NVIDIA/NeMo) for creating ASR/NLU/TTS pre-labelings.

## Automatic Speech Recognition

With ASR models, you can do the audio pre-annotations drawn within a text areas (aka _transcriptions_).

<div style="margin:auto; text-align:center; width:100%"><img src="/images/nemo-asr.png" style="opacity: 0.7"/></div>


1. Follow [this installation guide](https://github.com/NVIDIA/NeMo#installation) to setup NeMo environment
2. Initialize Label Studio machine learning backend
    ```bash
    label-studio-ml init my_model --from label_studio/ml/examples/nemo/asr.py
    ```
3. Start machine learning backend:
   ```bash
   label-studio-ml start my_model
   ```
   
Once this app started on the default 9090 port, go to the Label Studio app's project settings page, 
select `Transcription whole audio` from the templates list (or create your own with `<TextArea>` and `<Audio>` included)
