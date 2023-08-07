from tasks.models import AnnotationDraft
from tasks.serializers import AnnotationDraftSerializer


class InteractiveMixin:
    def to_representation(self, task):  # type: ignore[no-untyped-def]
        user = self.context.get('user')  # type: ignore[attr-defined]
        drafts = AnnotationDraft.objects.filter(task=task, user=user)
        drafts_ser = AnnotationDraftSerializer(drafts, many=True, default=[], read_only=True).data
        data = super().to_representation(task)  # type: ignore[misc]
        data['drafts'] = drafts_ser
        return data