from django.utils.decorators import method_decorator
from data_export.v1.api import ExportListAPI


class ExportListAPIV2(ExportListAPI):
    def filter_queryset(self, queryset):
        queryset = super(ExportListAPI, self).filter_queryset(queryset)

        return queryset.order_by('-created_at')[:10]
