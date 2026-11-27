"""FIT-1658: Data Manager annotators embed minimal user fields for each annotator."""

from data_manager.serializers import DataManagerTaskSerializer
from django.test import TestCase
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from tasks.tests.factories import AnnotationFactory, TaskFactory


class TestDataManagerTaskSerializerAnnotators(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.project = ProjectFactory(organization=cls.organization)
        cls.annotator = cls.project.created_by
        cls.task = TaskFactory(project=cls.project)
        AnnotationFactory(task=cls.task, completed_by=cls.annotator, result=[])

    def test_get_annotators_returns_user_payload(self):
        self.task.annotators = [self.annotator.id]
        result = DataManagerTaskSerializer(context={}).get_annotators(self.task)

        assert len(result) == 1
        entry = result[0]
        assert isinstance(entry, dict)
        assert entry['user_id'] == self.annotator.id
        assert entry['email'] == self.annotator.email
        assert entry['annotated'] is True
        assert 'username' in entry
        assert 'last_activity' in entry
