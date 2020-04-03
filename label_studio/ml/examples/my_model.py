import random

from label_studio.ml import LabelStudioMLBase


class MyModel(LabelStudioMLBase):

    def __init__(self, **kwargs):
        super(MyModel, self).__init__(**kwargs)

        from_name, schema = list(self.parsed_schema.items())[0]
        self.from_name = from_name
        self.to_name = schema['to_name'][0]
        self.labels = schema['labels']
        print('schema=', self.schema)
        print('data=', self.data)
        print('from_name=', self.from_name)
        print('to_name=', self.to_name)
        print('labels=', self.labels)

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
            print(f'Model {self.data} predicts {task}: result {results[-1]}')
        return results

    def fit(self, completions, **kwargs):
        print(completions)
        return {'random': random.randint(1, 10)}
