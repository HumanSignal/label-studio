from django.utils.functional import cached_property


class UserMixin:
    @property
    def is_annotator(self):
        return False

    def has_permission(self, user):
        if user.active_organization in self.organizations.all():
            return True
        return False


class UserRelatedManagerMixin:
    @cached_property
    def get_all_field_names(self):
        return [field.name for field in self.model._meta.fields]

    def get_queryset(self):
        qs = super().get_queryset()
        if 'is_deleted' in self.get_all_field_names:
            qs = qs.filter(is_deleted=False)
        else:
            qs = qs.filter(user__is_deleted=False)
        return qs

    def with_deleted(self):
        return super().get_queryset()
