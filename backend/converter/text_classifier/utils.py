import os
import io
import json

from glob import glob


def iter_text_choices(input_dir, data_key=None):
    if not os.path.exists(input_dir):
        raise FileNotFoundError(f'{input_dir} doesn\'t exist')
    for datafile in glob(os.path.join(input_dir, '*.json')):
        with io.open(datafile) as f:
            data = json.load(f)
        result = data['completions'][0]['result'][0]
        input_data = data['data']
        if len(input_data) > 1 and data_key is None:
            raise ValueError(f'"data" field contains multiple keys, so we can\'t figure out which one is used.'
                             f'Please specify "data_key" as argument')
        elif len(input_data) == 1 and data_key is None:
            text = list(input_data.values())[0]
        else:
            text = input_data[data_key]
        yield text, result['value']['choices'][0]



