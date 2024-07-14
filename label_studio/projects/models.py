"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
from typing import Any, Mapping, Optional

from annoying.fields import AutoOneToOneField
from core.feature_flags import flag_set
from core.label_config import (
    check_control_in_config_by_regex,
    check_toname_in_config_by_regex,
    config_line_stipped,
    extract_data_types,
    get_all_control_tag_tuples,
    get_all_labels,
    get_all_object_tag_names,
    get_all_types,
    get_annotation_tuple,
    get_original_fromname_by_regex,
    get_sample_task,
    validate_label_config,
)
from core.utils.common import (
    create_hash,
    get_attr_or_item,
    load_func,
    merge_labels_counters,
)
from core.utils.db import fast_first
from core.utils.exceptions import LabelStudioValidationErrorSentryIgnored
from django.conf import settings
from django.core.validators import MaxLengthValidator, MinLengthValidator
from django.db import models, transaction
from django.db.models import Avg, BooleanField, Case, Count, JSONField, Max, Q, Sum, Value, When
from django.utils.translation import gettext_lazy as _
from label_studio_sdk._extensions.label_studio_tools.core.label_config import parse_config
from labels_manager.models import Label
from projects.functions import (
    annotate_finished_task_number,
    annotate_ground_truth_number,
    annotate_num_tasks_with_annotations,
    annotate_skipped_annotations_number,
    annotate_task_number,
    annotate_total_annotations_number,
    annotate_total_predictions_number,
    annotate_useful_annotation_number,
)
from projects.functions.utils import make_queryset_from_iterable
from tasks.models import (
    Annotation,
    AnnotationDraft,
    Prediction,
    Q_task_finished_annotations,
    Task,
    bulk_update_stats_project_tasks,
)

logger = logging.getLogger(__name__)


class ProjectManager(models.Manager):
    COUNTER_FIELDS = [
        'task_number',
        'finished_task_number',
        'total_predictions_number',
        'total_annotations_number',
        'num_tasks_with_annotations',
        'useful_annotation_number',
        'ground_truth_number',
        'skipped_annotations_number',
    ]

    ANNOTATED_FIELDS = {
        'task_number': annotate_task_number,
        'finished_task_number': annotate_finished_task_number,
        'total_predictions_number': annotate_total_predictions_number,
        'total_annotations_number': annotate_total_annotations_number,
        'num_tasks_with_annotations': annotate_num_tasks_with_annotations,
        'useful_annotation_number': annotate_useful_annotation_number,
        'ground_truth_number': annotate_ground_truth_number,
        'skipped_annotations_number': annotate_skipped_annotations_number,
    }

    def for_user(self, user):
        return self.filter(organization=user.active_organization)

    def with_counts(self, fields=None):
        return self.with_counts_annotate(self, fields=fields)

    @staticmethod
    def with_counts_annotate(queryset, fields=None):
        available_fields = ProjectManager.ANNOTATED_FIELDS
        if fields is None:
            to_annotate = available_fields
        else:
            to_annotate = {field: available_fields[field] for field in fields if field in available_fields}

        for _, annotate_func in to_annotate.items():  # noqa: F402
            queryset = annotate_func(queryset)

        return queryset


ProjectMixin = load_func(settings.PROJECT_MIXIN)


# LSE recalculate all stats
recalculate_all_stats = load_func(settings.RECALCULATE_ALL_STATS)


class Project(ProjectMixin, models.Model):
    class SkipQueue(models.TextChoices):
        # requeue to the end of the same annotator’s queue => annotator gets this task at the end of the queue
        REQUEUE_FOR_ME = 'REQUEUE_FOR_ME', 'Requeue for me'
        # requeue skipped tasks back to the common queue, excluding skipping annotator [current default] => another annotator gets this task
        REQUEUE_FOR_OTHERS = 'REQUEUE_FOR_OTHERS', 'Requeue for others'
        # ignore skipped tasks => skip is a valid annotation, task is completed (finished=True)
        IGNORE_SKIPPED = 'IGNORE_SKIPPED', 'Ignore skipped'

    objects = ProjectManager()
    __original_label_config = None

    title = models.CharField(
        _('title'),
        null=True,
        blank=True,
        default='',
        max_length=settings.PROJECT_TITLE_MAX_LEN,
        help_text=f'Project name. Must be between {settings.PROJECT_TITLE_MIN_LEN} and {settings.PROJECT_TITLE_MAX_LEN} characters long.',
        validators=[
            MinLengthValidator(settings.PROJECT_TITLE_MIN_LEN),
            MaxLengthValidator(settings.PROJECT_TITLE_MAX_LEN),
        ],
    )
    description = models.TextField(
        _('description'), blank=True, null=True, default='', help_text='Project description'
    )

    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='projects', null=True
    )
    label_config = models.TextField(
        _('label config'),
        blank=True,
        null=True,
        default='<View></View>',
        help_text='Label config in XML format. See more about it in documentation',
    )
    parsed_label_config = models.JSONField(
        _('parsed label config'),
        blank=True,
        null=True,
        default=None,
        help_text='Parsed label config in JSON format. See more about it in documentation',
    )
    label_config_hash = models.BigIntegerField(null=True, default=None)
    expert_instruction = models.TextField(
        _('expert instruction'), blank=True, null=True, default='', help_text='Labeling instructions in HTML format'
    )
    show_instruction = models.BooleanField(
        _('show instruction'), default=False, help_text='Show instructions to the annotator before they start'
    )

    show_skip_button = models.BooleanField(
        _('show skip button'),
        default=True,
        help_text='Show a skip button in interface and allow annotators to skip the task',
    )
    enable_empty_annotation = models.BooleanField(
        _('enable empty annotation'), default=True, help_text='Allow annotators to submit empty annotations'
    )

    reveal_preannotations_interactively = models.BooleanField(
        _('reveal_preannotations_interactively'), default=False, help_text='Reveal pre-annotations interactively'
    )
    show_annotation_history = models.BooleanField(
        _('show annotation history'), default=False, help_text='Show annotation history to annotator'
    )
    show_collab_predictions = models.BooleanField(
        _('show predictions to annotator'), default=True, help_text='If set, the annotator can view model predictions'
    )

    # evaluate is the wrong word here. correct should be retrieve_predictions_automatically
    # deprecated
    evaluate_predictions_automatically = models.BooleanField(
        _('evaluate predictions automatically'),
        default=False,
        help_text='Retrieve and display predictions when loading a task',
    )
    token = models.CharField(_('token'), max_length=256, default=create_hash, null=True, blank=True)
    result_count = models.IntegerField(
        _('result count'), default=0, help_text='Total results inside of annotations counter'
    )
    color = models.CharField(_('color'), max_length=16, default='#FFFFFF', null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_projects',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('created by'),
    )
    maximum_annotations = models.IntegerField(
        _('maximum annotation number'),
        default=1,
        help_text='Maximum number of annotations for one task. '
        'If the number of annotations per task is equal or greater '
        'to this value, the task is completed (is_labeled=True)',
    )
    min_annotations_to_start_training = models.IntegerField(
        _('min_annotations_to_start_training'),
        default=0,
        help_text='Minimum number of completed tasks after which model training is started',
    )

    control_weights = JSONField(
        _('control weights'),
        null=True,
        default=dict,
        help_text='Dict of weights for each control tag in metric calculation. Each control tag (e.g. label or choice) will '
        "have it's own key in control weight dict with weight for each label and overall weight."
        'For example, if bounding box annotation with control tag named my_bbox should be included with 0.33 weight in agreement calculation, '
        'and the first label Car should be twice more important than Airplaine, then you have to need the specify: '
        "{'my_bbox': {'type': 'RectangleLabels', 'labels': {'Car': 1.0, 'Airplaine': 0.5}, 'overall': 0.33}",
    )

    # Welcome reader! You might be wondering how `model_version` is
    # set and used; let's explain. `model_version` can either be set
    # to the prediction `model_version` associated with the
    # `tasks.Prediction` model, or to the ML backend title. Yes,
    # understandably, this can be confusing. However, this appears to
    # be the best approach we currently have for improving the
    # experience while maintaining backward compatibility.
    model_version = models.TextField(
        _('model version'), blank=True, null=True, default='', help_text='Machine learning model version'
    )

    data_types = JSONField(_('data_types'), default=dict, null=True)

    is_draft = models.BooleanField(
        _('is draft'), default=False, help_text='Whether or not the project is in the middle of being created'
    )
    is_published = models.BooleanField(
        _('published'), default=False, help_text='Whether or not the project is published to annotators'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    SEQUENCE = 'Sequential sampling'
    UNIFORM = 'Uniform sampling'
    UNCERTAINTY = 'Uncertainty sampling'

    SAMPLING_CHOICES = (
        (SEQUENCE, 'Tasks are ordered by Data manager ordering'),
        (UNIFORM, 'Tasks are chosen randomly'),
        (UNCERTAINTY, 'Tasks are chosen according to model uncertainty scores (active learning mode)'),
    )

    sampling = models.CharField(max_length=100, choices=SAMPLING_CHOICES, null=True, default=SEQUENCE)
    skip_queue = models.CharField(
        max_length=100, choices=SkipQueue.choices, null=True, default=SkipQueue.REQUEUE_FOR_OTHERS
    )
    show_ground_truth_first = models.BooleanField(_('show ground truth first'), default=False)
    show_overlap_first = models.BooleanField(_('show overlap first'), default=False)
    overlap_cohort_percentage = models.IntegerField(_('overlap_cohort_percentage'), default=100)

    task_data_login = models.CharField(
        _('task_data_login'), max_length=256, blank=True, null=True, help_text='Task data credentials: login'
    )
    task_data_password = models.CharField(
        _('task_data_password'), max_length=256, blank=True, null=True, help_text='Task data credentials: password'
    )

    pinned_at = models.DateTimeField(_('pinned at'), null=True, default=None, help_text='Pinned date and time')

    def __init__(self, *args, **kwargs):
        super(Project, self).__init__(*args, **kwargs)
        self.__original_label_config = self.label_config
        self.__maximum_annotations = self.maximum_annotations
        self.__overlap_cohort_percentage = self.overlap_cohort_percentage
        self.__skip_queue = self.skip_queue

        # TODO: once bugfix with incorrect data types in List
        # logging.warning('! Please, remove code below after patching of all projects (extract_data_types)')
        if self.label_config is not None:
            data_types = extract_data_types(self.label_config)
            if self.data_types != data_types:
                self.data_types = data_types

    @property
    def num_tasks(self):
        return self.tasks.count()

    @property
    def ml_backend(self):
        return fast_first(self.ml_backends.all())

    @property
    def should_retrieve_predictions(self):
        """Returns true if the model was set to be used"""
        if self.show_collab_predictions:
            ml = self.ml_backend
            if ml:
                return ml.title == self.model_version

        return False

    @property
    def num_annotations(self):
        return Annotation.objects.filter(project=self).count()

    @property
    def num_drafts(self):
        return AnnotationDraft.objects.filter(task__project=self).count()

    @property
    def has_predictions(self):
        return self.get_current_predictions().exists()

    @property
    def has_any_predictions(self):
        if flag_set(
            'fflag_perf_back_lsdv_4695_update_prediction_query_to_use_direct_project_relation',
            user='auto',
        ):
            return Prediction.objects.filter(Q(project=self.id)).exists()
        else:
            return Prediction.objects.filter(Q(task__project=self.id)).exists()

    @property
    def business(self):
        return self.created_by.business

    @property
    def is_private(self):
        return None

    @property
    def secure_mode(self):
        return False

    @property
    def one_object_in_label_config(self):
        return len(self.data_types) <= 1

    @property
    def only_undefined_field(self):
        return (
            self.one_object_in_label_config
            and self.summary.common_data_columns
            and self.summary.common_data_columns[0] == settings.DATA_UNDEFINED_NAME
        )

    @property
    def get_labeled_count(self):
        return self.tasks.filter(is_labeled=True).count()

    @property
    def get_collected_count(self):
        return self.tasks.count()

    @property
    def get_total_possible_count(self):
        """
            Tasks has overlap - how many tc should be accepted
            possible count = sum [ t.overlap for t in tasks]

        :return: N int total amount of Annotations that should be submitted
        """
        if self.tasks.count() == 0:
            return 0
        return self.tasks.aggregate(Sum('overlap'))['overlap__sum']

    @property
    def get_available_for_labeling(self):
        return self.get_collected_count - self.get_labeled_count

    @property
    def need_annotators(self):
        return self.maximum_annotations - self.num_annotators

    @classmethod
    def find_by_invite_url(cls, url):
        token = url.strip('/').split('/')[-1]
        if len(token):
            return Project.objects.get(token=token)
        else:
            raise KeyError(f"Can't find Project by invite URL: {url}")

    def reset_token(self):
        self.token = create_hash()
        self.save(update_fields=['token'])

    def add_collaborator(self, user):
        created = False
        with transaction.atomic():
            try:
                ProjectMember.objects.get(user=user, project=self)
            except ProjectMember.DoesNotExist:
                ProjectMember.objects.create(user=user, project=self)
                created = True
            else:
                logger.debug(f'Project membership {self} for user {user} already exists')
        return created

    def has_collaborator(self, user):
        return ProjectMember.objects.filter(user=user, project=self).exists()

    def has_collaborator_enabled(self, user):
        membership = ProjectMember.objects.filter(user=user, project=self)
        return membership.exists() and membership.first().enabled

    def _update_tasks_states(
        self, maximum_annotations_changed, overlap_cohort_percentage_changed, tasks_number_changed
    ):
        """
        Update tasks states after settings change
        :param maximum_annotations_changed: If maximum_annotations param changed
        :param overlap_cohort_percentage_changed: If cohort_percentage param changed
        :param tasks_number_changed: If tasks number changed in project
        """
        logger.info(
            f'Starting _update_tasks_states with params: Project {str(self)} maximum_annotations '
            f'{self.maximum_annotations} and percentage {self.overlap_cohort_percentage}'
        )
        # if only maximum annotations parameter is tweaked
        if maximum_annotations_changed and (not overlap_cohort_percentage_changed or self.maximum_annotations == 1):
            tasks_with_overlap = self.tasks.filter(overlap__gt=1)
            if tasks_with_overlap.exists():
                # if there is a part with overlapped tasks, affect only them
                tasks_with_overlap.update(overlap=self.maximum_annotations)
            elif self.overlap_cohort_percentage < 100:
                self._rearrange_overlap_cohort()
            else:
                # otherwise affect all tasks
                self.tasks.update(overlap=self.maximum_annotations)
                tasks_with_overlap = self.tasks.all()
            # update is_labeled after change
            bulk_update_stats_project_tasks(tasks_with_overlap, project=self)

        # if cohort slider is tweaked
        elif overlap_cohort_percentage_changed and self.maximum_annotations > 1:
            self._rearrange_overlap_cohort()

        # if adding/deleting tasks and cohort settings are applied
        elif tasks_number_changed and self.overlap_cohort_percentage < 100 and self.maximum_annotations > 1:
            self._rearrange_overlap_cohort()

    def _rearrange_overlap_cohort(self):
        """
        Rearrange overlap depending on annotation count in tasks
        """
        all_project_tasks = Task.objects.filter(project=self)
        max_annotations = self.maximum_annotations
        must_tasks = int(self.tasks.count() * self.overlap_cohort_percentage / 100 + 0.5)
        logger.info(
            f'Starting _rearrange_overlap_cohort with params: Project {str(self)} maximum_annotations '
            f'{max_annotations} and percentage {self.overlap_cohort_percentage}'
        )
        tasks_with_max_annotations = all_project_tasks.annotate(
            anno=Count('annotations', filter=Q_task_finished_annotations & Q(annotations__ground_truth=False))
        ).filter(anno__gte=max_annotations)

        tasks_with_min_annotations = all_project_tasks.exclude(id__in=tasks_with_max_annotations)
        # check how many tasks left to finish
        left_must_tasks = max(must_tasks - tasks_with_max_annotations.count(), 0)
        logger.info(f'Required tasks {must_tasks} and left required tasks {left_must_tasks}')
        if left_must_tasks > 0:
            # if there are unfinished tasks update tasks with count(annotations) >= overlap
            ids = list(tasks_with_max_annotations.values_list('id', flat=True))
            all_project_tasks.filter(id__in=ids).update(overlap=max_annotations, is_labeled=True)
            # order other tasks by count(annotations)
            tasks_with_min_annotations = (
                tasks_with_min_annotations.annotate(anno=Count('annotations')).order_by('-anno').distinct()
            )
            # assign overlap depending on annotation count
            # assign max_annotations and update is_labeled
            ids = list(tasks_with_min_annotations[:left_must_tasks].values_list('id', flat=True))
            all_project_tasks.filter(id__in=ids).update(overlap=max_annotations)
            # assign 1 to left
            ids = list(tasks_with_min_annotations[left_must_tasks:].values_list('id', flat=True))
            min_tasks_to_update = all_project_tasks.filter(id__in=ids)
            min_tasks_to_update.update(overlap=1)
        else:
            ids = list(tasks_with_max_annotations.values_list('id', flat=True))
            all_project_tasks.filter(id__in=ids).update(overlap=max_annotations)
            ids = list(tasks_with_min_annotations.values_list('id', flat=True))
            all_project_tasks.filter(id__in=ids).update(overlap=1)
        # update is labeled after tasks rearrange overlap
        bulk_update_stats_project_tasks(all_project_tasks, project=self)

    def remove_tasks_by_file_uploads(self, file_upload_ids):
        self.tasks.filter(file_upload_id__in=file_upload_ids).delete()

    def advance_onboarding(self):
        """Move project to next onboarding step"""
        po_qs = self.steps_left.order_by('step__order')
        count = po_qs.count()

        if count:
            po = po_qs.first()
            po.finished = True
            po.save()

            return count != 1

    def created_at_prettify(self):
        return self.created_at.strftime('%d %b %Y %H:%M:%S')

    def onboarding_step_finished(self, step):
        """Mark specific step as finished"""
        pos = ProjectOnboardingSteps.objects.get(code=step)
        po = ProjectOnboarding.objects.get(project=self, step=pos)
        po.finished = True
        po.save()

        return po

    def data_types_json(self):
        return json.dumps(self.data_types)

    def available_data_keys(self):
        return sorted(list(self.data_types.keys()))

    @classmethod
    def validate_label_config(cls, config_string):
        validate_label_config(config_string)

    def validate_config(self, config_string, strict=False):
        self.validate_label_config(config_string)
        if not hasattr(self, 'summary'):
            return

        if self.num_tasks == 0:
            logger.debug(f'Project {self} has no tasks: nothing to validate here. Ensure project summary is empty')
            self.summary.reset()
            return

        # validate data columns consistency
        fields_from_config = get_all_object_tag_names(config_string)
        if not fields_from_config:
            logger.debug('Data fields not found in labeling config')
            return

        # TODO: DEV-2939 Add validation for fields addition in label config
        """fields_from_config = {field.split('[')[0] for field in fields_from_config}  # Repeater tag support
        fields_from_data = set(self.summary.common_data_columns)
        fields_from_data.discard(settings.DATA_UNDEFINED_NAME)
        if fields_from_data and not fields_from_config.issubset(fields_from_data):
            different_fields = list(fields_from_config.difference(fields_from_data))
            raise LabelStudioValidationErrorSentryIgnored(
                f'These fields are not present in the data: {",".join(different_fields)}'
            )"""

        if self.num_annotations == 0 and self.num_drafts == 0:
            logger.debug(
                f'Project {self} has no annotations and drafts: nothing to validate here. '
                f'Ensure annotations-related project summary is empty'
            )
            self.summary.reset(tasks_data_based=False)
            return

        # validate annotations consistency
        annotations_from_config = set(get_all_control_tag_tuples(config_string))
        if not annotations_from_config:
            logger.debug('Annotation schema is not found in config')
            return
        annotations_from_data = set(self.summary.created_annotations)
        if annotations_from_data and not annotations_from_data.issubset(annotations_from_config):
            different_annotations = list(annotations_from_data.difference(annotations_from_config))
            diff_str = []
            for ann_tuple in different_annotations:
                from_name, to_name, t = ann_tuple.split('|')
                if t.lower() == 'textarea':  # avoid textarea to_name check (see DEV-1598)
                    continue
                if (
                    not check_control_in_config_by_regex(config_string, from_name)
                    or not check_toname_in_config_by_regex(config_string, to_name)
                    or t not in get_all_types(config_string)
                ):
                    diff_str.append(
                        f'{self.summary.created_annotations[ann_tuple]} '
                        f'with from_name={from_name}, to_name={to_name}, type={t}'
                    )
            if len(diff_str) > 0:
                diff_str = '\n'.join(diff_str)
                raise LabelStudioValidationErrorSentryIgnored(
                    f'Created annotations are incompatible with provided labeling schema, we found:\n{diff_str}'
                )

        # validate labels consistency
        labels_from_config, dynamic_label_from_config = get_all_labels(config_string)
        created_labels = merge_labels_counters(self.summary.created_labels, self.summary.created_labels_drafts)

        def display_count(count: int, type: str) -> Optional[str]:
            """Helper for displaying pluralized sources of validation errors,
            eg "1 draft" or "3 annotations"
            """
            if not count:
                return None
            return f'{count} {type}{"s" if count > 1 else ""}'

        for control_tag_from_data, labels_from_data in created_labels.items():
            # Check if labels created in annotations, and their control tag has been removed
            if (
                labels_from_data
                and (
                    (control_tag_from_data not in labels_from_config)
                    and (control_tag_from_data not in dynamic_label_from_config)
                )
                and not check_control_in_config_by_regex(config_string, control_tag_from_data)
            ):
                raise LabelStudioValidationErrorSentryIgnored(
                    f'There are {sum(labels_from_data.values(), 0)} annotation(s) created with tag '
                    f'"{control_tag_from_data}", you can\'t remove it'
                )
            labels_from_config_by_tag = set(
                labels_from_config[get_original_fromname_by_regex(config_string, control_tag_from_data)]
            )
            parsed_config = parse_config(config_string)
            tag_types = [tag_info['type'] for _, tag_info in parsed_config.items()]
            # DEV-1990 Workaround for Video labels as there are no labels in VideoRectangle tag
            if 'VideoRectangle' in tag_types:
                for key in labels_from_config:
                    labels_from_config_by_tag |= set(labels_from_config[key])
            if 'Taxonomy' in tag_types:
                custom_tags = Label.objects.filter(links__project=self).values_list('value', flat=True)
                flat_custom_tags = set([item for sublist in custom_tags for item in sublist])
                labels_from_config_by_tag |= flat_custom_tags
            # check if labels from is subset if config labels
            if not set(labels_from_data).issubset(set(labels_from_config_by_tag)):
                different_labels = list(set(labels_from_data).difference(labels_from_config_by_tag))
                diff_str = ''
                for label in different_labels:
                    annotation_label_count = self.summary.created_labels.get(control_tag_from_data, {}).get(label, 0)
                    draft_label_count = self.summary.created_labels_drafts.get(control_tag_from_data, {}).get(label, 0)
                    annotation_display_count = display_count(annotation_label_count, 'annotation')
                    draft_display_count = display_count(draft_label_count, 'draft')

                    display = [disp for disp in [annotation_display_count, draft_display_count] if disp]
                    if display:
                        diff_str += f'{label} ({", ".join(display)})\n'

                if (strict is True) and (
                    (control_tag_from_data not in dynamic_label_from_config)
                    and (
                        not check_control_in_config_by_regex(
                            config_string, control_tag_from_data, filter=dynamic_label_from_config.keys()
                        )
                    )
                ):
                    # raise error if labels not dynamic and not in regex rules
                    raise LabelStudioValidationErrorSentryIgnored(
                        f'These labels still exist in annotations or drafts:\n{diff_str}'
                        f'Please add labels to tag with name="{str(control_tag_from_data)}".'
                    )
                else:
                    logger.info(f'project_id={self.id} inconsistent labels in config and annotations: {diff_str}')

    def _label_config_has_changed(self):
        return self.label_config != self.__original_label_config

    def should_none_model_version(self, model_version):
        """
        Returns True if the model version provided matches the object's model version,
        or no model version is set for the object but model version exists in ML backend.
        """
        return self.model_version == model_version or self.ml_backend_in_model_version

    def delete_predictions(self, model_version=None):
        """
        Deletes the predictions based on the provided model version.
        If no model version is provided, it deletes all the predictions for this project.

        :param model_version: Identifier of the model version (default is None)
        :type model_version: str, optional
        :return: Dictionary with count of deleted predictions
        :rtype: dict
        """
        params = {'project': self}

        if model_version:
            params.update({'model_version': model_version})

        predictions = Prediction.objects.filter(**params)

        with transaction.atomic():
            # If we are deleting specific model_version then we need
            # to remove that from the project
            if self.should_none_model_version(model_version):
                self.model_version = None
                self.save(update_fields=['model_version'])

            _, deleted_map = predictions.delete()

        count = deleted_map.get('tasks.Prediction', 0)
        return {'deleted_predictions': count}

    def get_updated_weights(self):
        outputs = self.get_parsed_config(autosave_cache=False)
        control_weights = {}
        exclude_control_types = ('Filter',)

        def get_label(label):
            label_value = self.control_weights.get(control_name, {}).get('labels', {}).get(label)
            return label_value if label_value is not None else 1.0

        def get_overall(name):
            weights = self.control_weights.get(name, None)
            if not weights:
                return 1.0
            else:
                weight = weights.get('overall', None)
                return weight if weight is not None else 1.0

        for control_name in outputs:
            control_type = outputs[control_name]['type']
            if control_type in exclude_control_types:
                continue

            control_weights[control_name] = {
                'overall': get_overall(control_name),
                'type': control_type,
                'labels': {label: get_label(label) for label in outputs[control_name].get('labels', [])},
            }
        return control_weights

    def save(self, *args, recalc=True, **kwargs):
        exists = True if self.pk else False
        project_with_config_just_created = not exists and self.label_config

        if self._label_config_has_changed() or project_with_config_just_created:
            self.data_types = extract_data_types(self.label_config)
            self.parsed_label_config = parse_config(self.label_config)
            self.label_config_hash = hash(str(self.parsed_label_config))

        if self.label_config and (self._label_config_has_changed() or not exists or not self.control_weights):
            self.control_weights = self.get_updated_weights()

        if self._label_config_has_changed():
            self.__original_label_config = self.label_config

        super(Project, self).save(*args, **kwargs)

        if not exists:
            steps = ProjectOnboardingSteps.objects.all()
            objs = [ProjectOnboarding(project=self, step=step) for step in steps]
            ProjectOnboarding.objects.bulk_create(objs)

        # argument for recalculate project task stats
        if recalc:
            self.update_tasks_states(
                maximum_annotations_changed=self.__maximum_annotations != self.maximum_annotations,
                overlap_cohort_percentage_changed=self.__overlap_cohort_percentage != self.overlap_cohort_percentage,
                tasks_number_changed=False,
            )
            self.__maximum_annotations = self.maximum_annotations
            self.__overlap_cohort_percentage = self.overlap_cohort_percentage

        if self.__skip_queue != self.skip_queue:
            bulk_update_stats_project_tasks(
                self.tasks.filter(Q(annotations__isnull=False) & Q(annotations__ground_truth=False))
            )

        if hasattr(self, 'summary'):
            # Ensure project.summary is consistent with current tasks / annotations
            if self.num_tasks == 0:
                self.summary.reset()
            elif self.num_annotations == 0 and self.num_drafts == 0:
                self.summary.reset(tasks_data_based=False)

    def get_member_ids(self):
        if hasattr(self, 'team_link'):
            # project has defined team scope
            # TODO: avoid checking team but rather add all project members when creating a project
            return self.team_link.team.members.values_list('user', flat=True)
        else:
            from users.models import User

            # TODO: may want to return all users from organization
            return User.objects.none()

    def has_team_user(self, user):
        return hasattr(self, 'team_link') and self.team_link.team.has_user(user)

    def annotators(self):
        """Annotators connected to this project including team members"""
        from users.models import User

        member_ids = self.get_member_ids()
        team_members = User.objects.filter(id__in=member_ids).order_by('email')

        # add members from invited projects
        project_member_ids = self.members.values_list('user__id', flat=True)
        project_members = User.objects.filter(id__in=project_member_ids)

        annotators = team_members | project_members

        # set annotator.team_member=True if annotator is not an invited user
        annotators = annotators.annotate(
            team_member=Case(
                When(id__in=project_member_ids, then=Value(False)),
                default=Value(True),
                output_field=BooleanField(),
            )
        )
        return annotators

    def annotators_with_annotations(self, min_count=500):
        """Annotators with annotation number > min_number

        :param min_count: minimal annotation number to leave an annotators
        :return: filtered annotators
        """
        annotators = self.annotators()
        q = Q(annotations__project=self) & Q_task_finished_annotations & Q(annotations__ground_truth=False)
        annotators = annotators.annotate(annotation_count=Count('annotations', filter=q, distinct=True))
        return annotators.filter(annotation_count__gte=min_count)

    def labeled_tasks(self):
        return self.tasks.filter(is_labeled=True)

    def has_annotations(self):
        from tasks.models import Annotation  # prevent cycling imports

        return Annotation.objects.filter(Q(project=self) & Q(ground_truth=False)).count() > 0

    # [TODO] this should be a template tag or something like this
    @property
    def label_config_line(self):
        c = self.label_config
        return config_line_stipped(c)

    def get_sample_task(self, label_config=None):
        config = label_config or self.label_config
        task, _, _ = get_sample_task(config)
        return task

    def eta(self):
        """
            Show eta for project to be finished
            eta = avg task annotations finish time * remain annotations

            task has overlap = amount of task annotations to consider as finished (is_labeled)
            remain annotations = sum ( task annotations to be done to fulfill each unfinished task overlap)

        :return: time in seconds
        """
        # finished tasks * overlap
        finished_tasks = Task.objects.filter(project=self.id, is_labeled=True)
        # one could make more than need to overlap
        min_n_finished_annotations = sum([ft.overlap for ft in finished_tasks])

        annotations_unfinished_tasks = Annotation.objects.filter(
            project=self.id, task__is_labeled=False, ground_truth=False, result__isnull=False
        ).count()

        # get minimum remain annotations
        total_annotations_needed = self.get_total_possible_count
        annotations_remain = total_annotations_needed - min_n_finished_annotations - annotations_unfinished_tasks

        # get average time of all finished TC
        finished_annotations = Annotation.objects.filter(
            Q(project=self.id) & Q(ground_truth=False), result__isnull=False
        ).values('lead_time')
        avg_lead_time = finished_annotations.aggregate(avg_lead_time=Avg('lead_time'))['avg_lead_time']

        if avg_lead_time is None:
            return None
        return avg_lead_time * annotations_remain

    def finished(self):
        return not self.tasks.filter(is_labeled=False).exists()

    def annotations_lead_time(self):
        annotations = Annotation.objects.filter(Q(project=self.id) & Q(ground_truth=False))
        return annotations.aggregate(avg_lead_time=Avg('lead_time'))['avg_lead_time']

    @staticmethod
    def django_settings():
        return settings

    @staticmethod
    def max_tasks_file_size():
        return settings.TASKS_MAX_FILE_SIZE

    def get_parsed_config(self, autosave_cache=True):
        if self.parsed_label_config is None:
            self.parsed_label_config = parse_config(self.label_config)

            # if autosave_cache:
            #    Project.objects.filter(id=self.id).update(parsed_label_config=self.parsed_label_config)

        return self.parsed_label_config

    def get_counters(self):
        """Method to get extra counters data from Manager method with_counts()"""
        result = {}
        for field in ProjectManager.COUNTER_FIELDS:
            value = getattr(self, field, None)
            if value is not None:
                result[field] = value
        return result

    def get_model_versions(self, with_counters=False, extended=False):
        """
        Get model_versions from project predictions.
        :param with_counters: Boolean, if True, counts predictions for each version. Default is False.
        :param extended: Boolean, if True, returns additional information. Default is False.
        :return: Dict or list containing model versions and their count predictions.
        """
        if flag_set(
            'fflag_perf_back_lsdv_4695_update_prediction_query_to_use_direct_project_relation',
            user='auto',
        ):
            predictions = Prediction.objects.filter(project=self)
        else:
            predictions = Prediction.objects.filter(task__project=self)
        # model_versions = set(predictions.values_list('model_version', flat=True).distinct())

        if extended:
            model_versions = list(
                predictions.values('model_version').annotate(count=Count('model_version'), latest=Max('created_at'))
            )

            # remove the load from the DB side and sort in here
            model_versions.sort(key=lambda x: x['latest'], reverse=True)

            return model_versions
        else:
            # TODO this needs to be removed at some point
            model_versions = predictions.values('model_version').annotate(count=Count('model_version'))
            output = {r['model_version']: r['count'] for r in model_versions}

            # Ensure that self.model_version exists in output
            if self.model_version and self.model_version not in output:
                output[self.model_version] = 0

            # Return as per requirement
            return output if with_counters else list(output.keys())

    def get_ml_backends(self, *args, **kwargs):
        from ml.models import MLBackend

        return MLBackend.objects.filter(project=self, **kwargs)

    def has_ml_backend(self, *args, **kwargs):
        return self.get_ml_backends(**kwargs).exists()

    @property
    def ml_backend_in_model_version(self):
        """
        Returns True if the ml_backend title matches this model version.
        If this model version is not set, Returns False
        """
        return bool(self.model_version and self.has_ml_backend(title=self.model_version))

    def update_ml_backends_state(self):
        """
        Updates the state of all ml_backends associated with this instance.

        :return: List of updated MLBackend instances.
        """
        ml_backends = self.get_ml_backends()
        for mlb in ml_backends:
            mlb.update_state()

        return ml_backends

    def get_active_ml_backends(self):
        from ml.models import MLBackendState

        return self.get_ml_backends(state=MLBackendState.CONNECTED)

    def get_all_storage_objects(self, type_='import'):
        from io_storages.models import get_storage_classes

        if hasattr(self, '_storage_objects'):
            return self._storage_objects

        storage_objects = []
        for storage_class in get_storage_classes(type_):
            storage_objects += list(storage_class.objects.filter(project=self))

        self._storage_objects = storage_objects
        return storage_objects

    def resolve_storage_uri(self, url: str) -> Optional[Mapping[str, Any]]:
        from io_storages.functions import get_storage_by_url

        storage_objects = self.get_all_storage_objects()
        storage = get_storage_by_url(url, storage_objects)

        if storage:
            return {
                'url': storage.generate_http_url(url),
                'presign_ttl': storage.presign_ttl,
            }

    def _update_tasks_counters_and_is_labeled(self, task_ids, from_scratch=True):
        """
        Update tasks counters and is_labeled in batches of size settings.BATCH_SIZE.
        :param task_ids: List of task ids to be updated
        :param from_scratch: Skip calculated tasks
        :return: Count of updated tasks
        """
        from tasks.functions import update_tasks_counters

        num_tasks_updated = 0
        page_idx = 0

        while task_ids_slice := task_ids[page_idx * settings.BATCH_SIZE : (page_idx + 1) * settings.BATCH_SIZE]:
            with transaction.atomic():
                # If counters are updated, is_labeled must be updated as well. Hence, if either fails, we
                # will roll back.
                queryset = make_queryset_from_iterable(task_ids_slice)
                num_tasks_updated += update_tasks_counters(queryset, from_scratch)
                bulk_update_stats_project_tasks(queryset, self)
            page_idx += 1
        return num_tasks_updated

    def _update_tasks_counters_and_task_states(
        self,
        queryset,
        maximum_annotations_changed,
        overlap_cohort_percentage_changed,
        tasks_number_changed,
        from_scratch=True,
        recalculate_stats_counts: Optional[Mapping[str, int]] = None,
    ):
        """
        Update tasks counters and update tasks states (rearrange and\or is_labeled)
        :param queryset: Tasks to update queryset
        :param from_scratch: Skip calculated tasks
        :return: Count of updated tasks
        """
        from tasks.functions import update_tasks_counters

        queryset = make_queryset_from_iterable(queryset)
        objs = update_tasks_counters(queryset, from_scratch)
        self._update_tasks_states(maximum_annotations_changed, overlap_cohort_percentage_changed, tasks_number_changed)

        if recalculate_all_stats and recalculate_stats_counts:
            recalculate_all_stats(self.id, **recalculate_stats_counts)

        return objs

    def __str__(self):
        return f'{self.title} (id={self.id})' or _('Business number %d') % self.pk

    class Meta:
        db_table = 'project'
        indexes = [
            models.Index(fields=['pinned_at', 'created_at']),
        ]


class ProjectOnboardingSteps(models.Model):
    """ """

    DATA_UPLOAD = 'DU'
    CONF_SETTINGS = 'CF'
    PUBLISH = 'PB'
    INVITE_EXPERTS = 'IE'

    STEPS_CHOICES = (
        (DATA_UPLOAD, 'Import your data'),
        (CONF_SETTINGS, 'Configure settings'),
        (PUBLISH, 'Publish project'),
        (INVITE_EXPERTS, 'Invite collaborators'),
    )

    code = models.CharField(max_length=2, choices=STEPS_CHOICES, null=True)

    title = models.CharField(_('title'), max_length=1000, null=False)
    description = models.TextField(_('description'), null=False)
    order = models.IntegerField(default=0)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        ordering = ['order']


class ProjectOnboarding(models.Model):
    """ """

    step = models.ForeignKey(ProjectOnboardingSteps, on_delete=models.CASCADE, related_name='po_through')
    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    finished = models.BooleanField(default=False)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def save(self, *args, **kwargs):
        super(ProjectOnboarding, self).save(*args, **kwargs)
        if ProjectOnboarding.objects.filter(project=self.project, finished=True).count() == 4:
            self.project.skip_onboarding = True
            self.project.save(recalc=False)


class LabelStreamHistory(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='histories', help_text='User ID'
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='histories', help_text='Project ID')
    data = models.JSONField(default=list)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'project'], name='unique_history')]


class ProjectMember(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_memberships', help_text='User ID'
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members', help_text='Project ID')
    enabled = models.BooleanField(default=True, help_text='Project member is enabled')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)


class ProjectSummary(models.Model):

    project = AutoOneToOneField(Project, primary_key=True, on_delete=models.CASCADE, related_name='summary')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')

    # { col1: task_count_with_col1, col2: task_count_with_col2 }
    all_data_columns = JSONField(
        _('all data columns'), null=True, default=dict, help_text='All data columns found in imported tasks'
    )
    # [col1, col2]
    common_data_columns = JSONField(
        _('common data columns'), null=True, default=list, help_text='Common data columns found across imported tasks'
    )
    # { (from_name, to_name, type): annotation_count }
    created_annotations = JSONField(
        _('created annotations'),
        null=True,
        default=dict,
        help_text='Unique annotation types identified by tuple (from_name, to_name, type)',
    )
    # { from_name: {label1: task_count_with_label1, label2: task_count_with_label2} }
    created_labels = JSONField(_('created labels'), null=True, default=dict, help_text='Unique labels')
    created_labels_drafts = JSONField(
        _('created labels in drafts'), null=True, default=dict, help_text='Unique drafts labels'
    )

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        return self.project.has_permission(user)

    def reset(self, tasks_data_based=True):
        if tasks_data_based:
            self.all_data_columns = {}
            self.common_data_columns = []
        self.created_annotations = {}
        self.created_labels = {}
        self.created_labels_drafts = {}
        self.save()

    def update_data_columns(self, tasks):
        common_data_columns = set()
        all_data_columns = dict(self.all_data_columns)
        for task in tasks:
            try:
                task_data = get_attr_or_item(task, 'data')
            except KeyError:
                task_data = task
            task_data_keys = task_data.keys()
            for column in task_data_keys:
                all_data_columns[column] = all_data_columns.get(column, 0) + 1
            if not common_data_columns:
                common_data_columns = set(task_data_keys)
            else:
                common_data_columns &= set(task_data_keys)

        self.all_data_columns = all_data_columns
        if not self.common_data_columns:
            self.common_data_columns = list(sorted(common_data_columns))
        else:
            self.common_data_columns = list(sorted(set(self.common_data_columns) & common_data_columns))
        logger.debug(f'summary.all_data_columns = {self.all_data_columns}')
        logger.debug(f'summary.common_data_columns = {self.common_data_columns}')
        self.save(update_fields=['all_data_columns', 'common_data_columns'])

    def remove_data_columns(self, tasks):
        all_data_columns = dict(self.all_data_columns)
        keys_to_remove = []

        for task in tasks:
            task_data = get_attr_or_item(task, 'data')
            for key in task_data.keys():
                if key in all_data_columns:
                    all_data_columns[key] -= 1
                    if all_data_columns[key] == 0:
                        keys_to_remove.append(key)
                        all_data_columns.pop(key)
        self.all_data_columns = all_data_columns

        if keys_to_remove:
            common_data_columns = list(self.common_data_columns)
            for key in keys_to_remove:
                if key in common_data_columns:
                    common_data_columns.remove(key)
            self.common_data_columns = common_data_columns
        logger.debug(f'summary.all_data_columns = {self.all_data_columns}')
        logger.debug(f'summary.common_data_columns = {self.common_data_columns}')
        self.save(
            update_fields=[
                'all_data_columns',
                'common_data_columns',
            ]
        )

    def _get_annotation_key(self, result):
        result_type = result.get('type', None)
        if result_type in ('relation', 'pairwise', None):
            return None
        if 'from_name' not in result or 'to_name' not in result:
            logger.error(
                'Unexpected annotation.result format: "from_name" or "to_name" not found',
                extra={'sentry_skip': True},
            )
            return None
        result_from_name = result['from_name']
        key = get_annotation_tuple(result_from_name, result['to_name'], result_type or '')
        return key

    def _get_labels(self, result):
        result_type = result.get('type')
        # DEV-1990 Workaround for Video labels as there are no labels in VideoRectangle tag
        if result_type in ['videorectangle']:
            result_type = 'labels'
        result_value = result['value'].get(result_type)
        if not result_value or not isinstance(result_value, list) or result_type == 'text':
            # Non-list values are not labels. TextArea list values (texts) are not labels too.
            return []
        # Labels are stored in list
        labels = []
        for label in result_value:
            if result_type == 'taxonomy' and isinstance(label, list):
                for label_ in label:
                    labels.append(str(label_))
            else:
                labels.append(str(label))
        return labels

    def update_created_annotations_and_labels(self, annotations):
        created_annotations = dict(self.created_annotations)
        labels = dict(self.created_labels)
        for annotation in annotations:
            results = get_attr_or_item(annotation, 'result') or []
            if not isinstance(results, list):
                continue

            for result in results:
                # aggregate annotation types
                key = self._get_annotation_key(result)
                if not key:
                    continue
                created_annotations[key] = created_annotations.get(key, 0) + 1
                from_name = result['from_name']

                # aggregate labels
                if from_name not in self.created_labels:
                    labels[from_name] = dict()

                for label in self._get_labels(result):
                    labels[from_name][label] = labels[from_name].get(label, 0) + 1

        logger.debug(f'summary.created_annotations = {created_annotations}')
        logger.debug(f'summary.created_labels = {labels}')
        self.created_annotations = created_annotations
        self.created_labels = labels
        self.save(update_fields=['created_annotations', 'created_labels'])

    def remove_created_annotations_and_labels(self, annotations):
        # we are going to remove all annotations, so we'll reset the corresponding fields on the summary
        remove_all_annotations = self.project.annotations.count() == len(annotations)
        created_annotations, created_labels = (
            ({}, {}) if remove_all_annotations else (dict(self.created_annotations), dict(self.created_labels))
        )

        if not remove_all_annotations:
            for annotation in annotations:
                results = get_attr_or_item(annotation, 'result') or []
                if not isinstance(results, list):
                    continue

                for result in results:
                    # reduce annotation counters
                    key = self._get_annotation_key(result)
                    if key in created_annotations:
                        created_annotations[key] -= 1
                        if created_annotations[key] == 0:
                            created_annotations.pop(key)

                    # reduce labels counters
                    from_name = result.get('from_name', None)
                    if from_name not in created_labels:
                        continue
                    for label in self._get_labels(result):
                        label = str(label)
                        if label in created_labels[from_name]:
                            created_labels[from_name][label] -= 1
                            if created_labels[from_name][label] == 0:
                                created_labels[from_name].pop(label)
                    if not created_labels[from_name]:
                        created_labels.pop(from_name)

        logger.debug(f'summary.created_annotations = {created_annotations}')
        logger.debug(f'summary.created_labels = {created_labels}')
        self.created_annotations = created_annotations
        self.created_labels = created_labels
        self.save(update_fields=['created_annotations', 'created_labels'])

    def update_created_labels_drafts(self, drafts):
        labels = dict(self.created_labels_drafts)
        for draft in drafts:
            results = get_attr_or_item(draft, 'result') or []
            if not isinstance(results, list):
                continue

            for result in results:
                if 'from_name' not in result:
                    continue
                from_name = result['from_name']

                # aggregate labels
                if from_name not in self.created_labels_drafts:
                    labels[from_name] = dict()

                for label in self._get_labels(result):
                    labels[from_name][label] = labels[from_name].get(label, 0) + 1

        logger.debug(f'update summary.created_labels_drafts = {labels}')
        self.created_labels_drafts = labels
        self.save(update_fields=['created_labels_drafts'])

    def remove_created_drafts_and_labels(self, drafts):
        # we are going to remove all drafts, so we'll reset the corresponding field on the summary
        remove_all_drafts = AnnotationDraft.objects.filter(task__project=self.project).count() == len(drafts)
        labels = {} if remove_all_drafts else dict(self.created_labels_drafts)

        if not remove_all_drafts:
            for draft in drafts:
                results = get_attr_or_item(draft, 'result') or []
                if not isinstance(results, list):
                    continue

                for result in results:
                    # reduce labels counters
                    from_name = result.get('from_name', None)
                    if from_name not in labels:
                        continue
                    for label in self._get_labels(result):
                        label = str(label)
                        if label in labels[from_name]:
                            labels[from_name][label] -= 1
                            if labels[from_name][label] == 0:
                                labels[from_name].pop(label)
                    if not labels[from_name]:
                        labels.pop(from_name)
        logger.debug(f'summary.created_labels_drafts = {labels}')
        self.created_labels_drafts = labels
        self.save(update_fields=['created_labels_drafts'])


class ProjectImport(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', _('Created')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

    project = models.ForeignKey('projects.Project', null=True, related_name='imports', on_delete=models.CASCADE)
    preannotated_from_fields = models.JSONField(null=True, blank=True)
    commit_to_project = models.BooleanField(default=False)
    return_task_ids = models.BooleanField(default=False)
    status = models.CharField(max_length=64, choices=Status.choices, default=Status.CREATED)
    url = models.CharField(max_length=2048, null=True, blank=True)
    traceback = models.TextField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(_('created at'), null=True, auto_now_add=True, help_text='Creation time')
    updated_at = models.DateTimeField(_('updated at'), null=True, auto_now_add=True, help_text='Updated time')
    finished_at = models.DateTimeField(_('finished at'), help_text='Complete or fail time', null=True, default=None)
    task_count = models.IntegerField(default=0)
    annotation_count = models.IntegerField(default=0)
    prediction_count = models.IntegerField(default=0)
    duration = models.IntegerField(default=0)
    file_upload_ids = models.JSONField(default=list)
    could_be_tasks_list = models.BooleanField(default=False)
    found_formats = models.JSONField(default=list)
    data_columns = models.JSONField(default=list)
    tasks = models.JSONField(blank=True, null=True)
    task_ids = models.JSONField(default=list)

    def has_permission(self, user):
        return self.project.has_permission(user)


class ProjectReimport(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', _('Created')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

    project = models.ForeignKey('projects.Project', null=True, related_name='reimports', on_delete=models.CASCADE)
    status = models.CharField(max_length=64, choices=Status.choices, default=Status.CREATED)
    error = models.TextField(null=True, blank=True)
    task_count = models.IntegerField(default=0)
    annotation_count = models.IntegerField(default=0)
    prediction_count = models.IntegerField(default=0)
    duration = models.IntegerField(default=0)
    file_upload_ids = models.JSONField(default=list)
    files_as_tasks_list = models.BooleanField(default=False)
    found_formats = models.JSONField(default=list)
    data_columns = models.JSONField(default=list)
    traceback = models.TextField(null=True, blank=True)

    def has_permission(self, user):
        return self.project.has_permission(user)
