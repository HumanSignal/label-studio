import random

from label_studio.ml import LabelStudioMLBase


class DummyModel(LabelStudioMLBase):

    def __init__(self, **kwargs):
        super(DummyModel, self).__init__(**kwargs)

        from_name, schema = list(self.parsed_label_config.items())[0]
        self.from_name = from_name
        self.to_name = schema['to_name'][0]
        self.labels = schema['labels']

    def predict(self, tasks, **kwargs):
        results = []
        for task in tasks:
            results.append({
                'result': [{
                    'from_name': self.from_name,
                    'to_name': self.to_name,
                    'type': 'choices',
                    'value': {
                        'choices': [random.choice(self.labels)]
                    }
                }],
                'score': random.uniform(0, 1)
            })
        return results

    def fit(self, completions, **kwargs):
        return {'random': random.randint(1, 10)}
