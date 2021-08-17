from rest_framework import serializers

from projects.models import Project
from tasks.models import Task, Annotation
from core.label_config import replace_task_data_undefined_with_config_field


class OnlyIDWebhookSerializer(serializers.Serializer):
    id = serializers.IntegerField()

    class Meta:
        fields: ('id',)


class ProjectWebhookSerializer(serializers.ModelSerializer):
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
