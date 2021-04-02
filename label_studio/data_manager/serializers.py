"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json

from rest_framework import serializers
from django.db import transaction

from data_manager.models import View, Filter, FilterGroup
from tasks.models import Task
from tasks.serializers import TaskWithAnnotationsAndLazyPredictionsSerializer
from django.db.models import Avg


class FilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filter
        fields = "__all__"


class FilterGroupSerializer(serializers.ModelSerializer):
    filters = FilterSerializer(many=True)

    class Meta:
        model = FilterGroup
        fields = "__all__"


class ViewSerializer(serializers.ModelSerializer):
    filter_group = FilterGroupSerializer(required=False)

    class Meta:
        model = View
        fields = "__all__"

    def to_internal_value(self, data):
        """
        map old filters structure to models
        "filters": {  ===> FilterGroup model
            "conjunction": "or",
            "items":[  ===> "filters" in FilterGroup
                 {  ==> Filter model
                   "filter":"filter:tasks:data.image", ==> column
                    "operator":"contains",
                    "type":"Image",
                    "value": <string: "XXX" | int: 123 | dict | list>
                 },
                  {
                    "filter":"filter:tasks:data.image",
                    "operator":"equal",
                    "type":"Image",
                    "value": <string: "XXX" | int: 123 | dict | list>
                 }
              ]
           }
        }
        """
        _data = data.get("data", {})

        filters = _data.pop("filters", {})
        conjunction = filters.get("conjunction")
        if "filter_group" not in data and conjunction:
            data["filter_group"] = {"conjunction": conjunction, "filters": []}
            if "items" in filters:
                for f in filters["items"]:
                    data["filter_group"]["filters"].append(
                        {
                            "column": f.get("filter", ""),
                            "operator": f.get("operator", ""),
                            "type": f.get("type", ""),
                            "value": f.get("value", {}),
                        }
                    )

        ordering = _data.pop("ordering", {})
        data["ordering"] = ordering

        return super().to_internal_value(data)

    def to_representation(self, instance):
        result = super().to_representation(instance)
        filters = result.pop("filter_group", {})
        if filters:
            filters["items"] = []
            filters.pop("filters", [])
            filters.pop("id", None)

            for f in instance.filter_group.filters.order_by("index"):
                filters["items"].append(
                    {
                        "filter": f.column,
                        "operator": f.operator,
                        "type": f.type,
                        "value": f.value,
                    }
                )
            result["data"]["filters"] = filters

        selected_items = result.pop("selected_items", {})
        if selected_items:
            result["data"]["selectedItems"] = selected_items

        ordering = result.pop("ordering", {})
        if ordering:
            result["data"]["ordering"] = ordering
        return result

    @staticmethod
    def _create_filters(filter_group, filters_data):
        filter_index = 0
        for filter_data in filters_data:
            filter_data["index"] = filter_index
            filter_group.filters.add(Filter.objects.create(**filter_data))
            filter_index += 1

    def create(self, validated_data):
        with transaction.atomic():
            filter_group_data = validated_data.pop("filter_group", None)
            if filter_group_data:
                filters_data = filter_group_data.pop("filters", [])
                filter_group = FilterGroup.objects.create(**filter_group_data)

                self._create_filters(filter_group=filter_group, filters_data=filters_data)

                validated_data["filter_group_id"] = filter_group.id
            view = View.objects.create(**validated_data)

            return view

    def update(self, instance, validated_data):
        with transaction.atomic():
            filter_group_data = validated_data.pop("filter_group", None)
            if filter_group_data:
                filters_data = filter_group_data.pop("filters", [])

                filter_group = instance.filter_group
                if filter_group is None:
                    filter_group = FilterGroup.objects.create(**filter_group_data)

                conjunction = filter_group_data.get("conjunction")
                if conjunction and filter_group.conjunction != conjunction:
                    filter_group.conjunction = conjunction
                    filter_group.save()

                filter_group.filters.clear()
                self._create_filters(filter_group=filter_group, filters_data=filters_data)

            ordering = validated_data.pop("ordering", None)
            if ordering and ordering != instance.ordering:
                instance.ordering = ordering
                instance.save()

            if validated_data["data"] != instance.data:
                instance.data = validated_data["data"]
                instance.save()

            return instance


class TaskSerializer(TaskWithAnnotationsAndLazyPredictionsSerializer):
    cancelled_annotations = serializers.SerializerMethodField()
    completed_at = serializers.SerializerMethodField()
    annotations_results = serializers.SerializerMethodField()
    predictions_results = serializers.SerializerMethodField()
    predictions_score = serializers.SerializerMethodField()
    total_annotations = serializers.SerializerMethodField()
    total_predictions = serializers.SerializerMethodField()
    file_upload = serializers.ReadOnlyField(source='file_upload_name')
    annotators = serializers.SerializerMethodField()

    class Meta:
        model = Task
        ref_name = 'data_manager_task_serializer'

        fields = [
            "cancelled_annotations",
            "completed_at",
            "created_at",
            "annotations_results",
            "data",
            "id",
            "predictions_results",
            "predictions_score",
            "total_annotations",
            "total_predictions",
            "annotations",
            "predictions",
            "file_upload",
            "annotators",
            "project"
        ]

    @staticmethod
    def get_cancelled_annotations(obj):
        return obj.annotations.filter(was_cancelled=True).count()

    @staticmethod
    def get_completed_at(obj):
        annotations = obj.annotations.all()
        if annotations:
            return max(c.created_at for c in annotations)
        return None

    @staticmethod
    def get_annotations_results(obj):
        annotations = obj.annotations.all()
        if annotations:
            return json.dumps([item.result for item in annotations])
        else:
            return ""

    @staticmethod
    def get_predictions_results(obj):
        predictions = obj.predictions.all()
        if predictions:
            return json.dumps([item.result for item in predictions])
        else:
            return ""

    @staticmethod
    def get_predictions_score(obj):
        predictions = obj.predictions.all()
        if predictions:
            values = [item.score for item in predictions if isinstance(item.score, (float, int))]
            if values:
                return sum(values) / float(len(values))
        return None

    @staticmethod
    def get_total_predictions(obj):
        return obj.predictions.count()

    @staticmethod
    def get_total_annotations(obj):
        return obj.annotations.filter(was_cancelled=False).count()

    @staticmethod
    def get_annotators(obj):
        result = obj.annotations.values_list('completed_by', flat=True).distinct()
        result = [r for r in result if r is not None]
        return result


class SelectedItemsSerializer(serializers.Serializer):
    all = serializers.BooleanField()
    included = serializers.ListField(child=serializers.IntegerField(), required=False)
    excluded = serializers.ListField(child=serializers.IntegerField(), required=False)

    def validate(self, data):
        if data["all"] is True and data.get("included"):
            raise serializers.ValidationError("included not allowed with all==true")
        if data["all"] is False and data.get("excluded"):
            raise serializers.ValidationError("excluded not allowed with all==false")

        view = self.context.get("view")
        request = self.context.get("request")
        if view and request and request.method in ("PATCH", "DELETE"):
            all_value = view.selected_items.get("all")
            if all_value and all_value != data["all"]:
                raise serializers.ValidationError("changing all value possible only with POST method")

        return data
