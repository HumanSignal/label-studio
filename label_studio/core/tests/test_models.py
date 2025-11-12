import json

from core.models import DeletedRow
from django.core import serializers
from django.test import TestCase
from organizations.models import Organization
from organizations.tests.factories import OrganizationFactory
from projects.models import Project
from projects.tests.factories import ProjectFactory
from tasks.models import Task
from tasks.tests.factories import TaskFactory


class TestDeletedRow(TestCase):
    def _assert_delete_and_restore_equal(self, drow, original):
        original_dict = original.__dict__.copy()
        original_id = original.id
        original_dict.pop('_state')
        original_created_at = original_dict.pop('created_at')
        original_updated_at = original_dict.pop('updated_at')
        # Pop _original_values - this is an internal FSM field that's recreated on __init__
        # and shouldn't be compared
        original_dict.pop('_original_values', None)
        original.delete()

        for deserialized_object in serializers.deserialize('json', json.dumps([drow.data])):
            deserialized_object.save()
        new_object = original.__class__.objects.get(id=original_id)

        new_dict = new_object.__dict__.copy()
        new_dict.pop('_state')
        new_created_at = new_dict.pop('created_at')
        new_updated_at = new_dict.pop('updated_at')
        # Pop _original_values - this is an internal FSM field that's recreated on __init__
        # and shouldn't be compared
        new_dict.pop('_original_values', None)

        assert new_dict == original_dict
        # Datetime loses microsecond precision, so we can't compare them directly
        assert abs((new_created_at - original_created_at).total_seconds()) < 0.001
        assert abs((new_updated_at - original_updated_at).total_seconds()) < 0.001

    def test_serialize_organization(self):
        organization = OrganizationFactory()
        drow = DeletedRow.serialize_and_create(organization, reason='reason', organization_id=organization.id)
        assert drow.row_id == organization.id
        assert drow.model == 'organizations.organization'
        assert drow.data['fields']['title'] == organization.title
        assert drow.data['fields']['token'] == organization.token
        assert drow.data['fields']['created_by'] == organization.created_by_id
        assert drow.reason == 'reason'
        assert drow.organization_id == organization.id
        assert drow.project_id is None
        assert drow.user_id is None
        self._assert_delete_and_restore_equal(drow, organization)

    def test_serialize_project(self):
        project = ProjectFactory()
        drow = DeletedRow.serialize_and_create(
            project, reason='reason', organization_id=project.organization.id, project_id=project.id
        )
        assert drow.row_id == project.id
        assert drow.model == 'projects.project'
        assert drow.data['fields']['title'] == project.title
        assert drow.data['fields']['organization'] == project.organization.id
        assert drow.reason == 'reason'
        assert drow.organization_id == project.organization.id
        assert drow.project_id == project.id
        self._assert_delete_and_restore_equal(drow, project)

    def test_serialize_task(self):
        organization = OrganizationFactory()
        project = ProjectFactory(organization=organization)
        task = TaskFactory(project=project)
        drow = DeletedRow.serialize_and_create(
            task,
            reason='reason',
            organization_id=organization.id,
            project_id=project.id,
            user_id=organization.created_by_id,
        )
        assert drow.row_id == task.id
        assert drow.model == 'tasks.task'
        assert drow.data['fields']['project'] == project.id
        assert drow.reason == 'reason'
        assert drow.organization_id == organization.id
        assert drow.project_id == project.id
        assert drow.user_id == organization.created_by_id
        self._assert_delete_and_restore_equal(drow, task)

    def test_bulk_serialize_and_create(self):
        organization_1 = OrganizationFactory()
        organization_2 = OrganizationFactory()
        drows = DeletedRow.bulk_serialize_and_create(Organization.objects.all(), reason='reason')
        assert len(drows) == 2
        assert drows[0].model == 'organizations.organization'
        assert drows[0].row_id == organization_1.id
        assert drows[0].data['fields']['title'] == organization_1.title
        assert drows[0].data['fields']['token'] == organization_1.token
        assert drows[0].data['fields']['created_by'] == organization_1.created_by_id
        assert drows[0].reason == 'reason'
        assert drows[1].model == 'organizations.organization'
        assert drows[1].row_id == organization_2.id
        assert drows[1].data['fields']['title'] == organization_2.title
        assert drows[1].data['fields']['token'] == organization_2.token
        assert drows[1].data['fields']['created_by'] == organization_2.created_by_id
        assert drows[1].reason == 'reason'

        project_1 = ProjectFactory(organization=organization_1)
        project_2 = ProjectFactory(organization=organization_1)
        drows = DeletedRow.bulk_serialize_and_create(
            Project.objects.all(), reason='reason', organization_id=organization_1.id
        )
        assert len(drows) == 2
        assert drows[0].model == 'projects.project'
        assert drows[0].row_id == project_1.id
        assert drows[0].data['fields']['title'] == project_1.title
        assert drows[0].data['fields']['organization'] == organization_1.id
        assert drows[0].reason == 'reason'
        assert drows[0].organization_id == organization_1.id
        assert drows[1].model == 'projects.project'
        assert drows[1].row_id == project_2.id
        assert drows[1].data['fields']['title'] == project_2.title
        assert drows[1].data['fields']['organization'] == organization_1.id
        assert drows[1].reason == 'reason'
        assert drows[1].organization_id == organization_1.id

        task_1 = TaskFactory(project=project_1)
        task_2 = TaskFactory(project=project_1)
        drows = DeletedRow.bulk_serialize_and_create(
            Task.objects.all(), reason='reason', organization_id=organization_1.id, project_id=project_1.id
        )
        assert len(drows) == 2
        assert drows[0].model == 'tasks.task'
        assert drows[0].row_id == task_1.id
        assert drows[0].data['fields']['project'] == project_1.id
        assert drows[0].reason == 'reason'
        assert drows[0].organization_id == organization_1.id
        assert drows[0].project_id == project_1.id
        assert drows[1].model == 'tasks.task'
        assert drows[1].row_id == task_2.id
        assert drows[1].data['fields']['project'] == project_1.id
        assert drows[1].reason == 'reason'
        assert drows[1].organization_id == organization_1.id
        assert drows[1].project_id == project_1.id
