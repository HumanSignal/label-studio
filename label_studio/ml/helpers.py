from abc import abstractmethod
from label_studio.ml import LabelStudioMLBase


class LabelStudioMLBaseHelper(LabelStudioMLBase):

    @abstractmethod
    def prepare_tasks(self, tasks, workdir=None, **kwargs):
        pass

    @abstractmethod
    def convert_predictions(self, predictions, **kwargs):
        pass

    @abstractmethod
    def predict2(self, X, y=None, **kwargs):
        pass

    @abstractmethod
    def fit2(self, X, y, **kwargs):
        pass

    def predict(self, tasks, **kwargs):
        X, y = self.prepare_tasks(tasks, **kwargs)
        predictions = self.predict2(X, y, **kwargs)
        result = self.convert_predictions(predictions, **kwargs)
        return result

    def fit(self, completions, workdir=None, **kwargs):
        X, y = self.prepare_tasks(completions, workdir=workdir, **kwargs)
        return self.fit2(X, y, **kwargs)

    def _has_annotation(self, task):
        return 'completions' in task


class LabelStudioMLChoices(LabelStudioMLBaseHelper):

    def __init__(self, **kwargs):
        super(LabelStudioMLChoices, self).__init__(**kwargs)
        assert len(self.parsed_label_config) == 1
        self.from_name, self.info = list(self.parsed_label_config.items())[0]
        assert self.info['type'] == 'Choices'
        assert len(self.info['to_name']) == 1
        assert len(self.info['inputs']) == 1
        self.to_name = self.info['to_name'][0]
        self.value = self.info['inputs'][0]['value']

    def prepare_tasks(self, tasks, workdir=None, **kwargs):
        X, y = [], []
        for task in tasks:
            X.append(task['data'][self.value])
            if self._has_annotation(task):
                choices = task['completions'][0]['result'][0]['value']['choices']
                y.append(choices)
            else:
                y.append(None)
        return X, y

    def convert_predictions(self, predictions, **kwargs):
        list_choices, scores = predictions
        results = []
        for choices, score in zip(list_choices, scores):
            result = [{
                'from_name': self.from_name,
                'to_name': self.to_name,
                'type': 'choices',
                'value': {'choices': choices}
            }]
            results.append({'result': result, 'score': score})
        return results