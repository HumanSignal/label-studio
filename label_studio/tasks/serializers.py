"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import ujson as json

from django.db import transaction
from drf_dynamic_fields import DynamicFieldsMixin
from django.conf import settings

from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from rest_framework.exceptions import ValidationError
from rest_framework.fields import SkipField
from rest_framework.settings import api_settings

from projects.models import Project
from tasks.models import Task, Annotation, AnnotationDraft, Prediction
from tasks.validation import TaskValidator
from core.utils.common import get_object_with_check_and_log, retry_database_locked
from users.serializers import UserSerializer

logger = logging.getLogger(__name__)


class PredictionSerializer(ModelSerializer):
    model_version = serializers.CharField(allow_blank=True)
    created_ago = serializers.CharField(default='', read_only=True, help_text='Delta time from creation time')

    class Meta:
        model = Prediction
        fields = '__all__'


class ListAnnotationSerializer(serializers.ListSerializer):
    pass


class AnnotationSerializer(DynamicFieldsMixin, ModelSerializer):
    """
    """
    created_username = serializers.SerializerMethodField(default='', read_only=True, help_text='User name string')
    created_ago = serializers.CharField(default='', read_only=True, help_text='Delta time from creation time')
    completed_by = serializers.SerializerMethodField()
    ground_truth = serializers.SerializerMethodField(
        default=False, read_only=True, help_text='Ground truth annotation (the same as ground_truth)')

    @classmethod
    def many_init(cls, *args, **kwargs):
        kwargs['child'] = cls(*args, **kwargs)
        return ListAnnotationSerializer(*args, **kwargs)

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

        return value

    def get_created_username(self, annotation):
        user = annotation.completed_by
        if not user:
            return ""
            
        name = user.first_name
        if len(user.last_name):
            name = name + " " + user.last_name

        name += f' {user.email}, {user.id}'
        return name

    def get_ground_truth(self, annotation):
        return annotation.ground_truth

    def get_completed_by(self, annotation):
        if self.context.get('completed_by', '') == 'full':
            return UserSerializer(annotation.completed_by).data
        else:
            return annotation.completed_by.id if annotation.completed_by else None

    class Meta:
        model = Annotation
        exclude = ['state', 'prediction', 'result_count']


class TaskSimpleSerializer(ModelSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['annotations'] = AnnotationSerializer(many=True, default=[], context=self.context, read_only=True)
        self.fields['predictions'] = PredictionSerializer(many=True, default=[], context=self.context, read_only=True)

    class Meta:
        model = Task
        fields = '__all__'


class TaskSerializer(ModelSerializer):
    """ Task Serializer with project scheme configs validation
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.context.get('include_annotations', True):
            self.fields['annotations'] = AnnotationSerializer(many=True, read_only=False, required=False,
                                                              context=self.context)

    def project(self):
        """ Take the project from context
        """
        if 'project' in self.context:
            project = self.context['project']
        elif 'view' in self.context and 'project_id' in self.context['view'].kwargs:
            kwargs = self.context['view'].kwargs
            project = get_object_with_check_and_log(Project, kwargs['project_id'])
        else:
            project = None
        return project

    def validate(self, task):
        instance = self.instance if hasattr(self, 'instance') else None
        validator = TaskValidator(self.project(), instance)
        return validator.validate(task)

    def to_representation(self, instance):
        project = instance.project
        if project:
            # resolve uri for storage (s3/gcs/etc)
            if self.context.get('resolve_uri', False):
                instance.data = instance.resolve_uri(instance.data, proxy=self.context.get('proxy', False))

            # resolve $undefined$ key in task data
            data = instance.data
            data_types_keys = project.data_types.keys()
            if settings.DATA_UNDEFINED_NAME in data and data_types_keys:
                key = list(data_types_keys)[0]
                data[key] = data[settings.DATA_UNDEFINED_NAME]
                del data[settings.DATA_UNDEFINED_NAME]

        return super().to_representation(instance)

    class Meta:
        model = Task
        fields = '__all__'


class TaskSerializerBulk(serializers.ListSerializer):
    """ Serialize task with annotation from source json data
    """
    annotations = AnnotationSerializer(many=True, default=[], read_only=True)
    predictions = PredictionSerializer(many=True, default=[], read_only=True)

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

    @staticmethod
    def get_completed_by_id(annotation, default=None):
        completed_by = annotation.get('completed_by', None)
        # user id as is
        if completed_by and isinstance(completed_by, int):
            return completed_by
        # user dict
        if completed_by and isinstance(completed_by, dict):
            return completed_by.get('id')

        return default

    @retry_database_locked()
    def create(self, validated_data):
        """ Create Tasks and Annotations in bulk
        """
        db_tasks, db_annotations, db_predictions, validated_tasks = [], [], [], validated_data
        logging.info(f'Try to serialize tasks with annotations, data len = {len(validated_data)}')
        user = self.context.get('user', None)
        project = self.context.get('project')

        # to be sure we add tasks with annotations at the same time
        with transaction.atomic():

            # extract annotations and predictions
            task_annotations, task_predictions = [], []
            for task in validated_tasks:
                task_annotations.append(task.pop('annotations', []))
                task_predictions.append(task.pop('predictions', []))

            # check annotator permissions for completed by
            organization = user.active_organization \
                if not project.created_by.active_organization else project.created_by.active_organization
            project_user_ids = organization.members.values_list('user__id', flat=True)
            annotator_ids = set()
            for annotations in task_annotations:
                for annotation in annotations:
                    annotator_ids.add(self.get_completed_by_id(annotation))

            for i in annotator_ids:
                if i not in project_user_ids and i is not None:
                    raise ValidationError(f'Annotations with "completed_by"={i} are produced by annotator '
                                          f'who is not allowed for this project as invited annotator or team member')

            # add tasks first
            for task in validated_tasks:
                t = Task(project=project, data=task['data'], meta=task.get('meta', {}),
                         overlap=project.maximum_annotations,
                         file_upload_id=task.get('file_upload_id'))
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
                    # support both "ground_truth" and "ground_truth"
                    ground_truth = annotation.pop('ground_truth', True)
                    if 'ground_truth' in annotation:
                        ground_truth = annotation.pop('ground_truth', True)

                    # get user id
                    completed_by_id = self.get_completed_by_id(annotation, default=user.id if user else None)
                    annotation.pop('completed_by', None)

                    db_annotations.append(Annotation(task=self.db_tasks[i],
                                                     ground_truth=ground_truth,
                                                     completed_by_id=completed_by_id,
                                                     result=annotation['result']))

            # add predictions
            last_model_version = None
            for i, predictions in enumerate(task_predictions):
                for prediction in predictions:
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
                                                     result=prediction['result'],
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
            if not project.model_version and last_model_version is not None:
                project.model_version = last_model_version
                project.save()

        return db_tasks

    class Meta:
        model = Task
        fields = "__all__"
    
        
class TaskWithAnnotationsSerializer(TaskSerializer):
    """
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['annotations'] = AnnotationSerializer(many=True, default=[], context=self.context)

    class Meta:
        model = Task
        list_serializer_class = TaskSerializerBulk
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
            if user.is_annotator(task.project.organization.pk):
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

        name = user.first_name
        if len(user.last_name):
            name = name + " " + user.last_name

        name += f' ({user.email}, {user.id})'
        return name

    class Meta:
        model = AnnotationDraft
        fields = '__all__'


class TaskWithAnnotationsAndPredictionsAndDraftsSerializer(TaskSerializer):

    predictions = PredictionSerializer(many=True, default=[], read_only=True)
    annotations = serializers.SerializerMethodField(default=[], read_only=True)
    drafts = serializers.SerializerMethodField(default=[], read_only=True)

    def get_annotations(self, task):
        """Return annotations only for the current user"""
        annotations = task.annotations

        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            user = self.context['request'].user
            if user.is_annotator(task.project.organization.pk):
                annotations = annotations.filter(completed_by=user)

        return AnnotationSerializer(annotations, many=True, read_only=True, default=True, context=self.context).data

    def get_drafts(self, task):
        """Return drafts only for the current user"""
        # it's for swagger documentation
        if not isinstance(task, Task):
            return AnnotationDraftSerializer(many=True)

        drafts = task.drafts
        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            user = self.context['request'].user
            # drafts = drafts.filter(user=user)
            if user.is_annotator(task.project.organization.pk):
                drafts = drafts.filter(user=user)

        return AnnotationDraftSerializer(drafts, many=True, read_only=True, default=True, context=self.context).data


class TaskWithAnnotationsAndLazyPredictionsSerializer(TaskSerializer):
    predictions = PredictionSerializer(many=True, default=[], read_only=True)
    annotations = serializers.SerializerMethodField(default=[], read_only=True)

    def get_annotations(self, task):
        annotations = task.annotations.order_by('pk')

        if 'request' in self.context:
            user = self.context['request'].user
            if user.is_annotator(task.project.organization.pk):
                annotations = annotations.filter(completed_by=user)

        return AnnotationSerializer(annotations, many=True, read_only=True, default=True, context=self.context).data

    class Meta:
        model = Task
        exclude = ('taken_at', )


class TaskIDWithAnnotationsAndPredictionsSerializer(ModelSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['annotations'] = AnnotationSerializer(many=True, default=[], context=self.context)
        self.fields['predictions'] = PredictionSerializer(many=True, default=[], context=self.context)

    class Meta:
        model = Task
        fields = ['id', 'annotations', 'predictions']
