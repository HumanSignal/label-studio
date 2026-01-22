from datetime import timedelta

import factory
from core.utils.common import load_func
from django.conf import settings
from django.utils import timezone
from faker import Faker
from tasks.models import Annotation, AnnotationDraft, Prediction, Task, TaskLock


class TaskFactory(factory.django.DjangoModelFactory):
    data = factory.LazyFunction(
        lambda: {
            'text': Faker().sentence(),
        }
    )
    project = factory.SubFactory(load_func(settings.PROJECT_FACTORY))
    overlap = factory.LazyAttribute(lambda obj: obj.project.maximum_annotations if obj.project else 1)

    class Meta:
        model = Task


class AnnotationFactory(factory.django.DjangoModelFactory):
    task = factory.SubFactory(TaskFactory)
    project = factory.SelfAttribute('task.project')
    completed_by = factory.SubFactory(load_func(settings.USER_FACTORY))

    class Meta:
        model = Annotation

    @classmethod
    def create_hypertextlabels(cls, **kwargs):
        return cls.create(
            result=[
                {
                    'value': {
                        'htmllabels': ['Strong negative'],
                        'start': 1,
                        'end': 10,
                        'startOffset': '/text()[1]',
                        'endOffset': '/text()[2]',
                        'text': 'Test example phrase',
                    },
                    'id': 'wMmVN7k_47',
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'hypertextlabels',
                }
            ],
            **kwargs,
        )


class AnnotationDraftFactory(factory.django.DjangoModelFactory):
    task = factory.SubFactory(TaskFactory)
    user = factory.SubFactory(load_func(settings.USER_FACTORY))
    result = [
        {
            'value': {'choices': ['neg']},
            'id': 'wMmVN7k_47',
            'from_name': 'sentiment',
            'to_name': 'text',
            'type': 'choices',
        }
    ]

    class Meta:
        model = AnnotationDraft


class PredictionFactory(factory.django.DjangoModelFactory):
    task = factory.SubFactory(TaskFactory)
    project = factory.SelfAttribute('task.project')
    result = [{}]

    class Meta:
        model = Prediction


class TaskLockFactory(factory.django.DjangoModelFactory):
    task = factory.SubFactory(TaskFactory)
    user = factory.SubFactory(load_func(settings.USER_FACTORY))
    expire_at = factory.LazyFunction(lambda: timezone.now() + timedelta(seconds=10))

    class Meta:
        model = TaskLock
