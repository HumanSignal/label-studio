import factory
from fsm.state_choices import AnnotationStateChoices, ProjectStateChoices, TaskStateChoices
from fsm.state_models import AnnotationState, ProjectState, TaskState
from projects.tests.factories import ProjectFactory
from tasks.tests.factories import AnnotationFactory, TaskFactory


class ProjectStateFactory(factory.django.DjangoModelFactory):
    project = factory.SubFactory(ProjectFactory)
    state = factory.Iterator(ProjectStateChoices.values)
    created_by_id = factory.SelfAttribute('project.created_by_id')
    organization_id = factory.SelfAttribute('project.organization_id')

    class Meta:
        model = ProjectState


class TaskStateFactory(factory.django.DjangoModelFactory):
    task = factory.SubFactory(TaskFactory)
    state = factory.Iterator(TaskStateChoices.values)
    project_id = factory.SelfAttribute('task.project_id')
    organization_id = factory.SelfAttribute('task.project.organization_id')

    class Meta:
        model = TaskState


class AnnotationStateFactory(factory.django.DjangoModelFactory):
    annotation = factory.SubFactory(AnnotationFactory)
    state = factory.Iterator(AnnotationStateChoices.values)
    task_id = factory.SelfAttribute('annotation.task_id')
    project_id = factory.SelfAttribute('annotation.task.project_id')
    completed_by_id = factory.SelfAttribute('annotation.completed_by_id')
    organization_id = factory.SelfAttribute('annotation.task.project.organization_id')

    class Meta:
        model = AnnotationState
