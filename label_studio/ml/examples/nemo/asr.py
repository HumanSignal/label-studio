import os
import logging
import nemo
import nemo.collections.asr as nemo_asr

from label_studio.ml import LabelStudioMLBase


logger = logging.getLogger(__name__)


class NemoASR(LabelStudioMLBase):

    def __init__(self, model_name='QuartzNet15x5Base-En', **kwargs):
        super(NemoASR, self).__init__(**kwargs)

        # Find TextArea control tag and bind ASR model to it
        self.from_name, self.to_name, self.value = self._bind_to_textarea()

        # This line will download pre-trained QuartzNet15x5 model from NVIDIA's NGC cloud and instantiate it for you
        self.model = nemo_asr.models.EncDecCTCModel.from_pretrained(model_name=model_name)

    def predict(self, tasks, **kwargs):
        audio_path = self.get_local_path(tasks[0]['data'][self.value])
        transcription = self.model.transcribe(paths2audio_files=[audio_path])[0]
        return [{
            'result': [{
                'from_name': self.from_name,
                'to_name': self.to_name,
                'type': 'textarea',
                'value': {
                    'text': [transcription]
                }
            }],
            'score': 1.0
        }]

    def _bind_to_textarea(self):
        from_name, to_name, value = None, None, None
        for tag_name, tag_info in self.parsed_label_config.items():
            if tag_info['type'] == 'TextArea':
                from_name = tag_name
                if len(tag_info['inputs']) > 1:
                    logger.warning(
                        'ASR model works with single Audio or AudioPlus input, '
                        'but {0} found: {1}. We\'ll use only the first one'.format(
                            len(tag_info['inputs']), ', '.join(tag_info['to_name'])))
                if tag_info['inputs'][0]['type'] not in ('Audio', 'AudioPlus'):
                    raise ValueError('{0} tag expected to be of type Audio or AudioPlus, but type {1} found'.format(
                        tag_info['to_name'][0], tag_info['inputs'][0]['type']))
                to_name = tag_info['to_name'][0]
                value = tag_info['inputs'][0]['value']
        if from_name is None:
            raise ValueError('ASR model expects <TextArea> tag to be presented in a label config.')
        return from_name, to_name, value

    def fit(self, completions, workdir=None, **kwargs):
        project_path = kwargs.get('project_full_path')
        if os.path.exists(project_path):
            logger.info('Found project in local path ' + project_path)
        else:
            logger.error('Project not found in local path ' + project_path + '. Serving uploaded data will fail.')
        return {'project_path': project_path}
