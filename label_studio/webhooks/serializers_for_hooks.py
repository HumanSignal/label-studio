from core.label_config import replace_task_data_undefined_with_config_field
from projects.models import Project
from rest_framework import serializers
from tasks.models import Annotation, Task


class OnlyIDWebhookSerializer(serializers.Serializer):
    id = serializers.IntegerField()

    class Meta:
        fields: ('id',)


class ProjectWebhookSerializer(serializers.ModelSerializer):

    task_number = serializers.IntegerField(read_only=True)
    finished_task_number = serializers.IntegerField(read_only=True)
    total_predictions_number = serializers.IntegerField(read_only=True)
    total_annotations_number = serializers.IntegerField(read_only=True)
    num_tasks_with_annotations = serializers.IntegerField(read_only=True)
    useful_annotation_number = serializers.IntegerField(read_only=True)
    ground_truth_number = serializers.IntegerField(read_only=True)
    skipped_annotations_number = serializers.IntegerField(read_only=True)

    def to_representation(self, instance):
        instance = Project.objects.with_counts().filter(id=instance.id)[0]
        return super().to_representation(instance)

    class Meta:
        model = Project
        fields = '__all__'


class TaskWebhookSerializer(serializers.ModelSerializer):
    # resolve $undefined$ key in task data, if any
    def to_representation(self, task):
        project = task.project
        data = task.data

        replace_task_data_undefined_with_config_field(data, project)
        return super().to_representation(task)

    class Meta:
        model = Task
        fields = '__all__'


class AnnotationWebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Annotation
        fields = '__all__'
