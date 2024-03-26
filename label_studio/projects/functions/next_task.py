import logging
from collections import Counter
from typing import List, Tuple, Union

from core.feature_flags import flag_set
from core.utils.common import conditional_atomic, db_is_not_sqlite, load_func
from django.conf import settings
from django.db.models import BooleanField, Case, Count, Exists, F, Max, OuterRef, Q, QuerySet, Value, When
from django.db.models.fields import DecimalField
from projects.functions.stream_history import add_stream_history
from projects.models import Project
from tasks.models import Annotation, Task
from users.models import User

logger = logging.getLogger(__name__)

get_tasks_agreement_queryset = load_func(settings.GET_TASKS_AGREEMENT_QUERYSET)


def get_next_task_logging_level(user: User) -> int:
    level = logging.DEBUG
    if flag_set('fflag_fix_back_dev_4185_next_task_additional_logging_long', user=user):
        level = logging.INFO
    return level


def _get_random_unlocked(task_query: QuerySet[Task], user: User, upper_limit=None) -> Union[Task, None]:
    for task in task_query.order_by('?').only('id')[: settings.RANDOM_NEXT_TASK_SAMPLE_SIZE]:
        try:
            task = Task.objects.select_for_update(skip_locked=True).get(pk=task.id)
            if not task.has_lock(user):
                return task
        except Task.DoesNotExist:
            logger.debug('Task with id {} locked'.format(task.id))


def _get_first_unlocked(tasks_query: QuerySet[Task], user) -> Union[Task, None]:
    # Skip tasks that are locked due to being taken by collaborators
    for task_id in tasks_query.values_list('id', flat=True):
        try:
            task = Task.objects.select_for_update(skip_locked=True).get(pk=task_id)
            if not task.has_lock(user):
                return task

        except Task.DoesNotExist:
            logger.debug('Task with id {} locked'.format(task_id))


def _try_ground_truth(tasks: QuerySet[Task], project: Project, user: User) -> Union[Task, None]:
    """Returns task from ground truth set"""
    ground_truth = Annotation.objects.filter(task=OuterRef('pk'), ground_truth=True)
    not_solved_tasks_with_ground_truths = tasks.annotate(has_ground_truths=Exists(ground_truth)).filter(
        has_ground_truths=True
    )
    if not_solved_tasks_with_ground_truths.exists():
        if project.sampling == project.SEQUENCE:
            return _get_first_unlocked(not_solved_tasks_with_ground_truths, user)
        return _get_random_unlocked(not_solved_tasks_with_ground_truths, user)


def _try_tasks_with_overlap(tasks: QuerySet[Task]) -> Tuple[Union[Task, None], QuerySet[Task]]:
    """Filter out tasks without overlap (doesn't return next task)"""
    tasks_with_overlap = tasks.filter(overlap__gt=1)
    if tasks_with_overlap.exists():
        return None, tasks_with_overlap
    else:
        return None, tasks.filter(overlap=1)


def _try_breadth_first(tasks: QuerySet[Task], user: User) -> Union[Task, None]:
    """Try to find tasks with maximum amount of annotations, since we are trying to label tasks as fast as possible"""

    tasks = tasks.annotate(annotations_count=Count('annotations', filter=~Q(annotations__completed_by=user)))
    max_annotations_count = tasks.aggregate(Max('annotations_count'))['annotations_count__max']
    if max_annotations_count == 0:
        # there is no any labeled tasks found
        return

    # find any task with maximal amount of created annotations
    not_solved_tasks_labeling_started = tasks.annotate(
        reach_max_annotations_count=Case(
            When(annotations_count=max_annotations_count, then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        )
    )
    not_solved_tasks_labeling_with_max_annotations = not_solved_tasks_labeling_started.filter(
        reach_max_annotations_count=True
    )
    if not_solved_tasks_labeling_with_max_annotations.exists():
        # try to complete tasks that are already in progress
        return _get_random_unlocked(not_solved_tasks_labeling_with_max_annotations, user)


def _try_uncertainty_sampling(
    tasks: QuerySet[Task],
    project: Project,
    user_solved_tasks_array: List[int],
    user: User,
    prepared_tasks: QuerySet[Task],
) -> Union[Task, None]:
    task_with_current_predictions = tasks.filter(predictions__model_version=project.model_version)
    if task_with_current_predictions.exists():
        logger.debug('Use uncertainty sampling')
        # collect all clusters already solved by user, count number of solved task in them
        user_solved_clusters = (
            prepared_tasks.filter(pk__in=user_solved_tasks_array)
            .annotate(cluster=Max('predictions__cluster'))
            .values_list('cluster', flat=True)
        )
        user_solved_clusters = Counter(user_solved_clusters)
        # order each task by the count of how many tasks solved in it's cluster
        cluster_num_solved_map = [When(predictions__cluster=k, then=v) for k, v in user_solved_clusters.items()]

        # WARNING! this call doesn't work after consequent annotate
        num_tasks_with_current_predictions = task_with_current_predictions.count()
        if cluster_num_solved_map:
            task_with_current_predictions = task_with_current_predictions.annotate(
                cluster_num_solved=Case(*cluster_num_solved_map, default=0, output_field=DecimalField())
            )
            # next task is chosen from least solved cluster and with lowest prediction score
            possible_next_tasks = task_with_current_predictions.order_by('cluster_num_solved', 'predictions__score')
        else:
            possible_next_tasks = task_with_current_predictions.order_by('predictions__score')

        num_annotators = project.annotators().count()
        if num_annotators > 1 and num_tasks_with_current_predictions > 0:
            # try to randomize tasks to avoid concurrent labeling between several annotators
            next_task = _get_random_unlocked(
                possible_next_tasks, user, upper_limit=min(num_annotators + 1, num_tasks_with_current_predictions)
            )
        else:
            next_task = _get_first_unlocked(possible_next_tasks, user)
    else:
        # uncertainty sampling fallback: choose by random sampling
        logger.debug(
            f'Uncertainty sampling fallbacks to random sampling '
            f'(current project.model_version={str(project.model_version)})'
        )
        next_task = _get_random_unlocked(tasks, user)
    return next_task


def get_not_solved_tasks_qs(
    user: User, project: Project, prepared_tasks: QuerySet[Task], assigned_flag: Union[bool, None], queue_info: str
) -> Tuple[QuerySet[Task], List[int], str, bool]:
    user_solved_tasks_array = user.annotations.filter(project=project, task__isnull=False)
    user_solved_tasks_array = user_solved_tasks_array.distinct().values_list('task__pk', flat=True)
    not_solved_tasks = prepared_tasks.exclude(pk__in=user_solved_tasks_array)

    # annotation can't have postponed draft, so skip annotation__project filter
    postponed_drafts = user.drafts.filter(task__project=project, was_postponed=True)
    if postponed_drafts.exists():
        user_postponed_tasks = postponed_drafts.distinct().values_list('task__pk', flat=True)
        not_solved_tasks = not_solved_tasks.exclude(pk__in=user_postponed_tasks)

    prioritized_on_agreement = False
    # if annotator is assigned for tasks, he must solve it regardless of is_labeled=True
    if not assigned_flag:
        # include tasks that have been completed if their agreement is not at threshold if threshold setting is set
        lse_project = getattr(project, 'lse_project', None)
        if (
            lse_project
            and flag_set('fflag_feat_optic_161_project_settings_for_low_agreement_threshold_score_short', user='auto')
            and lse_project.agreement_threshold is not None
            and get_tasks_agreement_queryset
            and user.is_project_annotator(project)
        ):
            not_solved_tasks = (
                get_tasks_agreement_queryset(not_solved_tasks)
                # include tasks that are not labeled or are labeled but fall below the agreement threshold
                .filter(
                    Q(_agreement__lt=lse_project.agreement_threshold, is_labeled=True) | Q(is_labeled=False)
                ).annotate(annotators=Count('annotations__completed_by', distinct=True))
                # skip tasks that have been annotated by the maximum additional number of annotators
                .filter(annotators__lt=F('overlap') + lse_project.max_additional_annotators_assignable)
            )
            prioritized_on_agreement, not_solved_tasks = _prioritize_low_agreement_tasks(not_solved_tasks, lse_project)

        # otherwise, filtering out completed tasks is sufficient
        else:
            not_solved_tasks = not_solved_tasks.filter(is_labeled=False)

    if not flag_set('fflag_fix_back_lsdv_4523_show_overlap_first_order_27022023_short'):
        # show tasks with overlap > 1 first (unless tasks are already prioritized on agreement)
        if project.show_overlap_first and not prioritized_on_agreement:
            # don't output anything - just filter tasks with overlap
            logger.debug(f'User={user} tries overlap first from prepared tasks')
            _, not_solved_tasks = _try_tasks_with_overlap(not_solved_tasks)
            queue_info += (' & ' if queue_info else '') + 'Show overlap first'

    return not_solved_tasks, user_solved_tasks_array, queue_info, prioritized_on_agreement


def _prioritize_low_agreement_tasks(tasks, lse_project):
    # if there are any tasks with agreement below the threshold which are labeled, prioritize them over the rest
    # and return all tasks to be considered for sampling in order by least agreement
    prioritized_low_agreement = tasks.filter(_agreement__lt=lse_project.agreement_threshold, is_labeled=True)

    if prioritized_low_agreement.exists():
        return True, tasks.order_by('-is_labeled', '_agreement')

    return False, tasks


def get_next_task_without_dm_queue(
    user: User,
    project: Project,
    not_solved_tasks: QuerySet,
    assigned_flag: Union[bool, None],
    prioritized_low_agreement: bool,
) -> Tuple[Union[Task, None], bool, str]:
    next_task = None
    use_task_lock = True
    queue_info = ''

    # ordered by data manager
    if assigned_flag:
        logger.debug(f'User={user} try to get task from assigned')
        next_task = not_solved_tasks.first()
        use_task_lock = False
        queue_info += (' & ' if queue_info else '') + 'Manually assigned queue'

    # If current user has already lock one task - return it (without setting the lock again)
    if not next_task:
        next_task = Task.get_locked_by(user, tasks=not_solved_tasks)
        if next_task:
            logger.debug(f'User={user} got already locked for them {next_task}')
            use_task_lock = False
            queue_info += (' & ' if queue_info else '') + 'Task lock'

    if not next_task and prioritized_low_agreement:
        logger.debug(f'User={user} tries low agreement from prepared tasks')
        next_task = _get_first_unlocked(not_solved_tasks, user)
        queue_info += (' & ' if queue_info else '') + 'Low agreement queue'

    if not next_task and project.show_ground_truth_first:
        logger.debug(f'User={user} tries ground truth from prepared tasks')
        next_task = _try_ground_truth(not_solved_tasks, project, user)
        queue_info += (' & ' if queue_info else '') + 'Ground truth queue'

    if not next_task and project.maximum_annotations > 1:
        # if there are any tasks in progress (with maximum number of annotations), randomly sampling from them
        logger.debug(f'User={user} tries depth first from prepared tasks')
        next_task = _try_breadth_first(not_solved_tasks, user)
        if next_task:
            queue_info += (' & ' if queue_info else '') + 'Breadth first queue'

    return next_task, use_task_lock, queue_info


def skipped_queue(next_task, prepared_tasks, project, user, queue_info):
    if not next_task and project.skip_queue == project.SkipQueue.REQUEUE_FOR_ME:
        q = Q(project=project, task__isnull=False, was_cancelled=True, task__is_labeled=False)
        skipped_tasks = user.annotations.filter(q).order_by('updated_at').values_list('task__pk', flat=True)
        if skipped_tasks.exists():
            preserved_order = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(skipped_tasks)])
            skipped_tasks = prepared_tasks.filter(pk__in=skipped_tasks).order_by(preserved_order)
            next_task = _get_first_unlocked(skipped_tasks, user)
            queue_info = 'Skipped queue'

    return next_task, queue_info


def postponed_queue(next_task, prepared_tasks, project, user, queue_info):
    if not next_task:
        q = Q(task__project=project, task__isnull=False, was_postponed=True, task__is_labeled=False)
        if flag_set('fflag_fix_back_lsdv_1044_check_annotations_24012023_short', user):
            q &= ~Q(task__annotations__completed_by=user)

        postponed_tasks = user.drafts.filter(q).order_by('updated_at').values_list('task__pk', flat=True)
        if postponed_tasks.exists():
            preserved_order = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(postponed_tasks)])
            postponed_tasks = prepared_tasks.filter(pk__in=postponed_tasks).order_by(preserved_order)
            next_task = _get_first_unlocked(postponed_tasks, user)
            if next_task is not None:
                next_task.allow_postpone = False
            queue_info = 'Postponed draft queue'

    return next_task, queue_info


def get_task_from_qs_with_sampling(
    not_solved_tasks: QuerySet[Task],
    user_solved_tasks_array: List[int],
    prepared_tasks: QuerySet,
    user: User,
    project: Project,
    queue_info: str,
) -> Tuple[Union[Task, None], str]:
    next_task = None
    if project.sampling == project.SEQUENCE:
        logger.debug(f'User={user} tries sequence sampling from prepared tasks')
        next_task = _get_first_unlocked(not_solved_tasks, user)
        if next_task:
            queue_info += (' & ' if queue_info else '') + 'Sequence queue'

    elif project.sampling == project.UNCERTAINTY:
        logger.debug(f'User={user} tries uncertainty sampling from prepared tasks')
        next_task = _try_uncertainty_sampling(not_solved_tasks, project, user_solved_tasks_array, user, prepared_tasks)
        if next_task:
            queue_info += (' & ' if queue_info else '') + 'Active learning or random queue'

    elif project.sampling == project.UNIFORM:
        logger.debug(f'User={user} tries random sampling from prepared tasks')
        next_task = _get_random_unlocked(not_solved_tasks, user)
        if next_task:
            queue_info += (' & ' if queue_info else '') + 'Uniform random queue'

    return next_task, queue_info


def get_next_task(
    user: User,
    prepared_tasks: QuerySet,
    project: Project,
    dm_queue: Union[bool, None],
    assigned_flag: Union[bool, None] = None,
) -> Tuple[Union[Task, None], str]:
    logger.debug(f'get_next_task called. user: {user}, project: {project}, dm_queue: {dm_queue}')

    with conditional_atomic(predicate=db_is_not_sqlite):
        next_task = None
        use_task_lock = True
        queue_info = ''

        not_solved_tasks, user_solved_tasks_array, queue_info, prioritized_low_agreement = get_not_solved_tasks_qs(
            user, project, prepared_tasks, assigned_flag, queue_info
        )

        if not dm_queue:
            next_task, use_task_lock, queue_info = get_next_task_without_dm_queue(
                user, project, not_solved_tasks, assigned_flag, prioritized_low_agreement
            )

        if flag_set('fflag_fix_back_lsdv_4523_show_overlap_first_order_27022023_short'):
            # show tasks with overlap > 1 first
            if not next_task and project.show_overlap_first:
                # don't output anything - just filter tasks with overlap
                logger.debug(f'User={user} tries overlap first from prepared tasks')
                _, tasks_with_overlap = _try_tasks_with_overlap(not_solved_tasks)
                queue_info += 'Show overlap first'
                next_task, queue_info = get_task_from_qs_with_sampling(
                    tasks_with_overlap, user_solved_tasks_array, prepared_tasks, user, project, queue_info
                )

        if not next_task:
            if dm_queue:
                queue_info += (' & ' if queue_info else '') + 'Data manager queue'
                logger.debug(f'User={user} tries sequence sampling from prepared tasks')
                next_task = not_solved_tasks.first()

            else:
                next_task, queue_info = get_task_from_qs_with_sampling(
                    not_solved_tasks, user_solved_tasks_array, prepared_tasks, user, project, queue_info
                )

        next_task, queue_info = postponed_queue(next_task, prepared_tasks, project, user, queue_info)

        next_task, queue_info = skipped_queue(next_task, prepared_tasks, project, user, queue_info)

        if next_task and use_task_lock:
            # set lock for the task with TTL 3x time more then current average lead time (or 1 hour by default)
            next_task.set_lock(user)

        logger.log(
            get_next_task_logging_level(user),
            f'get_next_task finished. next_task: {next_task}, queue_info: {queue_info}',
        )

        # debug for critical overlap issue
        if next_task and flag_set('fflag_fix_back_dev_4185_next_task_additional_logging_long', user):
            try:
                count = next_task.annotations.filter(was_cancelled=False).count()
                task_overlap_reached = count >= next_task.overlap
                global_overlap_reached = count >= project.maximum_annotations
                locks = next_task.locks.count() > project.maximum_annotations - next_task.annotations.count()
                if next_task.is_labeled or task_overlap_reached or global_overlap_reached or locks:
                    from tasks.serializers import TaskSimpleSerializer

                    local = dict(locals())
                    local.pop('prepared_tasks', None)
                    local.pop('user_solved_tasks_array', None)
                    local.pop('not_solved_tasks', None)

                    task = TaskSimpleSerializer(next_task).data
                    task.pop('data', None)
                    task.pop('predictions', None)
                    for i, a in enumerate(task['annotations']):
                        task['annotations'][i] = dict(task['annotations'][i])
                        task['annotations'][i].pop('result', None)

                    project = next_task.project
                    project_data = {
                        'maximum_annotations': project.maximum_annotations,
                        'skip_queue': project.skip_queue,
                        'sampling': project.sampling,
                        'show_ground_truth_first': project.show_ground_truth_first,
                        'show_overlap_first': project.show_overlap_first,
                        'overlap_cohort_percentage': project.overlap_cohort_percentage,
                        'project_id': project.id,
                        'title': project.title,
                    }
                    logger.error(
                        f'DEBUG INFO: get_next_task is_labeled/overlap: '
                        f'LOCALS ==> {local} :: PROJECT ==> {project_data} :: '
                        f'NEXT_TASK ==> {task}'
                    )
            except Exception as e:
                logger.error(f'get_next_task is_labeled/overlap try/except: {str(e)}')
                pass

        add_stream_history(next_task, user, project)
        return next_task, queue_info
