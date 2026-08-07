from django.db.models import BooleanField, Case, Value, When
from projects.models import Project
from rest_framework import filters
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from users.list_query import UsersListQuerySerializer
from users.project_access import get_user_ids_in_projects


class UsersListPagination(PageNumberPagination):
    """Shared bounded pagination for user option endpoints."""

    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 100


class UserListMixin:
    pagination_class = None
    filter_backends = [SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'username']
    ordering_fields = ['id', 'email', 'first_name', 'last_name', 'username']
    ordering = ['id']
    _LIST_FILTER_QUERY_PARAMS = frozenset({'project', 'column', 'page', 'page_size', 'search', 'selected_value'})

    @property
    def paginator(self):
        if not self.uses_list_filtering():
            return None
        if not hasattr(self, '_paginator') or self._paginator is None:
            self._paginator = UsersListPagination()
        return self._paginator

    def uses_list_filtering(self, request=None):
        request = request or self.request
        return bool(self._LIST_FILTER_QUERY_PARAMS.intersection(request.query_params.keys()))

    def get_list_query_params(self):
        if not hasattr(self, '_list_query_params'):
            serializer = UsersListQuerySerializer(data=self.request.query_params)
            serializer.is_valid(raise_exception=True)
            self._list_query_params = serializer.validated_data
        return self._list_query_params

    def filter_queryset_by_project(self, queryset, project_id):
        organization_id = self.request.user.active_organization_id
        if not Project.objects.filter(pk=project_id, organization_id=organization_id).exists():
            return queryset.none()

        user_ids = get_user_ids_in_projects([project_id], organization_id)
        if not user_ids:
            return queryset.none()

        return queryset.filter(pk__in=user_ids)

    def filter_queryset_by_column(self, queryset, project_id, column):
        from data_manager.filter_users import filter_user_queryset

        return filter_user_queryset(
            queryset,
            project_id=project_id,
            column=column,
        )

    def filter_queryset_after_scope(self, queryset, project_id=None):
        """Hook after project/column scoping; LSE applies firewall role collapse here."""
        return queryset

    def filter_queryset(self, queryset):
        if getattr(self, 'action', None) != 'list':
            return super().filter_queryset(queryset)

        if not self.uses_list_filtering():
            return queryset

        queryset = super().filter_queryset(queryset)
        params = self.get_list_query_params()

        project_id = params.get('project')
        if project_id is not None:
            queryset = self.filter_queryset_by_project(queryset, project_id)

        column = params.get('column')
        if column is not None:
            if project_id is None:
                raise ValidationError({'project': 'This parameter is required when column is set.'})
            queryset = self.filter_queryset_by_column(queryset, project_id, column)

        # Membership → column → firewall aggregation (FIT-2282). Collapse must not
        # run inside filter_queryset_by_project or column scoping can drop the
        # Min(user_id) representative for a still-eligible role.
        queryset = self.filter_queryset_after_scope(queryset, project_id)

        selected_user_ids = params.get('selected_value') or []
        if selected_user_ids:
            queryset = queryset.annotate(
                selected=Case(
                    When(pk__in=selected_user_ids, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField(),
                )
            ).order_by('-selected', 'id')

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, 'action', None) == 'list' and self.uses_list_filtering():
            params = self.get_list_query_params()
            project_id = params.get('project')
            organization_id = self.request.user.active_organization_id
            if project_id is not None:
                context['project'] = Project.objects.filter(
                    pk=project_id,
                    organization_id=organization_id,
                ).first()
        return context

    def list(self, request, *args, **kwargs):
        if self.uses_list_filtering(request):
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
