import os

from PyInquirer import prompt


class LabelStudioConfigPrompt(object):

    def __init__(self, config):
        self.config = config

    def _ask_path(self, what, message):
        question = [{
            'type': 'input',
            'name': what,
            'message': message,
            'default': self.config[what]
        }]
        answer = prompt(question)[what]
        if not os.path.exists(answer):
            raise FileNotFoundError()
        return answer

    def ask_input_path(self):
        return self._ask_path('input_path', 'Type your input data path with tasks:')

    def ask_output_dir(self):
        return self._ask_path('output_dir', 'Type your output directory path with completions:')

    def ask_label_config(self):
        return self._ask_path('label_config', 'Type your XML-formatted label config path:')
