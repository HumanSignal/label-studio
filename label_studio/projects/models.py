"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging

from django.apps import apps
from django.db.models import Q, Avg, Count, Sum, Value, BooleanField, Case, When
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.db.models import JSONField
from django.core.validators import MinLengthValidator, MaxLengthValidator
from django.db import transaction, models
from annoying.fields import AutoOneToOneField

from rest_framework.exceptions import ValidationError

from tasks.models import Task, Prediction, Annotation, Q_task_finished_annotations, Q_finished_annotations
from core.utils.common import create_hash, pretty_date, sample_query, get_attr_or_item
from core.label_config import (
    parse_config, validate_label_config, extract_data_types, get_all_object_tag_names, config_line_stipped,
    get_sample_task, get_all_labels, get_all_control_tag_tuples, get_annotation_tuple
)

logger = logging.getLogger(__name__)


class Project(models.Model):
    """
    """
    __original_label_config = None
    
    title = models.CharField(_('title'), null=True, blank=True, default='', max_length=settings.PROJECT_TITLE_MAX_LEN,
                             help_text=f'Project name. Must be between {settings.PROJECT_TITLE_MIN_LEN} and {settings.PROJECT_TITLE_MAX_LEN} characters long.',
                             validators=[MinLengthValidator(settings.PROJECT_TITLE_MIN_LEN), MaxLengthValidator(settings.PROJECT_TITLE_MAX_LEN)])
    description = models.TextField(_('description'), blank=True, null=True, default='', help_text='Project description')

    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='projects', null=True)
    label_config = models.TextField(_('label config'), blank=True, null=True, default='<View></View>',
                                    help_text='Label config in XML format. See more about it in documentation')
    expert_instruction = models.TextField(_('expert instruction'), blank=True, null=True, default='', help_text='Labeling instructions in HTML format')
    show_instruction = models.BooleanField(_('show instruction'), default=False, help_text='Show instructions to the annotator before they start')

    show_skip_button = models.BooleanField(_('show skip button'), default=True, help_text='Show a skip button in interface and allow annotators to skip the task')
    enable_empty_annotation = models.BooleanField(_('enable empty annotation'), default=True, help_text='Allow annotators to submit empty annotations')

    show_annotation_history = models.BooleanField(_('show annotation history'), default=False, help_text='Show annotation history to annotator')
    show_collab_predictions = models.BooleanField(_('show predictions to annotator'), default=True, help_text='If set, the annotator can view model predictions')
    token = models.CharField(_('token'), max_length=256, default=create_hash, null=True, blank=True)
    result_count = models.IntegerField(_('result count'), default=0, help_text='Total results inside of annotations counter')
    color = models.CharField(_('color'), max_length=16, default='#FFFFFF', null=True, blank=True)
    template_used = models.ForeignKey(
        'projects.ProjectTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects',
        verbose_name=_('Project templates')
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_projects',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('created by')
    )
    maximum_annotations = models.IntegerField(_('maximum annotation number'), default=1,
                                              help_text='Maximum number of annotations for one task. '
                                                        'If the number of annotations per task is equal or greater '
                                                        'to this value, the task is completed (is_labeled=True)')
    min_annotations_to_start_training = models.IntegerField(
        _('min_annotations_to_start_training'),
        default=10,
        help_text='Minimum number of completed tasks after which model training is started'
    )

    control_weights = JSONField(_('control weights'), null=True, default=dict, help_text='Weights for control tags')
    model_version = models.TextField(_('model version'), blank=True, null=True, default='',
                                     help_text='Machine learning model version')
    data_types = JSONField(_('data_types'), default=dict, null=True)
    
    is_draft = models.BooleanField(
        _('is draft'), default=False, help_text='Whether or not the project is in the middle of being created')
    is_published = models.BooleanField(_('published'), default=False, help_text='Whether or not the project is published to annotators')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    SEQUENCE = 'Sequential sampling'
    UNIFORM = 'Uniform sampling'
    UNCERTAINTY = 'Uncertainty sampling'

    SAMPLING_CHOICES = (
        (SEQUENCE, 'Tasks are ordered by their IDs'),
        (UNIFORM, 'Tasks are chosen randomly'),
        (UNCERTAINTY, 'Tasks are chosen according to model uncertainty scores (active learning mode)')
    )

    sampling = models.CharField(max_length=100, choices=SAMPLING_CHOICES, null=True, default=SEQUENCE)
    show_ground_truth_first = models.BooleanField(_('show ground truth first'), default=True)
    show_overlap_first = models.BooleanField(_('show overlap first'), default=True)
    overlap_cohort_percentage = models.IntegerField(_('overlap_cohort_percentage'), default=100)

    task_data_login = models.CharField(
        _('task_data_login'), max_length=256, blank=True, null=True, help_text='Task data credentials: login')
    task_data_password = models.CharField(
        _('task_data_password'), max_length=256, blank=True, null=True, help_text='Task data credentials: password')

    def __init__(self, *args, **kwargs):
        super(Project, self).__init__(*args, **kwargs)
        self.__original_label_config = self.label_config
        self.__maximum_annotations = self.maximum_annotations
        self.__overlap_cohort_percentage = self.overlap_cohort_percentage

        # TODO: once bugfix with incorrect data types in List
        # logging.warning('! Please, remove code below after patching of all projects (extract_data_types)')
        if self.label_config is not None:
            if self.data_types != extract_data_types(self.label_config):
                self.data_types = extract_data_types(self.label_config)

    @property
    def num_tasks(self):
        return self.tasks.count()

    def get_current_predictions(self):
        return Prediction.objects.filter(Q(task__project=self.id) & Q(model_version=self.model_version))

    @property
    def num_predictions(self):
        return self.get_current_predictions().count()

    @property
    def num_annotations(self):
        return Annotation.objects.filter(Q(task__project=self) & Q_finished_annotations & Q(ground_truth=False)).count()

    @property
    def has_predictions(self):
        return self.get_current_predictions().exists()

    @property
    def has_any_predictions(self):
        return Prediction.objects.filter(Q(task__project=self.id)).exists()

    @property
    def business(self):
        return self.created_by.business

    @property
    def is_private(self):
        return None

    @property
    def has_storages(self):
        return hasattr(self, 'storages') and self.storages is not None and self.storages.count() > 0

    @property
    def secure_mode(self):
        return False

    @property
    def one_object_in_label_config(self):
        return len(self.data_types) <= 1

    @property
    def only_undefined_field(self):
        return self.one_object_in_label_config and self.summary.common_data_columns and self.summary.common_data_columns[0] == settings.DATA_UNDEFINED_NAME

    @property
    def get_labeled_count(self):
        return self.tasks.filter(is_labeled=True).count()
    
    @property
    def get_collected_count(self):
        return self.tasks.count()

    @property
    def num_tasks_with_annotations(self):
        return self.tasks.filter(
            Q(annotations__isnull=False) &
            Q(annotations__ground_truth=False) &
            Q_task_finished_annotations
        ).distinct().count()

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
            raise KeyError(f'Can\'t find Project by invite URL: {url}')

    def reset_token(self):
        self.token = create_hash()
        self.save()

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

    def update_tasks_states(self, maximum_annotations_changed, overlap_cohort_percentage_changed,
                            tasks_number_changed):

        # if only maximum annotations parameter is tweaked
        if maximum_annotations_changed and not overlap_cohort_percentage_changed:
            tasks_with_overlap = self.tasks.filter(overlap__gt=1)
            if tasks_with_overlap.exists():
                # if there is a part with overlaped tasks, affect only them
                tasks_with_overlap.update(overlap=self.maximum_annotations)
            else:
                # otherwise affect all tasks
                self.tasks.update(overlap=self.maximum_annotations)

        # if cohort slider is tweaked
        elif overlap_cohort_percentage_changed and self.maximum_annotations > 1:
            self._rearrange_overlap_cohort()

        # if adding/deleting tasks and cohort settings are applied
        elif tasks_number_changed and self.overlap_cohort_percentage < 100 and self.maximum_annotations > 1:
            self._rearrange_overlap_cohort()

    def _rearrange_overlap_cohort(self):
        tasks_with_overlap = self.tasks.filter(overlap__gt=1)
        tasks_with_overlap_count = tasks_with_overlap.count()
        total_tasks = self.tasks.count()

        new_tasks_with_overlap_count = int(self.overlap_cohort_percentage / 100 * total_tasks + 0.5)
        if tasks_with_overlap_count > new_tasks_with_overlap_count:
            # TODO: warn if we try to reduce current cohort that is already labeled with overlap
            reduce_by = tasks_with_overlap_count - new_tasks_with_overlap_count
            reduce_tasks = sample_query(tasks_with_overlap, reduce_by)
            reduce_tasks.update(overlap=1)
            reduced_tasks_ids = reduce_tasks.values_list('id', flat=True)
            tasks_with_overlap.exclude(id__in=reduced_tasks_ids).update(overlap=self.maximum_annotations)

        elif tasks_with_overlap_count < new_tasks_with_overlap_count:
            increase_by = new_tasks_with_overlap_count - tasks_with_overlap_count
            tasks_without_overlap = self.tasks.filter(overlap=1)
            increase_tasks = sample_query(tasks_without_overlap, increase_by)
            increase_tasks.update(overlap=self.maximum_annotations)
            tasks_with_overlap.update(overlap=self.maximum_annotations)

    def remove_tasks_by_file_uploads(self, file_upload_ids):
        self.tasks.filter(file_upload_id__in=file_upload_ids).delete()

    def advance_onboarding(self):
        """ Move project to next onboarding step
        """
        po_qs = self.steps_left.order_by('step__order')
        count = po_qs.count()
        
        if count:
            po = po_qs.first()
            po.finished = True
            po.save()
            
            return count != 1

    def created_at_prettify(self):
        return self.created_at.strftime("%d %b %Y %H:%M:%S")

    def onboarding_step_finished(self, step):
        """ Mark specific step as finished
        """
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

    def validate_config(self, config_string):
        self.validate_label_config(config_string)
        if not hasattr(self, 'summary'):
            return

        # validate data columns consistency
        fields_from_config = get_all_object_tag_names(config_string)
        if not fields_from_config:
            logger.debug(f'Data fields not found in labeling config')
            return
        fields_from_data = set(self.summary.common_data_columns)
        fields_from_data.discard(settings.DATA_UNDEFINED_NAME)
        if fields_from_data and not fields_from_config.issubset(fields_from_data):
            different_fields = list(fields_from_config.difference(fields_from_data))
            raise ValidationError(f'These fields are not present in the data: {",".join(different_fields)}')

        # validate annotations consistency
        annotations_from_config = set(get_all_control_tag_tuples(config_string))
        if not annotations_from_config:
            logger.debug(f'Annotation schema is not found in config')
            return
        annotations_from_data = set(self.summary.created_annotations)
        if annotations_from_data and not annotations_from_data.issubset(annotations_from_config):
            different_annotations = list(annotations_from_data.difference(annotations_from_config))
            diff_str = []
            for ann_tuple in different_annotations:
                from_name, to_name, t = ann_tuple.split('|')
                diff_str.append(
                    f'{self.summary.created_annotations[ann_tuple]} '
                    f'with from_name={from_name}, to_name={to_name}, type={t}')
            diff_str = '\n'.join(diff_str)
            raise ValidationError(f'Created annotations are incompatible with provided labeling schema, '
                                  f'we found:\n{diff_str}')

        # validate labels consistency
        labels_from_config = get_all_labels(config_string)
        created_labels = self.summary.created_labels
        for control_tag_from_data, labels_from_data in created_labels.items():
            # Check if labels created in annotations, and their control tag has been removed
            if labels_from_data and control_tag_from_data not in labels_from_config:
                raise ValidationError(
                    f'There are {sum(labels_from_data.values(), 0)} annotation(s) created with tag '
                    f'"{control_tag_from_data}", you can\'t remove it')
            labels_from_config_by_tag = set(labels_from_config[control_tag_from_data])
            if not set(labels_from_data).issubset(set(labels_from_config_by_tag)):
                different_labels = list(set(labels_from_data).difference(labels_from_config_by_tag))
                diff_str = '\n'.join(f'{l} ({labels_from_data[l]} annotations)' for l in different_labels)
                raise ValidationError(f'These labels still exist in annotations:\n{diff_str}')

    def _label_config_has_changed(self):
        return self.label_config != self.__original_label_config

    def delete_predictions(self):
        predictions = Prediction.objects.filter(task__project=self)
        count = predictions.count()
        predictions.delete()
        return {'deleted_predictions': count}

    def get_updated_weights(self):
        outputs = parse_config(self.label_config)
        control_weights = {}
        exclude_control_types = ('Filter',)
        for control_name in outputs:
            control_type = outputs[control_name]['type']
            if control_type in exclude_control_types:
                continue
            control_weights[control_name] = {
                'overall': 1.0,
                'type': control_type,
                'labels': {label: 1.0 for label in outputs[control_name].get('labels', [])}
            }
        return control_weights

    def save(self, *args, recalc=True, **kwargs):
        exists = True if self.pk else False

        if self.label_config and (self._label_config_has_changed() or not exists or not self.control_weights):
            self.control_weights = self.get_updated_weights()
        super(Project, self).save(*args, **kwargs)
        project_with_config_just_created = not exists and self.pk and self.label_config
        if self._label_config_has_changed() or project_with_config_just_created:
            self.data_types = extract_data_types(self.label_config)

        if self._label_config_has_changed():
            self.__original_label_config = self.label_config

        if not exists:
            steps = ProjectOnboardingSteps.objects.all()
            objs = [ProjectOnboarding(project=self, step=step) for step in steps]
            ProjectOnboarding.objects.bulk_create(objs)

        # argument for recalculate project task stats
        if recalc:
            self.update_tasks_states(
                maximum_annotations_changed=self.__maximum_annotations != self.maximum_annotations,
                overlap_cohort_percentage_changed=self.__overlap_cohort_percentage != self.overlap_cohort_percentage,
                tasks_number_changed=False
            )
            self.__maximum_annotations = self.maximum_annotations
            self.__overlap_cohort_percentage = self.overlap_cohort_percentage

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
        """ Annotators connected to this project including team members
        """
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
        """ Annotators with annotation number > min_number

        :param min_count: minimal annotation number to leave an annotators
        :return: filtered annotators
        """
        annotators = self.annotators()
        q = Q(annotations__task__project=self) & Q_task_finished_annotations & Q(annotations__ground_truth=False)
        annotators = annotators.annotate(annotation_count=Count('annotations', filter=q, distinct=True))
        return annotators.filter(annotation_count__gte=min_count)
        
    def labeled_tasks(self):
        return self.tasks.filter(is_labeled=True)

    def has_annotations(self):
        from tasks.models import Annotation  # prevent cycling imports
        return Annotation.objects.filter(Q(task__project=self) & Q(ground_truth=False)).count() > 0

    # [TODO] this should be a template tag or something like this
    @property
    def label_config_line(self):
        c = self.label_config
        return config_line_stipped(c)

    def get_sample_task(self, label_config=None):
        config = label_config or self.label_config
        task, _, _ = get_sample_task(config)
        return task

    def pretty_model_version(self):
        if not self.model_version:
            return 'Undefined model version'
        return pretty_date(self.model_version)

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
            task__project=self.id, task__is_labeled=False, ground_truth=False, result__isnull=False).count()

        # get minimum remain annotations
        total_annotations_needed = self.get_total_possible_count
        annotations_remain = total_annotations_needed - min_n_finished_annotations - annotations_unfinished_tasks

        # get average time of all finished TC
        finished_annotations = Annotation.objects.filter(
            Q(task__project=self.id) & Q(ground_truth=False), result__isnull=False).values('lead_time')
        avg_lead_time = finished_annotations.aggregate(avg_lead_time=Avg('lead_time'))['avg_lead_time']

        if avg_lead_time is None:
            return None
        return avg_lead_time * annotations_remain

    def finished(self):
        return not self.tasks.filter(is_labeled=False).exists()

    def annotations_lead_time(self):
        annotations = Annotation.objects.filter(Q(task__project=self.id) & Q(ground_truth=False))
        return annotations.aggregate(avg_lead_time=Avg('lead_time'))['avg_lead_time']
    
    @staticmethod
    def django_settings():
        return settings

    @staticmethod
    def max_tasks_file_size():
        return settings.TASKS_MAX_FILE_SIZE

    def get_control_tags_from_config(self):
        return parse_config(self.label_config)

    def get_parsed_config(self):
        return parse_config(self.label_config)

    def __str__(self):
        return f'{self.title} (id={self.id})' or _("Business number %d") % self.pk

    class Meta:
        db_table = 'project'


class ProjectTemplate(models.Model):
    """ Project Template is used to create new projects from templates
    """
    title               = models.CharField(_('title'), max_length=1000, null=False)
    description         = models.TextField(_('description'), null=True, default='')
    cover_image_url     = models.CharField(_('cover image'), max_length=1000, null=True, blank=True, default='')
    input_example       = models.TextField(_('input example'), blank=True)
    input_example_json  = JSONField(_('input example json'), default=list)
    output_example      = models.TextField(_('output example'), blank=True)
    output_example_json = JSONField(_('output example json'), default=list)
    label_config        = models.TextField(_('label config'), blank=False)
    expert_instruction  = models.TextField(_('annotator instructions'), blank=False, null=False, default='')
    
    tags = JSONField(_('tags'), default=list)
    task_data = JSONField(_('task data'), default=list)
    
    is_published = models.BooleanField(_('published'), default=True)

    #  serialized as dict (could be model parameters and other)
    project_settings = JSONField(
        _('project settings'), default=dict, help_text='general dict serialized project settings')
    is_private = models.BooleanField(
        _('private'), default=True, help_text='If template is private, it is accessible only from private team')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='project_templates', on_delete=models.SET_NULL, null=True,
        verbose_name=_('created by'))
    organization = models.ForeignKey(
        'organizations.Organization', related_name='project_templates', on_delete=models.SET_NULL, null=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def _get_param(self, name):
        value = self.project_settings.get(name)
        if value is None:
            return Project._meta.get_field(name).get_default()
        return value

    def create_project(self, user, title, team_id, include_example_data=False, membership=None,
                       *args, **kwargs):
        """ Create new project instance based on project
        """
        if user is None or title is None:
            raise ValidationError(_('user and title are required'))

        p = Project.objects.create(
            title=title,
            created_by=user,
            template_used=self,
            label_config=self.label_config,
            skip_onboarding=True,
            # extra args
            expert_instruction=self._get_param('expert_instruction'),
            show_instruction=self._get_param('show_instruction'),
            show_skip_button=self._get_param('show_skip_button'),
            enable_empty_annotation=self._get_param('enable_empty_annotation'),
            show_annotation_history=self._get_param('show_annotation_history'),
            show_collab_predictions=self._get_param('show_collab_predictions'),
            maximum_annotations=self._get_param('maximum_annotations'),
            batch_size=self._get_param('batch_size'),
            min_annotations_to_start_training=self._get_param('min_annotations_to_start_training'),
            agreement_threshold=self._get_param('agreement_threshold'),
            metric_threshold=self._get_param('metric_threshold'),
            # agreement_method=self._get_param('agreement_method'),
            sampling=self._get_param('sampling'),
            show_ground_truth_first=self._get_param('show_ground_truth_first'),
            show_overlap_first=self._get_param('show_overlap_first'),
            overlap_cohort_percentage=self._get_param('overlap_cohort_percentage'),
            use_kappa=self._get_param('use_kappa'),
            metric_name=self._get_param('metric_name'),
            metric_params=self._get_param('metric_params'),
            control_weights=self._get_param('control_weights')
        )

        if include_example_data:
            from projects.functions import add_data_to_project
            add_data_to_project(p, [generate_sample_task_without_check(p.label_config, secure_mode=p.secure_mode)])
            p.onboarding_step_finished(ProjectOnboardingSteps.DATA_UPLOAD)

        return p

    def __str__(self):
        return self.title
    
    
class ProjectOnboardingSteps(models.Model):
    """
    """
    DATA_UPLOAD    = "DU"
    CONF_SETTINGS  = "CF"
    PUBLISH        = "PB"
    INVITE_EXPERTS = "IE"
    
    STEPS_CHOICES = (
        (DATA_UPLOAD, "Import your data"),
        (CONF_SETTINGS, "Configure settings"),
        (PUBLISH, "Publish project"),
        (INVITE_EXPERTS, "Invite collaborators")
    )
    
    code = models.CharField(max_length=2, choices=STEPS_CHOICES, null=True)
    
    title       = models.CharField(_('title'), max_length=1000, null=False)
    description = models.TextField(_('description'), null=False)
    order       = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        ordering = ['order']


class ProjectOnboarding(models.Model):
    """
    """
    step = models.ForeignKey(ProjectOnboardingSteps, on_delete=models.CASCADE, related_name="po_through")
    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    finished = models.BooleanField(default=False)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def save(self, *args, **kwargs):
        super(ProjectOnboarding, self).save(*args, **kwargs)
        if ProjectOnboarding.objects.filter(project=self.project, finished=True).count() == 4:
            self.project.skip_onboarding = True
            self.project.save(recalc=False)


class ProjectMember(models.Model):

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_memberships', help_text='User ID')  # noqa
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members', help_text='Project ID')
    enabled = models.BooleanField(default=True, help_text='Project member is enabled')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)


class ProjectSummary(models.Model):

    project = AutoOneToOneField(Project, primary_key=True, on_delete=models.CASCADE, related_name='summary')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')

    # { col1: task_count_with_col1, col2: task_count_with_col2 }
    all_data_columns = JSONField(
        _('all data columns'), null=True, default=dict, help_text='All data columns found in imported tasks')
    # [col1, col2]
    common_data_columns = JSONField(
        _('common data columns'), null=True, default=list, help_text='Common data columns found across imported tasks')
    # { (from_name, to_name, type): annotation_count }
    created_annotations = JSONField(
        _('created annotations'), null=True, default=dict, help_text='Unique annotation types identified by tuple (from_name, to_name, type)')  # noqa
    # { from_name: {label1: task_count_with_label1, label2: task_count_with_label2} }
    created_labels = JSONField(
        _('created labels'), null=True, default=dict, help_text='Unique labels')

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
        self.save()

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
        self.save()

    def _get_annotation_key(self, result):
        result_type = result.get('type')
        if result_type in ('relation', 'rating', 'pairwise'):
            return None
        if 'from_name' not in result or 'to_name' not in result:
            logger.error(
                'Unexpected annotation.result format: "from_name" or "to_name" not found in %r' % result)
            return None
        result_from_name = result['from_name']
        key = get_annotation_tuple(result_from_name, result['to_name'], result_type or '')
        return key

    def _get_labels(self, result):
        result_type = result.get('type')
        labels = []
        for label in result['value'].get(result_type, []):
            if isinstance(label, list):
                labels.extend(label)
            else:
                labels.append(label)
        return labels

    def update_created_annotations_and_labels(self, annotations):
        created_annotations = dict(self.created_annotations)
        labels = dict(self.created_labels)
        for annotation in annotations:
            for result in get_attr_or_item(annotation, 'result'):

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

        self.created_annotations = created_annotations
        self.created_labels = labels
        self.save()

    def remove_created_annotations_and_labels(self, annotations):
        created_annotations = dict(self.created_annotations)
        labels = dict(self.created_labels)
        for annotation in annotations:
            for result in get_attr_or_item(annotation, 'result'):

                # reduce annotation counters
                key = self._get_annotation_key(result)
                if key in created_annotations:
                    created_annotations[key] -= 1
                    if created_annotations[key] == 0:
                        created_annotations.pop(key)

                # reduce labels counters
                from_name = result['from_name']
                if from_name not in labels:
                    continue
                for label in self._get_labels(result):
                    if label in labels[from_name]:
                        labels[from_name][label] -= 1
                        if labels[from_name][label] == 0:
                            labels[from_name].pop(label)
                if not labels[from_name]:
                    labels.pop(from_name)

        self.created_annotations = created_annotations
        self.created_labels = labels
        self.save()

