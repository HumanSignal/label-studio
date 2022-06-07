"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import ujson as json
import numbers

from django.db import transaction
from drf_dynamic_fields import DynamicFieldsMixin
from django.conf import settings

from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from rest_framework.exceptions import ValidationError
from rest_framework.fields import SkipField
from rest_framework.settings import api_settings
from rest_flex_fields import FlexFieldsModelSerializer

from core.feature_flags import flag_set
from projects.models import Project
from tasks.models import Task, Annotation, AnnotationDraft, Prediction
from tasks.validation import TaskValidator
from core.utils.common import get_object_with_check_and_log, retry_database_locked
from core.label_config import replace_task_data_undefined_with_config_field
from users.serializers import UserSerializer
from core.utils.common import load_func

logger = logging.getLogger(__name__)


class PredictionQuerySerializer(serializers.Serializer):
    task = serializers.IntegerField(required=False, help_text='Task ID to filter predictions')
    task__project = serializers.IntegerField(required=False, help_text='Project ID to filter predictions')


class PredictionSerializer(ModelSerializer):
    model_version = serializers.CharField(allow_blank=True, required=False)
    created_ago = serializers.CharField(default='', read_only=True, help_text='Delta time from creation time')

    class Meta:
        model = Prediction
        fields = '__all__'


class ListAnnotationSerializer(serializers.ListSerializer):
    pass


class AnnotationSerializer(ModelSerializer):
    """
    """
    created_username = serializers.SerializerMethodField(default='', read_only=True, help_text='Username string')
    created_ago = serializers.CharField(default='', read_only=True, help_text='Time delta from creation time')

    @classmethod
    def many_init(cls, *args, **kwargs):
        kwargs['child'] = cls(*args, **kwargs)
        return ListAnnotationSerializer(*args, **kwargs)

    def to_representation(self, instance):
        annotation = super(AnnotationSerializer, self).to_representation(instance)
        if self.context.get('completed_by', '') == 'full':
            annotation['completed_by'] = UserSerializer(instance.completed_by).data
        return annotation

    def get_fields(self):
        fields = super(AnnotationSerializer, self).get_fields()
        excluded = []

        # serializer for export format
        if self.context.get('export_mode', False):
            excluded += ['created_username', 'created_ago', 'task',
                         'was_cancelled', 'ground_truth', 'result_count']

        [fields.pop(field, None) for field in excluded]
        return fields

    def validate_result(self, value):
        data = value
        # convert from str to json if need
        if isinstance(value, str):
            try:
                data = json.loads(value)
            except:
                raise ValueError('annotation "result" can\'t be parse from str to JSON')

        # check result is list
        if not isinstance(data, list):
            raise ValidationError('annotation "result" field in annotation must be list')

        return data

    def get_created_username(self, annotation):
        user = annotation.completed_by
        if not user:
            return ""

        name = user.first_name
        if len(user.last_name):
            name = name + " " + user.last_name

        name += f' {user.email}, {user.id}'
        return name

    class Meta:
        model = Annotation
        exclude = ['prediction', 'result_count']


class TaskSimpleSerializer(ModelSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['annotations'] = AnnotationSerializer(many=True, default=[], context=self.context, read_only=True)
        self.fields['predictions'] = PredictionSerializer(many=True, default=[], context=self.context, read_only=True)

    def to_representation(self, instance):
        project = instance.project
        if project:
            # resolve $undefined$ key in task data
            data = instance.data
            replace_task_data_undefined_with_config_field(data, project)

        return super().to_representation(instance)

    class Meta:
        model = Task
        fields = '__all__'


class BaseTaskSerializer(FlexFieldsModelSerializer):
    """ Task Serializer with project scheme configs validation
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.context.get('include_annotations', True) and 'annotations' not in self.fields:
            self.fields['annotations'] = AnnotationSerializer(
                many=True, read_only=False, required=False, context=self.context
            )

    def project(self, task=None):
        """ Take the project from context
        """
        if 'project' in self.context:
            project = self.context['project']
        elif 'view' in self.context and 'project_id' in self.context['view'].kwargs:
            kwargs = self.context['view'].kwargs
            project = get_object_with_check_and_log(Project, kwargs['project_id'])
        elif task:
            project = task.project
        else:
            project = None
        return project

    def validate(self, task):
        instance = self.instance if hasattr(self, 'instance') else None
        validator = TaskValidator(self.project(), instance)
        return validator.validate(task)

    def to_representation(self, instance):
        project = self.project(instance)
        if project:
            # resolve uri for storage (s3/gcs/etc)
            if self.context.get('resolve_uri', False):
                instance.data = instance.resolve_uri(instance.data, project)

            # resolve $undefined$ key in task data
            data = instance.data
            replace_task_data_undefined_with_config_field(data, project)

        return super().to_representation(instance)

    class Meta:
        model = Task
        fields = '__all__'


class BaseTaskSerializerBulk(serializers.ListSerializer):
    """ Serialize task with annotation from source json data
    """
    annotations = AnnotationSerializer(many=True, default=[], read_only=True)
    predictions = PredictionSerializer(many=True, default=[], read_only=True)

    @property
    def project(self):
        return self.context.get('project')

    @staticmethod
    def format_error(i, detail, item):
        if len(detail) == 1:
            code = f' {detail[0].code}' if detail[0].code != "invalid" else ''
            return f'Error{code} at item {i}: {detail[0]} :: {item}'
        else:
            errors = ', '.join(detail)
            codes = [d.code for d in detail]
            return f'Errors {codes} at item {i}: {errors} :: {item}'

    def to_internal_value(self, data):
        """ Body of run_validation for all data items
        """
        if data is None:
            raise ValidationError('All tasks are empty (None)')

        if not isinstance(data, list):
            raise ValidationError({api_settings.NON_FIELD_ERRORS_KEY: 'not a list'}, code='not_a_list')

        if not self.allow_empty and len(data) == 0:
            if self.parent and self.partial:
                raise SkipField()
            raise ValidationError({api_settings.NON_FIELD_ERRORS_KEY: 'empty'}, code='empty')

        ret, errors = [], []
        self.annotation_count, self.prediction_count = 0, 0
        for i, item in enumerate(data):
            try:
                validated = self.child.validate(item)
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
            logger.warning("Can't deserialize tasks due to " + str(errors))
            raise ValidationError(errors)

        return ret

    def _insert_valid_completed_by_id_or_raise(self, annotations, members_email_to_id, members_ids, default_user):
        for annotation in annotations:
            completed_by = annotation.get('completed_by')
            # no completed_by info found - just skip it, will be assigned to the user who imports
            if completed_by is None:
                annotation['completed_by_id'] = default_user.id

            # resolve annotators by email
            elif isinstance(completed_by, dict):
                if 'email' not in completed_by:
                    raise ValidationError(f"It's expected to have 'email' field in 'completed_by' data in annotations")
                email = completed_by['email']
                if email not in members_email_to_id:
                    raise ValidationError(f"Unknown annotator's email {email}")
                # overwrite an actual member ID
                annotation['completed_by_id'] = members_email_to_id[email]

            # old style annotators specification - try to find them by ID
            elif isinstance(completed_by, int) and completed_by in members_ids:
                if completed_by not in members_ids:
                    raise ValidationError(f"Unknown annotator's ID {completed_by}")
                annotation['completed_by_id'] = completed_by

            # in any other cases - import validation error
            else:
                raise ValidationError(
                    f"Import data contains completed_by={completed_by} which is not a valid annotator's email or ID")
            annotation.pop('completed_by', None)

    @retry_database_locked()
    def create(self, validated_data):
        """ Create Tasks and Annotations in bulk
        """
        db_tasks, db_annotations, db_predictions, validated_tasks = [], [], [], validated_data
        logging.info(f'Try to serialize tasks with annotations, data len = {len(validated_data)}')
        user = self.context.get('user', None)

        organization = user.active_organization \
            if not self.project.created_by.active_organization else self.project.created_by.active_organization
        members_email_to_id = dict(organization.members.values_list('user__email', 'user__id'))
        members_ids = set(members_email_to_id.values())
        logger.debug(f"{len(members_email_to_id)} members found in organization {organization}")

        # to be sure we add tasks with annotations at the same time
        with transaction.atomic():

            # extract annotations and predictions
            task_annotations, task_predictions = [], []
            for task in validated_tasks:
                annotations = task.pop('annotations', [])
                # insert a valid "completed_by_id" by existing member
                self._insert_valid_completed_by_id_or_raise(
                    annotations, members_email_to_id, members_ids, user or self.project.created_by)
                predictions = task.pop('predictions', [])
                task_annotations.append(annotations)
                task_predictions.append(predictions)

            # add tasks first
            max_overlap = self.project.maximum_annotations

            # identify max inner id
            tasks = Task.objects.filter(project=self.project)
            prev_inner_id = tasks.order_by("-inner_id")[0].inner_id if tasks else 0
            max_inner_id = (prev_inner_id + 1) if prev_inner_id else 1

            for i, task in enumerate(validated_tasks):
                cancelled_annotations = len([ann for ann in task_annotations[i] if ann.get('was_cancelled', False)])
                total_annotations = len(task_annotations[i]) - cancelled_annotations
                t = Task(
                    project=self.project,
                    data=task['data'],
                    meta=task.get('meta', {}),
                    overlap=max_overlap,
                    is_labeled=len(task_annotations[i]) >= max_overlap,
                    file_upload_id=task.get('file_upload_id'),
                    inner_id=None if prev_inner_id is None else max_inner_id + i,
                    total_predictions=len(task_predictions[i]),
                    total_annotations=total_annotations,
                    cancelled_annotations=cancelled_annotations
                )
                db_tasks.append(t)

            if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
                self.db_tasks = []
                try:
                    last_task = Task.objects.latest('id')
                    current_id = last_task.id + 1
                except Task.DoesNotExist:
                    current_id = 1

                for task in db_tasks:
                    task.id = current_id
                    current_id += 1
                self.db_tasks = Task.objects.bulk_create(db_tasks, batch_size=settings.BATCH_SIZE)
            else:
                self.db_tasks = Task.objects.bulk_create(db_tasks, batch_size=settings.BATCH_SIZE)
            logging.info(f'Tasks serialization success, len = {len(self.db_tasks)}')

            # add annotations
            for i, annotations in enumerate(task_annotations):
                for annotation in annotations:
                    if not isinstance(annotation, dict):
                        continue

                    # support both "ground_truth" and "ground_truth"
                    ground_truth = annotation.pop('ground_truth', True)
                    was_cancelled = annotation.pop('was_cancelled', False)
                    lead_time = annotation.pop('lead_time', None)

                    body = {
                        'task': self.db_tasks[i],
                        'ground_truth': ground_truth,
                        'was_cancelled': was_cancelled,
                        'completed_by_id': annotation['completed_by_id'],
                        'result': annotation['result'],
                        'lead_time': lead_time
                    }
                    body = self.add_annotation_fields(body, user, 'imported')
                    db_annotations.append(Annotation(**body))

            # add predictions
            last_model_version = None
            for i, predictions in enumerate(task_predictions):
                for prediction in predictions:
                    if not isinstance(prediction, dict):
                        continue

                    # we need to call result normalizer here since "bulk_create" doesn't call save() method
                    result = Prediction.prepare_prediction_result(prediction['result'], self.project)
                    prediction_score = prediction.get('score')
                    if prediction_score is not None:
                        try:
                            prediction_score = float(prediction_score)
                        except ValueError as exc:
                            logger.error(
                                f'Can\'t upload prediction score: should be in float format. Reason: {exc}.'
                                f'Fallback to score=None', exc_info=True)
                            prediction_score = None

                    last_model_version = prediction.get('model_version', 'undefined')
                    db_predictions.append(Prediction(task=self.db_tasks[i],
                                                     result=result,
                                                     score=prediction_score,
                                                     model_version=last_model_version))

            # annotations: DB bulk create
            if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
                self.db_annotations = []
                try:
                    last_annotation = Annotation.objects.latest('id')
                    current_id = last_annotation.id + 1
                except Annotation.DoesNotExist:
                    current_id = 1

                for annotation in db_annotations:
                    annotation.id = current_id
                    current_id += 1
                self.db_annotations = Annotation.objects.bulk_create(db_annotations, batch_size=settings.BATCH_SIZE)
            else:
                self.db_annotations = Annotation.objects.bulk_create(db_annotations, batch_size=settings.BATCH_SIZE)
            logging.info(f'Annotations serialization success, len = {len(self.db_annotations)}')

            # predictions: DB bulk create
            self.db_predictions = Prediction.objects.bulk_create(db_predictions, batch_size=settings.BATCH_SIZE)
            logging.info(f'Predictions serialization success, len = {len(self.db_predictions)}')

            # renew project model version if it's empty
            if not self.project.model_version and last_model_version is not None:
                self.project.model_version = last_model_version
                self.project.save()

        self.post_process_annotations(user, self.db_annotations, 'imported')
        return db_tasks

    @staticmethod
    def post_process_annotations(user, db_annotations, action):
        pass

    @staticmethod
    def add_annotation_fields(body, user, action):
        return body

    class Meta:
        model = Task
        fields = "__all__"


TaskSerializer = load_func(settings.TASK_SERIALIZER)


class TaskWithAnnotationsSerializer(TaskSerializer):
    """
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['annotations'] = AnnotationSerializer(many=True, default=[], context=self.context)

    class Meta:
        model = Task
        list_serializer_class = load_func(settings.TASK_SERIALIZER_BULK)

        exclude = ()


class TaskIDWithAnnotationsSerializer(TaskSerializer):
    """
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # TODO: this called twice due to base class initializer
        self.fields['annotations'] = AnnotationSerializer(many=True, default=[], context=self.context)

    class Meta:
        model = Task
        fields = ['id', 'annotations']


class TaskWithPredictionsSerializer(TaskSerializer):
    """
    """
    predictions = PredictionSerializer(many=True, default=[], read_only=True)

    class Meta:
        model = Task
        fields = '__all__'


class TaskWithAnnotationsAndPredictionsSerializer(TaskSerializer):
    predictions = PredictionSerializer(many=True, default=[], read_only=True)
    annotations = serializers.SerializerMethodField(default=[], read_only=True)

    def get_annotations(self, task):
        annotations = task.annotations

        if 'request' in self.context:
            user = self.context['request'].user
            if user.is_annotator:
                annotations = annotations.filter(completed_by=user)

        return AnnotationSerializer(annotations, many=True, read_only=True, default=True, context=self.context).data

    @staticmethod
    def generate_prediction(task):
        """ Generate prediction for task and store it to Prediction model
        """
        prediction = task.predictions.filter(model_version=task.project.model_version)
        if not prediction.exists():
            task.project.create_prediction(task)

    def to_representation(self, instance):
        self.generate_prediction(instance)
        return super().to_representation(instance)

    class Meta:
        model = Task
        exclude = ()


class AnnotationDraftSerializer(ModelSerializer):
    user = serializers.CharField(default=serializers.CurrentUserDefault())
    created_username = serializers.SerializerMethodField(default='', read_only=True, help_text='User name string')
    created_ago = serializers.CharField(default='', read_only=True, help_text='Delta time from creation time')

    def get_created_username(self, draft):
        user = draft.user
        if not user:
            return ""

        name = user.first_name
        last_name = user.last_name
        if len(last_name):
            name = name + " " + last_name
        name += (' ' if name else '') + f'{user.email}, {user.id}'
        return name

    class Meta:
        model = AnnotationDraft
        fields = '__all__'


class TaskWithAnnotationsAndPredictionsAndDraftsSerializer(TaskSerializer):

    predictions = serializers.SerializerMethodField(default=[], read_only=True)
    annotations = serializers.SerializerMethodField(default=[], read_only=True)
    drafts = serializers.SerializerMethodField(default=[], read_only=True)
    updated_by = serializers.SerializerMethodField(default=[], read_only=True)

    def get_updated_by(self, task):
        return [{'user_id': task.updated_by_id}] if task.updated_by_id else []

    def get_predictions(self, task):
        predictions = task.predictions
        if task.project.model_version:
            predictions = predictions.filter(model_version=task.project.model_version)
        return PredictionSerializer(predictions, many=True, read_only=True, default=[], context=self.context).data

    def get_annotations(self, task):
        """Return annotations only for the current user"""
        annotations = task.annotations

        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            user = self.context['request'].user
            if user.is_annotator:
                annotations = annotations.filter(completed_by=user)

        return AnnotationSerializer(annotations, many=True, read_only=True, default=[], context=self.context).data

    def get_drafts(self, task):
        """Return drafts only for the current user"""
        # it's for swagger documentation
        if not isinstance(task, Task):
            return AnnotationDraftSerializer(many=True)

        drafts = task.drafts
        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            user = self.context['request'].user
            drafts = drafts.filter(user=user)

        return AnnotationDraftSerializer(drafts, many=True, read_only=True, default=[], context=self.context).data


class NextTaskSerializer(TaskWithAnnotationsAndPredictionsAndDraftsSerializer):
    def get_predictions(self, task):
        project = task.project
        if not project.show_collab_predictions:
            return []
        else:
            for ml_backend in project.ml_backends.all():
                ml_backend.predict_tasks([task])
            return super().get_predictions(task)

    def get_annotations(self, task):
        result = []
        if self.context.get('annotations', False):
            annotations = super().get_annotations(task)
            user = self.context['request'].user
            for annotation in annotations:
                if annotation.get('completed_by') == user.id:
                    result.append(annotation)
        return result


class TaskIDWithAnnotationsAndPredictionsSerializer(ModelSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['annotations'] = AnnotationSerializer(many=True, default=[], context=self.context)
        self.fields['predictions'] = PredictionSerializer(many=True, default=[], context=self.context)

    class Meta:
        model = Task
        fields = ['id', 'annotations', 'predictions']


class TaskIDOnlySerializer(ModelSerializer):

    class Meta:
        model = Task
        fields = ['id']


# LSE inherits this serializer
TaskSerializerBulk = load_func(settings.TASK_SERIALIZER_BULK)
