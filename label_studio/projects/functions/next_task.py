from collections import Counter
import logging

from django.db.models import BooleanField, Case, Count, Exists, Max, OuterRef, Value, When, Q
from django.db.models.fields import DecimalField
from django.conf import settings
import numpy as np

from core.utils.common import conditional_atomic
from tasks.models import Annotation, Task

logger = logging.getLogger(__name__)


def _get_random_unlocked(task_query, user, upper_limit=None):
    # get random task from task query, ignoring locked tasks
    n = task_query.count()
    if n > 0:
        upper_limit = upper_limit or n
        random_indices = np.random.permutation(upper_limit)
        task_query_only = task_query.only('overlap', 'id')

        for i in random_indices:
            try:
                task = task_query_only[int(i)]
            except IndexError as exc:
                logger.error(
                    f'Task query out of range for {int(i)}, count={task_query_only.count()}. ' f'Reason: {exc}',
                    exc_info=True,
                )
            except Exception as exc:
                logger.error(exc, exc_info=True)
            else:
                try:
                    task = Task.objects.select_for_update(skip_locked=True).get(pk=task.id)
                    if not task.has_lock(user):
                        return task
                except Task.DoesNotExist:
                    logger.debug('Task with id {} locked'.format(task.id))


def _get_first_unlocked(tasks_query, user):
    # Skip tasks that are locked due to being taken by collaborators
    for task_id in tasks_query.values_list('id', flat=True):
        try:
            task = Task.objects.select_for_update(skip_locked=True).get(pk=task_id)
            if not task.has_lock(user):
                return task
        except Task.DoesNotExist:
            logger.debug('Task with id {} locked'.format(task_id))


def _try_ground_truth(tasks, project, user):
    """Returns task from ground truth set"""
    ground_truth = Annotation.objects.filter(task=OuterRef('pk'), ground_truth=True)
    not_solved_tasks_with_ground_truths = tasks.annotate(has_ground_truths=Exists(ground_truth)).filter(
        has_ground_truths=True
    )
    if not_solved_tasks_with_ground_truths.exists():
        if project.sampling == project.SEQUENCE:
            return _get_first_unlocked(not_solved_tasks_with_ground_truths, user)
        return _get_random_unlocked(not_solved_tasks_with_ground_truths, user)


def _try_tasks_with_overlap(tasks):
    """Filter out tasks without overlap (doesn't return next task)"""
    tasks_with_overlap = tasks.filter(overlap__gt=1)
    if tasks_with_overlap.exists():
        return None, tasks_with_overlap
    else:
        return None, tasks.filter(overlap=1)


def _try_breadth_first(tasks, user):
    """Try to find tasks with maximum amount of annotations, since we are trying to label tasks as fast as possible
    """

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


def _try_uncertainty_sampling(tasks, project, user_solved_tasks_array, user, prepared_tasks):
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


def get_not_solved_tasks_qs(user, project, prepared_tasks, assigned_flag, queue_info):
    user_solved_tasks_array = user.annotations.filter(task__project=project, task__isnull=False)

    if project.skip_queue == project.SkipQueue.REQUEUE_FOR_ME:
        user_solved_tasks_array = user_solved_tasks_array.filter(was_cancelled=False)
        queue_info += ' Requeued for me from skipped tasks '

    user_solved_tasks_array = user_solved_tasks_array.distinct().values_list('task__pk', flat=True)
    not_solved_tasks = prepared_tasks.exclude(pk__in=user_solved_tasks_array)

    # if annotator is assigned for tasks, he must to solve it regardless of is_labeled=True
    if not assigned_flag:
        not_solved_tasks = not_solved_tasks.filter(is_labeled=False)

    # show tasks with overlap > 1 first
    if project.show_overlap_first:
        # don't output anything - just filter tasks with overlap
        logger.debug(f'User={user} tries overlap first from prepared tasks')
        _, not_solved_tasks = _try_tasks_with_overlap(not_solved_tasks)
        queue_info += 'Show overlap first'

    if project.skip_queue == project.SkipQueue.REQUEUE_FOR_ME:
        # Ordering works different for sqlite and postgresql, details: https://code.djangoproject.com/ticket/19726
        if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
            not_solved_tasks = not_solved_tasks.order_by('annotations__was_cancelled', 'updated_at')
        else:
            not_solved_tasks = not_solved_tasks.order_by('-annotations__was_cancelled', 'updated_at')

    return not_solved_tasks, user_solved_tasks_array, queue_info


def get_next_task_without_dm_queue(user, project, not_solved_tasks, assigned_flag):
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

    if not next_task and project.show_ground_truth_first:
        logger.debug(f'User={user} tries ground truth from prepared tasks')
        next_task = _try_ground_truth(not_solved_tasks, project, user)
        queue_info += (' & ' if queue_info else '') + 'Ground truth queue'

    if not next_task and project.maximum_annotations > 1:
        # if there any tasks in progress (with maximum number of annotations), randomly sampling from them
        logger.debug(f'User={user} tries depth first from prepared tasks')
        next_task = _try_breadth_first(not_solved_tasks, user)
        if next_task:
            queue_info += (' & ' if queue_info else '') + 'Breadth first queue'

    return next_task, use_task_lock, queue_info


def get_next_task(user, prepared_tasks, project, dm_queue, assigned_flag=None):
    logger.debug(f'get_next_task called. user: {user}, project: {project}, dm_queue: {dm_queue}')

    with conditional_atomic():
        next_task = None
        use_task_lock = True
        queue_info = ''

        not_solved_tasks, user_solved_tasks_array, queue_info = get_not_solved_tasks_qs(
            user, project, prepared_tasks, assigned_flag, queue_info
        )

        if not dm_queue:
            next_task, use_task_lock, queue_info = get_next_task_without_dm_queue(
                user, project, not_solved_tasks, assigned_flag
            )

        if not next_task:
            if dm_queue:
                queue_info += (' & ' if queue_info else '') + 'Data manager queue'
                logger.debug(f'User={user} tries sequence sampling from prepared tasks')
                next_task = not_solved_tasks.first()

            elif project.sampling == project.SEQUENCE:
                queue_info += (' & ' if queue_info else '') + 'Sequence queue'
                logger.debug(f'User={user} tries sequence sampling from prepared tasks')
                next_task = _get_first_unlocked(not_solved_tasks, user)

            elif project.sampling == project.UNCERTAINTY:
                queue_info += (' & ' if queue_info else '') + 'Active learning or random queue'
                logger.debug(f'User={user} tries uncertainty sampling from prepared tasks')
                next_task = _try_uncertainty_sampling(
                    not_solved_tasks, project, user_solved_tasks_array, user, prepared_tasks
                )

            elif project.sampling == project.UNIFORM:
                queue_info += (' & ' if queue_info else '') + 'Uniform random queue'
                logger.debug(f'User={user} tries random sampling from prepared tasks')
                next_task = _get_random_unlocked(not_solved_tasks, user)

        if next_task and use_task_lock:
            # set lock for the task with TTL 3x time more then current average lead time (or 1 hour by default)
            next_task.set_lock(user)

        logger.debug(f'get_next_task finished. next_task: {next_task}, queue_info: {queue_info}')
        return next_task, queue_info

