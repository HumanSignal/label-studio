"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

import ujson as json
from core.feature_flags import flag_set
from core.label_config import replace_task_data_undefined_with_config_field
from core.utils.common import load_func, retry_database_locked
from django.conf import settings
from django.db import IntegrityError, transaction
from drf_yasg import openapi
from projects.models import Project
from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import generics, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.fields import SkipField
from rest_framework.serializers import ModelSerializer
from rest_framework.settings import api_settings
from tasks.exceptions import AnnotationDuplicateError
from tasks.models import Annotation, AnnotationDraft, Prediction, Task
from tasks.validation import TaskValidator
from users.models import User
from users.serializers import UserSerializer

logger = logging.getLogger(__name__)


class PredictionQuerySerializer(serializers.Serializer):
    task = serializers.IntegerField(required=False, help_text='Task ID to filter predictions')
    project = serializers.IntegerField(required=False, help_text='Project ID to filter predictions')


class PredictionResultField(serializers.JSONField):
    class Meta:
        swagger_schema_fields = {
            'type': openapi.TYPE_ARRAY,
            'title': 'Prediction result list',
            'description': 'List of prediction results for the task',
            'items': {
                'type': openapi.TYPE_OBJECT,
                'title': 'Prediction result items (regions)',
                'description': 'List of predicted regions for the task',
            },
        }


class AnnotationResultField(serializers.JSONField):
    class Meta:
        swagger_schema_fields = {
            'type': openapi.TYPE_ARRAY,
            'title': 'Annotation result list',
            'description': 'List of annotation results for the task',
            'items': {
                'type': openapi.TYPE_OBJECT,
                'title': 'Annotation result items (regions)',
                'description': 'List of annotated regions for the task',
            },
        }


class PredictionSerializer(ModelSerializer):
    result = PredictionResultField()
    model_version = serializers.CharField(
        allow_blank=True,
        required=False,
        help_text='Model version - tag for predictions that can be used to filter tasks in Data Manager, as well as '
        'select specific model version for showing preannotations in the labeling interface',
    )
    created_ago = serializers.CharField(default='', read_only=True, help_text='Delta time from creation time')

    class Meta:
        model = Prediction
        fields = '__all__'


class ListAnnotationSerializer(serializers.ListSerializer):
    pass


class CompletedByDMSerializer(UserSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'avatar', 'email', 'initials']


class AnnotationSerializer(FlexFieldsModelSerializer):
    """ """

    result = AnnotationResultField(required=False)
    created_username = serializers.SerializerMethodField(default='', read_only=True, help_text='Username string')
    created_ago = serializers.CharField(default='', read_only=True, help_text='Time delta from creation time')
    completed_by = serializers.PrimaryKeyRelatedField(required=False, queryset=User.objects.all())
    unique_id = serializers.CharField(required=False, write_only=True)

    def create(self, *args, **kwargs):
        try:
            return super().create(*args, **kwargs)
        except IntegrityError as e:
            errors = [
                'UNIQUE constraint failed: task_completion.unique_id',
                'duplicate key value violates unique constraint "task_completion_unique_id_key"',
            ]
            if any([error in str(e) for error in errors]):
                raise AnnotationDuplicateError()
            raise

    def validate_result(self, value):
        data = value
        # convert from str to json if need
        if isinstance(value, str):
            try:
                data = json.loads(value)
            except:  # noqa: E722
                raise ValueError('annotation "result" can\'t be parse from str to JSON')

        # check result is list
        if not isinstance(data, list):
            raise ValidationError('annotation "result" field in annotation must be list')

        return data

    def get_created_username(self, annotation):
        user = annotation.completed_by
        if not user:
            return ''

        name = user.first_name
        if len(user.last_name):
            name = name + ' ' + user.last_name

        name += f' {user.email}, {user.id}'
        return name

    class Meta:
        model = Annotation
        exclude = ['prediction', 'result_count']
        expandable_fields = {'completed_by': (CompletedByDMSerializer,)}


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
    """Task Serializer with project scheme configs validation"""

    def project(self, task=None):
        """Take the project from context"""
        if 'project' in self.context:
            project = self.context['project']
        elif 'view' in self.context and 'project_id' in self.context['view'].kwargs:
            kwargs = self.context['view'].kwargs
            project = generics.get_object_or_404(Project, kwargs['project_id'])
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
    """Serialize task with annotation from source json data"""

    annotations = AnnotationSerializer(many=True, default=[], read_only=True)
    predictions = PredictionSerializer(many=True, default=[], read_only=True)

    @property
    def project(self):
        return self.context.get('project')

    @staticmethod
    def format_error(i, detail, item):
        if len(detail) == 1:
            code = f' {detail[0].code}' if detail[0].code != 'invalid' else ''
            return f'Error{code} at item {i}: {detail[0]} :: {item}'
        else:
            errors = ', '.join(detail)
            codes = [d.code for d in detail]
            return f'Errors {codes} at item {i}: {errors} :: {item}'

    def to_internal_value(self, data):
        """Body of run_validation for all data items"""
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
    def _insert_valid_completed_by(annotations, members_email_to_id, members_ids, default_user):
        """Insert the correct id for completed_by by email in annotations"""
        for annotation in annotations:
            completed_by = annotation.get('completed_by')
            # no completed_by info found - just skip it, will be assigned to the user who imports
            if completed_by is None:
                annotation['completed_by_id'] = default_user.id

            # resolve annotators by email
            elif isinstance(completed_by, dict):
                if 'email' not in completed_by:
                    raise ValidationError("It's expected to have 'email' field in 'completed_by' data in annotations")

                email = completed_by['email']
                if email not in members_email_to_id:
                    if settings.ALLOW_IMPORT_TASKS_WITH_UNKNOWN_EMAILS:
                        annotation['completed_by_id'] = default_user.id
                    else:
                        raise ValidationError(f"Unknown annotator's email {email}")
                else:
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
                    f"Import data contains completed_by={completed_by} which is not a valid annotator's email or ID"
                )
            annotation.pop('completed_by', None)

    @staticmethod
    def _insert_valid_user_reviews(dicts, members_email_to_id, default_user):
        """Insert correct user id by email from snapshot

        :param dicts: draft or review dicts from snapshot
        :param members_email_to_id: mapping from emails to current LS instance user IDs
        :param default_user: if email is not found in membr_email_to_id, this user will be used
        :return:
        """
        for obj in dicts:
            created_by = obj.get('created_by', {})
            email = created_by.get('email') if isinstance(created_by, dict) else None

            # user default user
            if email not in members_email_to_id:
                obj['created_by_id'] = default_user.id
                logger.warning('Email not found in members_email_to_id, default user used instead')

            # resolve annotators by email
            else:
                obj['created_by_id'] = members_email_to_id[email]

            obj.pop('created_by', None)

    @staticmethod
    def _insert_valid_user_drafts(dicts, members_email_to_id, default_user):
        """Insert correct user id by email from snapshot

        :param dicts: draft or review dicts from snapshot
        :param members_email_to_id: mapping from emails to current LS instance user IDs
        :param default_user: if email is not found in membr_email_to_id, this user will be used
        :return:
        """
        for obj in dicts:
            email = obj.get('user')

            # user default user
            if email not in members_email_to_id:
                obj['user_id'] = default_user.id
                logger.warning('Email not found in members_email_to_id, default user used instead')

            # resolve annotators by email
            else:
                obj['user_id'] = members_email_to_id[email]

            obj.pop('user', None)

    @retry_database_locked()
    def create(self, validated_data):
        """Create Tasks, Annotations, etc in bulk"""
        validated_tasks = validated_data
        logging.info(f'Try to serialize tasks with annotations, data len = {len(validated_data)}')
        user = self.context.get('user', None)
        default_user = user or self.project.created_by
        ff_user = self.project.organization.created_by

        # get members from project, we need them to restore annotation.completed_by etc
        organization = self.project.organization
        members_email_to_id = dict(organization.members.values_list('user__email', 'user__id'))
        members_ids = set(members_email_to_id.values())
        logger.debug(f'{len(members_email_to_id)} members found in organization {organization}')

        # to be sure we add tasks with annotations at the same time
        with transaction.atomic():

            # extract annotations, predictions, drafts, reviews, etc
            # all these lists will be grouped by tasks, e.g.:
            # task_annotations = [ [a1, a2], [a3, a4, a5], ... ]
            task_annotations, task_predictions = [], []
            task_drafts, task_reviews = [], []
            for task in validated_tasks:
                # extract annotations from snapshot
                annotations = task.pop('annotations', [])
                self._insert_valid_completed_by(annotations, members_email_to_id, members_ids, default_user)
                task_annotations.append(annotations)

                # extract predictions from snapshot
                predictions = task.pop('predictions', [])
                task_predictions.append(predictions)

                if flag_set('fflag_feat_back_lsdv_5307_import_reviews_drafts_29062023_short', user=ff_user):
                    # extract drafts from snapshot
                    drafts = task.pop('drafts', [])
                    self._insert_valid_user_drafts(drafts, members_email_to_id, default_user)
                    task_drafts.append(drafts)

                    # extract reviews from snapshot annotations
                    for annotation in annotations:
                        reviews = annotation.get('reviews', [])
                        self._insert_valid_user_reviews(reviews, members_email_to_id, default_user)
                        task_reviews.append(reviews)

            db_tasks = self.add_tasks(task_annotations, task_predictions, validated_tasks)
            db_annotations = self.add_annotations(task_annotations, user)
            self.add_predictions(task_predictions)

        self.post_process_annotations(user, db_annotations, 'imported')
        self.post_process_tasks(self.project.id, [t.id for t in self.db_tasks])

        if flag_set('fflag_feat_back_lsdv_5307_import_reviews_drafts_29062023_short', user=ff_user):
            with transaction.atomic():
                # build mapping between new and old ids in annotations,
                # we need it because annotation ids will be known only after saving to db
                annotation_mapping = {v.import_id: v.id for v in db_annotations}
                annotation_mapping[None] = None
                # the sequence of add_ functions is very important because of references to ids
                self.add_drafts(task_drafts, db_tasks, annotation_mapping, self.project)
                self.add_reviews(task_reviews, annotation_mapping, self.project)

        return db_tasks

    def add_predictions(self, task_predictions):
        """Save predictions to DB and set the latest model version in the project"""
        db_predictions = []

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
                    except ValueError:
                        logger.error(
                            "Can't upload prediction score: should be in float format." 'Fallback to score=None'
                        )
                        prediction_score = None

                last_model_version = prediction.get('model_version', 'undefined')
                db_predictions.append(
                    Prediction(
                        task=self.db_tasks[i],
                        project=self.db_tasks[i].project,
                        result=result,
                        score=prediction_score,
                        model_version=last_model_version,
                    )
                )

        # predictions: DB bulk create
        self.db_predictions = Prediction.objects.bulk_create(db_predictions, batch_size=settings.BATCH_SIZE)
        logging.info(f'Predictions serialization success, len = {len(self.db_predictions)}')

        # renew project model version if it's empty
        if not self.project.model_version and last_model_version is not None:
            self.project.model_version = last_model_version
            self.project.save()

        return self.db_predictions, last_model_version

    def add_reviews(self, task_reviews, annotation_mapping, project):
        """Save task reviews to DB"""
        return []

    def add_drafts(self, task_drafts, db_tasks, annotation_mapping, project):
        """Save task drafts to DB"""
        db_drafts = []

        # add drafts
        for i, drafts in enumerate(task_drafts):
            for draft in drafts:
                if not isinstance(draft, dict):
                    continue

                draft.update(
                    {
                        'task_id': db_tasks[i].id,
                        'annotation_id': annotation_mapping[draft.get('annotation')],
                        'project': self.project,
                        'import_id': draft.get('id'),
                    }
                )
                # remove redundant fields
                [
                    draft.pop(field, None)
                    for field in ['id', 'task', 'annotation', 'project', 'created_username', 'created_ago']
                ]
                db_drafts.append(AnnotationDraft(**draft))

        self.db_drafts = AnnotationDraft.objects.bulk_create(db_drafts, batch_size=settings.BATCH_SIZE)
        logging.info(f'drafts serialization success, len = {len(self.db_drafts)}')

        return self.db_drafts

    def add_annotations(self, task_annotations, user):
        """Save task annotations to DB"""
        db_annotations = []

        # add annotations
        for i, annotations in enumerate(task_annotations):
            for annotation in annotations:
                if not isinstance(annotation, dict):
                    continue

                ground_truth = annotation.pop('ground_truth', True)
                was_cancelled = annotation.pop('was_cancelled', False)
                lead_time = annotation.pop('lead_time', None)

                body = {
                    'task': self.db_tasks[i],
                    'project': self.project,
                    'ground_truth': ground_truth,
                    'was_cancelled': was_cancelled,
                    'completed_by_id': annotation['completed_by_id'],
                    'result': annotation['result'],
                    'lead_time': lead_time,
                    'import_id': annotation.get('id'),
                }
                db_annotations.append(Annotation(**body))

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

        return self.db_annotations

    def add_tasks(self, task_annotations, task_predictions, validated_tasks):
        """Extract tasks from validated_tasks and store them in DB"""
        db_tasks = []
        max_overlap = self.project.maximum_annotations

        # identify max inner id
        tasks = Task.objects.filter(project=self.project)
        prev_inner_id = tasks.order_by('-inner_id')[0].inner_id if tasks else 0
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
                cancelled_annotations=cancelled_annotations,
            )
            db_tasks.append(t)

        # get task ids
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

        return db_tasks

    @staticmethod
    def post_process_annotations(user, db_annotations, action):
        pass

    @staticmethod
    def post_process_tasks(user, db_tasks):
        pass

    @staticmethod
    def add_annotation_fields(body, user, action):
        return body

    class Meta:
        model = Task
        fields = '__all__'


TaskSerializer = load_func(settings.TASK_SERIALIZER)


class TaskWithAnnotationsSerializer(TaskSerializer):
    """ """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['annotations'] = AnnotationSerializer(many=True, default=[], context=self.context)

    class Meta:
        model = Task
        list_serializer_class = load_func(settings.TASK_SERIALIZER_BULK)

        exclude = ()


class AnnotationDraftSerializer(ModelSerializer):

    user = serializers.CharField(default=serializers.CurrentUserDefault())
    created_username = serializers.SerializerMethodField(default='', read_only=True, help_text='User name string')
    created_ago = serializers.CharField(default='', read_only=True, help_text='Delta time from creation time')

    def get_created_username(self, draft):
        user = draft.user
        if not user:
            return ''

        name = user.first_name
        last_name = user.last_name
        if len(last_name):
            name = name + ' ' + last_name
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

    def _get_user(self):
        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            return self.context['request'].user

    def get_predictions(self, task):
        predictions = task.predictions
        user = self._get_user()
        if flag_set('ff_front_dev_1682_model_version_dropdown_070622_short', user=user or 'auto'):
            active_ml_backends = task.project.get_active_ml_backends()
            model_versions = active_ml_backends.values_list('model_version', flat=True)
            logger.debug(f'Selecting predictions from active ML backend model versions: {model_versions}')
            predictions = predictions.filter(model_version__in=model_versions)
        elif task.project.model_version:
            predictions = predictions.filter(model_version=task.project.model_version)
        return PredictionSerializer(predictions, many=True, read_only=True, default=[], context=self.context).data

    def get_annotations(self, task):
        """Return annotations only for the current user"""
        annotations = task.annotations

        user = self._get_user()
        if user and user.is_annotator:
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
    unique_lock_id = serializers.SerializerMethodField()

    def get_unique_lock_id(self, task):
        user = self.context['request'].user
        lock = task.locks.filter(user=user).first()
        if lock:
            return lock.unique_id

    def get_predictions(self, task):
        predictions = task.get_predictions_for_prelabeling()
        return PredictionSerializer(predictions, many=True, read_only=True, default=[], context=self.context).data

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
