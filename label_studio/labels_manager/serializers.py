from django.conf import settings
from django.db import transaction
from projects.action_permissions import ensure_project_manage
from projects.models import Project
from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import serializers
from rest_framework.exceptions import NotFound, ValidationError

from .models import Label, LabelLink


class ManageableProjectField(serializers.PrimaryKeyRelatedField):
    """A project the requester may manage; used wherever a label write names a project.

    Responsibility: resolve the project id from the body and run
    ``ensure_project_manage``. A project that does not exist or that the user
    cannot open is ``NotFound`` (404), so a hidden project is not revealed. A
    visible project the user cannot manage is ``PermissionDenied`` (403).

    Boundary: does not validate label content. Needs ``request`` in the
    serializer context.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault('queryset', Project.objects.all())
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        try:
            project = super().to_internal_value(data)
        except ValidationError as exc:
            if 'does_not_exist' in exc.get_codes():
                raise NotFound() from exc
            raise
        ensure_project_manage(self.context['request'].user, project)
        return project


class LabelListSerializer(serializers.ListSerializer):
    def validate(self, items):
        if len(set(item['project'] for item in items)) > 1:
            raise ValidationError('Creating labels for different projects in one request not allowed')
        return items

    def create(self, validated_data):
        """Bulk creation objects of Label model with related LabelLink
        reusing already existing labels
        """
        from webhooks.utils import emit_webhooks_for_instance

        with transaction.atomic():
            # loading already existing labels
            titles = [item['title'] for item in validated_data]
            existing_labels = Label.objects.filter(
                organization=self.context['request'].user.active_organization, title__in=titles
            ).all()
            existing_labels_map = {label.title: label for label in existing_labels}

            # create objects for labels, that we need to create
            labels_data = []
            labels = []
            labels_create = []
            for item in validated_data:
                project = item.pop('project')
                from_name = item.pop('from_name')
                if item['title'] in existing_labels_map:
                    label = existing_labels_map[item['title']]
                else:
                    label = Label(**item)
                    labels_create.append(label)
                labels.append(label)
                labels_data.append(dict(project=project, from_name=from_name))

            if labels_create:
                if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
                    created_labels = {}
                    for label in labels_create:
                        label.save()
                        created_labels[label.title] = label
                else:
                    created_labels = {label.title: label for label in Label.objects.bulk_create(labels_create)}

            # connect existing and created labels to project with LabelLink
            links = []
            result = []
            for index, label in enumerate(labels):
                if label.id is None:
                    label = created_labels[label.title]
                label.project = labels_data[index]['project']
                label.from_name = labels_data[index]['from_name']
                result.append(label)
                links.append(
                    LabelLink(
                        **{
                            'label': label,
                            'project': labels_data[index]['project'],
                            'from_name': labels_data[index]['from_name'],
                        }
                    )
                )

            links = LabelLink.objects.bulk_create(links, ignore_conflicts=True)
            # webhooks processing
            # bulk_create with ignore_conflicts doesn't return ids, reloading links
            project = labels[0].project
            label_ids = [label.id for label in result]
            links = LabelLink.objects.filter(label_id__in=label_ids, project=project).all()
            if links:
                emit_webhooks_for_instance(
                    self.context['request'].user.active_organization, links[0].project, 'LABEL_LINK_CREATED', links
                )

        return result


class LabelCreateSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(required=False, read_only=True)
    organization = serializers.PrimaryKeyRelatedField(required=False, read_only=True)
    project = ManageableProjectField()
    from_name = serializers.CharField()

    class Meta:
        model = Label
        list_serializer_class = LabelListSerializer
        fields = '__all__'


class LabelLinkSerializer(FlexFieldsModelSerializer):
    annotations_count = serializers.IntegerField(read_only=True)
    project = ManageableProjectField()

    class Meta:
        model = LabelLink
        fields = '__all__'
        expandable_fields = {'label': ('labels_manager.serializers.LabelSerializer', {'omit': ['links', 'projects']})}


class LabelSerializer(FlexFieldsModelSerializer):
    links = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Label
        fields = '__all__'
        expandable_fields = {'links': ('labels_manager.serializers.LabelLinkSerializer', {'many': True})}


class LabelBulkUpdateSerializer(serializers.Serializer):
    project = ManageableProjectField(required=False, default=None)
    old_label = serializers.JSONField()
    new_label = serializers.JSONField()


class LabelBulkUpdateResponseSerializer(serializers.Serializer):
    annotations_updated = serializers.IntegerField()
