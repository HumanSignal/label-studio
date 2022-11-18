"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import ujson as json

from functools import reduce
from operator import getitem
from urllib.parse import urlparse
from django.conf import settings
from rest_framework.exceptions import ValidationError
from core.label_config import replace_task_data_undefined_with_config_field


class SkipField(Exception):
    pass


_DATA_TYPES = {
    'Text': [str, int, float],
    'Header': [str, int, float],
    'HyperText': [str],
    'Image': [str, list],
    'Paragraphs': [list, str],
    'Table': [dict, str],
    'TimeSeries': [dict, list, str],
    'TimeSeriesChannel': [dict, list, str],
    'List': [list],
    'Choices': [str, list],
    'PolygonLabels': [str, list],
    'Labels': [str, list],
    'BrushLabels': [str, list],
    'EllipseLabels': [str, list],
    'HyperTextLabels': [str, list],
    'KeyPointLabels': [str, list],
    'ParagraphLabels': [str, list],
    'RectangleLabels': [str, list],
    'TimeSeriesLabels': [str, list],
    'Taxonomy': [str, list],
}
logger = logging.getLogger(__name__)


class TaskValidator:
    """ Task Validator with project scheme configs validation. It is equal to TaskSerializer from django backend.
    """
    def __init__(self, project, instance=None):
        self.project = project
        self.instance = instance
        self.annotation_count = 0
        self.prediction_count = 0

    @staticmethod
    def check_data(project, data):
        """ Validate data from task['data']
        """
        if data is None:
            raise ValidationError('Task is empty (None)')

        replace_task_data_undefined_with_config_field(data, project)

        # iterate over data types from project
        for data_key, data_type in project.data_types.items():

            # get array name in case of Repeater tag
            is_array = '[' in data_key
            data_key = data_key.split('[')[0]

            if "." in data_key:
                keys = data_key.split(".")
                try:
                    data_item = reduce(getitem, keys, data)
                except KeyError:
                    raise ValidationError('"{data_key}" key is expected in task data'.format(data_key=data_key))
            else:
                if data_key not in data:
                    raise ValidationError('"{data_key}" key is expected in task data'.format(data_key=data_key))
                data_item = data[data_key]

            if is_array:
                expected_types = (list, )
            else:
                expected_types = _DATA_TYPES.get(data_type, (str,))

            if not isinstance(data_item, tuple(expected_types)):
                raise ValidationError('data[\'{data_key}\']={data_value} is of type \'{type}\', '
                                      "but the object tag {data_type} expects the following types: {expected_types}"
                                      .format(data_key=data_key, data_value=data_item,
                                              type=type(data_item).__name__, data_type=data_type,
                                              expected_types=[e.__name__ for e in expected_types]))

            if data_type == 'List':
                for item in data_item:
                    key = 'text'  # FIXME: read key from config (elementValue from List)
                    if key not in item:
                        raise ValidationError('Each item from List must have key "' + key + '"')

        return data

    @staticmethod
    def check_data_and_root(project, data, dict_is_root=False):
        """ Check data consistent and data is dict with task or dict['task'] is task

        :param project:
        :param data:
        :param dict_is_root:
        :return:
        """
        try:
            TaskValidator.check_data(project, data)
        except ValidationError as e:
            if dict_is_root:
                raise ValidationError(e.detail[0] + ' [assume: item as is = task root with values] ')
            else:
                raise ValidationError(e.detail[0] + ' [assume: item["data"] = task root with values]')

    @staticmethod
    def check_allowed(task):
        # task is required
        if 'data' not in task:
            return False

        # everything is ok
        return True

    @staticmethod
    def raise_if_wrong_class(task, key, class_def):
        if key in task and not isinstance(task[key], class_def):
            raise ValidationError('Task[{key}] must be {class_def}'.format(key=key, class_def=class_def))

    def validate(self, task):
        """ Validate whole task with task['data'] and task['annotations']. task['predictions']
        """
        # task is class
        if hasattr(task, 'data'):
            self.check_data_and_root(self.project, task.data)
            return task

        # self.instance is loaded by get_object of view
        if self.instance and hasattr(self.instance, 'data'):
            if isinstance(self.instance.data, dict):
                data = self.instance.data
            elif isinstance(self.instance.data, str):
                try:
                    data = json.loads(self.instance.data)
                except ValueError as e:
                    raise ValidationError("Can't parse task data: " + str(e))
            else:
                raise ValidationError('Field "data" must be string or dict, but not "' + type(self.instance.data) + '"')
            self.check_data_and_root(self.instance.project, data)
            return task

        # check task is dict
        if not isinstance(task, dict):
            raise ValidationError('Task root must be dict with "data", "meta", "annotations", "predictions" fields')

        # task[data] | task[annotations] | task[predictions] | task[meta]
        if self.check_allowed(task):
            # task[data]
            self.raise_if_wrong_class(task, 'data', (dict, list))
            self.check_data_and_root(self.project, task['data'])

            # task[annotations]: we can't use AnnotationSerializer for validation
            # because it's much different with validation we need here
            self.raise_if_wrong_class(task, 'annotations', list)
            for annotation in task.get('annotations', []):
                if not isinstance(annotation, dict):
                    logger.warning('Annotation must be dict, but "%s" found', str(type(annotation)))
                    continue

                ok = 'result' in annotation
                if not ok:
                    raise ValidationError('Annotation must have "result" fields')

                # check result is list
                if not isinstance(annotation.get('result', []), list):
                    raise ValidationError('"result" field in annotation must be list')

            # task[predictions]
            self.raise_if_wrong_class(task, 'predictions', list)
            for prediction in task.get('predictions', []):
                if not isinstance(prediction, dict):
                    logger.warning('Prediction must be dict, but "%s" found', str(type(prediction)))
                    continue

                ok = 'result' in prediction
                if not ok:
                    raise ValidationError('Prediction must have "result" fields')

            # task[meta]
            self.raise_if_wrong_class(task, 'meta', (dict, list))

        # task is data as is, validate task as data and move it to task['data']
        else:
            self.check_data_and_root(self.project, task, dict_is_root=True)
            task = {'data': task}

        return task

    @staticmethod
    def format_error(i, detail, item):
        if len(detail) == 1:
            code = (str(detail[0].code + ' ')) if detail[0].code != "invalid" else ''
            return 'Error {code} at item {i}: {detail} :: {item}'\
                .format(code=code, i=i, detail=detail[0], item=item)
        else:
            errors = ', '.join(detail)
            codes = str([d.code for d in detail])
            return 'Errors {codes} at item {i}: {errors} :: {item}'\
                .format(codes=codes, i=i, errors=errors, item=item)

    def to_internal_value(self, data):
        """ Body of run_validation for all data items
        """
        if data is None:
            raise ValidationError('All tasks are empty (None)')

        if not isinstance(data, list):
            raise ValidationError('data is not a list')

        if len(data) == 0:
            raise ValidationError('data is empty')

        ret, errors = [], []
        self.annotation_count, self.prediction_count = 0, 0
        for i, item in enumerate(data):
            try:
                validated = self.validate(item)
            except ValidationError as exc:
                error = self.format_error(i, exc.detail, item)
                errors.append(error)
                # do not print to user too many errors
                if len(errors) >= 100:
                    errors[99] = '...'
                    break
            else:
                ret.append(validated)
                errors.append({})

                if 'annotations' in item:
                    self.annotation_count += len(item['annotations'])
                if 'predictions' in item:
                    self.prediction_count += len(item['predictions'])

        if any(errors):
            logger.warning('Can\'t deserialize tasks due to ' + str(errors))
            raise ValidationError(errors)

        return ret


def is_url(string):
    try:
        result = urlparse(string.strip())
        return all([result.scheme, result.netloc])
    except ValueError:
        return False
