"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from types import SimpleNamespace
from unittest.mock import patch

from core.permissions import ViewClassPermission, all_permissions
from django.urls import reverse
from ml.models import MLBackend
from ml_model_providers.models import ModelProviderConnection
from projects.tests.access_setup import make_access_world
from rest_framework import generics, serializers
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate
from tasks.tests.factories import TaskFactory

ML_PASSWORD = 'ml-basic-password-secret'
STORAGE_PASSWORD = 'storage-password-secret'
PROVIDER_SECRET = 'provider-secret-key'


class _ProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelProviderConnection
        fields = ('id', 'api_key')


class _ProviderConnectionView(generics.RetrieveUpdateAPIView):
    queryset = ModelProviderConnection.objects.all()
    serializer_class = _ProviderSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.model_provider_connection_view,
        PATCH=all_permissions.model_provider_connection_change,
    )


class MLAccessTests(APITestCase):
    def _backend(self, project):
        return MLBackend.objects.create(
            project=project,
            url='http://ml.example/backend',
            title='backend',
            is_interactive=True,
            basic_auth_pass=ML_PASSWORD,
        )

    def test_member_cannot_read_ml_backend(self):
        world = make_access_world()
        backend = self._backend(world.project_1)
        self.client.force_authenticate(world.member_a)
        with patch('ml.models.MLBackend.update_state', return_value=None) as update_state:
            listed = self.client.get(reverse('ml:api:ml-list') + f'?project={world.project_1.id}')
            detail = self.client.get(reverse('ml:api:ml-detail', kwargs={'pk': backend.id}))
            hidden = self.client.get(reverse('ml:api:ml-list') + f'?project={world.project_2.id}')
        self.assertEqual(listed.status_code, 403, listed.content)
        self.assertEqual(detail.status_code, 403, detail.content)
        self.assertEqual(hidden.status_code, 404, hidden.content)
        for response in (listed, detail, hidden):
            self.assertNotIn(ML_PASSWORD, response.content.decode())
        update_state.assert_not_called()

    def test_member_can_discover_interactive_backends_without_management_metadata(self):
        """Annotation setup must discover interactive IDs without exposing connection settings."""
        world = make_access_world()
        backend = self._backend(world.project_1)
        backend.extra_params = {'api_key': PROVIDER_SECRET}
        backend.save(update_fields=['extra_params'])
        MLBackend.objects.create(project=world.project_1, url='http://batch.example', is_interactive=False)
        self._backend(world.project_2)
        self.client.force_authenticate(world.member_a)

        with patch('projects.models.Project.update_ml_backends_state') as update_state:
            response = self.client.get('/api/ml/interactive-backends', {'project': world.project_1.id})

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), [{'id': backend.id, 'is_interactive': True}])
        update_state.assert_not_called()

    def test_interactive_backend_discovery_hides_inaccessible_projects_and_revoked_grants(self):
        """Safe metadata still requires a current project grant before returning any IDs."""
        world = make_access_world()
        self._backend(world.project_1)
        self.client.force_authenticate(world.member_a)
        hidden = self.client.get('/api/ml/interactive-backends', {'project': world.project_2.id})
        self.assertEqual(hidden.status_code, 404, hidden.content)

        world.project_1.members.filter(user=world.member_a).update(enabled=False)
        revoked = self.client.get('/api/ml/interactive-backends', {'project': world.project_1.id})
        self.assertEqual(revoked.status_code, 404, revoked.content)

    def test_manager_interactive_backend_discovery_supports_empty_projects(self):
        """Projects without interactive models initialize normally for managers too."""
        world = make_access_world()
        MLBackend.objects.create(project=world.project_1, url='http://batch.example', is_interactive=False)
        self.client.force_authenticate(world.creator)
        response = self.client.get('/api/ml/interactive-backends', {'project': world.project_1.id})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), [])

    def test_member_train_and_test_do_not_call_the_backend(self):
        world = make_access_world()
        backend = self._backend(world.project_1)
        TaskFactory(project=world.project_1)
        self.client.force_authenticate(world.member_a)
        with (
            patch('ml.models.MLBackend.train') as train,
            patch('ml.models.MLBackend._predict', return_value={'status': 200, 'data': {}}) as predict,
        ):
            trained = self.client.post(reverse('ml:api:ml-train', kwargs={'pk': backend.id}))
            tested = self.client.post(reverse('ml:api:ml-predict-test', kwargs={'pk': backend.id}) + '?random=true')
        self.assertEqual(trained.status_code, 403, trained.content)
        self.assertEqual(tested.status_code, 403, tested.content)
        self.assertNotIn(ML_PASSWORD, trained.content.decode())
        self.assertNotIn(ML_PASSWORD, tested.content.decode())
        train.assert_not_called()
        predict.assert_not_called()

    def test_update_cannot_move_ml_backend_to_another_project(self):
        world = make_access_world()
        backend = self._backend(world.project_1)
        self.client.force_authenticate(world.creator)
        with (
            patch('ml.models.MLBackend.update_state', return_value=None),
            patch('ml.models.MLBackend.healthcheck_', return_value=SimpleNamespace(is_error=False)),
            patch('ml.models.MLBackend.setup_', return_value=SimpleNamespace(is_error=False, response={})),
        ):
            response = self.client.patch(
                reverse('ml:api:ml-detail', kwargs={'pk': backend.id}),
                {'project': world.project_2.id, 'url': backend.url},
                format='json',
            )
        self.assertEqual(response.status_code, 400, response.content)
        backend.refresh_from_db()
        self.assertEqual(backend.project_id, world.project_1.id)
        self.assertNotIn(ML_PASSWORD, response.content.decode())

    def test_member_interactive_prediction_omits_storage_password(self):
        world = make_access_world()
        world.project_1.task_data_password = STORAGE_PASSWORD
        world.project_1.save(update_fields=['task_data_password'])
        backend = self._backend(world.project_1)
        task = TaskFactory(project=world.project_1)
        self.client.force_authenticate(world.member_a)
        with patch(
            'ml.models.MLBackend.interactive_annotating',
            return_value={'data': {'result': []}},
        ):
            response = self.client.post(
                reverse('ml:api:ml-interactive-annotating', kwargs={'pk': backend.id}),
                {'task': task.id, 'context': {}},
                format='json',
            )
        self.assertEqual(response.status_code, 200, response.content)
        body = response.content.decode()
        self.assertNotIn(STORAGE_PASSWORD, body)
        self.assertNotIn(ML_PASSWORD, body)

    def test_only_owner_can_read_and_write_model_provider_connection(self):
        world = make_access_world()
        connection = ModelProviderConnection.objects.create(
            organization=world.organization,
            created_by=world.owner,
            api_key=PROVIDER_SECRET,
        )
        factory = APIRequestFactory()
        view = _ProviderConnectionView.as_view()

        creator_read = factory.get(f'/model-provider-connections/{connection.id}')
        force_authenticate(creator_read, world.creator)
        creator_response = view(creator_read, pk=connection.id)
        creator_response.render()
        self.assertEqual(creator_response.status_code, 403, creator_response.content)
        self.assertNotIn(PROVIDER_SECRET, creator_response.content.decode())

        creator_write = factory.patch(
            f'/model-provider-connections/{connection.id}',
            {'api_key': 'creator-replaced-key'},
            format='json',
        )
        force_authenticate(creator_write, world.creator)
        creator_update = view(creator_write, pk=connection.id)
        creator_update.render()
        self.assertEqual(creator_update.status_code, 403, creator_update.content)
        connection.refresh_from_db()
        self.assertEqual(connection.api_key, PROVIDER_SECRET)

        owner_read = factory.get(f'/model-provider-connections/{connection.id}')
        force_authenticate(owner_read, world.owner)
        owner_response = view(owner_read, pk=connection.id)
        owner_response.render()
        self.assertEqual(owner_response.status_code, 200, owner_response.content)

        owner_write = factory.patch(
            f'/model-provider-connections/{connection.id}',
            {'api_key': 'owner-replaced-key'},
            format='json',
        )
        force_authenticate(owner_write, world.owner)
        owner_update = view(owner_write, pk=connection.id)
        owner_update.render()
        self.assertEqual(owner_update.status_code, 200, owner_update.content)
        connection.refresh_from_db()
        self.assertEqual(connection.api_key, 'owner-replaced-key')
