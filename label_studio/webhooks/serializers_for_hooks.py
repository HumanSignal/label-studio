from rest_framework import serializers

from projects.models import Project
from tasks.models import Task, Annotation
from core.label_config import replace_task_data_undefined_with_config_field


class OnlyIDWebhookSerializer(serializers.Serializer):  # type: ignore[type-arg]
    id = serializers.IntegerField()

    class Meta:
        fields: ('id',)  # type: ignore[syntax]


class ProjectWebhookSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]

    task_number = serializers.IntegerField(read_only=True)
    finished_task_number = serializers.IntegerField(read_only=True)
    total_predictions_number = serializers.IntegerField(read_only=True)
    total_annotations_number = serializers.IntegerField(read_only=True)
    num_tasks_with_annotations = serializers.IntegerField(read_only=True)
    useful_annotation_number = serializers.IntegerField(read_only=True)
    ground_truth_number = serializers.IntegerField(read_only=True)
    skipped_annotations_number = serializers.IntegerField(read_only=True)

    def to_representation(self, instance):  # type: ignore[no-untyped-def]
        instance = Project.objects.with_counts().filter(id=instance.id)[0]  # type: ignore[no-untyped-call]
        return super().to_representation(instance)

    class Meta:
        model = Project
        fields = '__all__'


class TaskWebhookSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    # resolve $undefined$ key in task data, if any
    def to_representation(self, task):  # type: ignore[no-untyped-def]
        project = task.project
        data = task.data

        replace_task_data_undefined_with_config_field(data, project)  # type: ignore[no-untyped-call]
        return super().to_representation(task)

    class Meta:
        model = Task
        fields = '__all__'


class AnnotationWebhookSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    class Meta:
        model = Annotation
        fields = '__all__'
