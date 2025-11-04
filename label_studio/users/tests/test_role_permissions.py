"""Tests for role-based access control
This file and its contents are licensed under the Apache License 2.0.
Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from organizations.models import Organization
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class RoleBasedAccessControlTestCase(TestCase):
    """Tests for role-based access control (Admin/Annotator)"""

    def setUp(self):
        self.client = APIClient()
        
        # Create an organization
        self.admin_user = User.objects.create_user(
            username='admin', 
            email='admin@example.com', 
            password='password123'
        )
        self.admin_user.role = 'admin'
        self.admin_user.save()
        
        self.organization = Organization.objects.create(
            title='Test Organization',
            created_by=self.admin_user
        )
        self.admin_user.active_organization = self.organization
        self.admin_user.save()
        
        # Create an annotator user
        self.annotator_user = User.objects.create_user(
            username='annotator', 
            email='annotator@example.com', 
            password='password123'
        )
        self.annotator_user.role = 'annotator'
        self.annotator_user.active_organization = self.organization
        self.annotator_user.save()
        
        # Add users to organization
        self.organization.add_user(self.admin_user)
        self.organization.add_user(self.annotator_user)

    def test_admin_can_create_project(self):
        """Test that admin users can create projects"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-list')
        data = {
            'title': 'Test Project',
            'label_config': '<View></View>'
        }
        response = self.client.post(url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 1)

    def test_annotator_cannot_create_project(self):
        """Test that annotator users cannot create projects"""
        self.client.force_authenticate(user=self.annotator_user)
        url = reverse('projects:api:project-list')
        data = {
            'title': 'Test Project',
            'label_config': '<View></View>'
        }
        response = self.client.post(url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Admin role required', response.data['detail'])
        self.assertEqual(Project.objects.count(), 0)

    def test_admin_can_delete_project(self):
        """Test that admin users can delete projects"""
        # Create a project first
        project = Project.objects.create(
            title='Test Project',
            created_by=self.admin_user,
            organization=self.organization
        )
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-detail', kwargs={'pk': project.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify project is deleted
        with self.assertRaises(Project.DoesNotExist):
            Project.objects.get(pk=project.id)

    def test_annotator_cannot_delete_project(self):
        """Test that annotator users cannot delete projects"""
        # Create a project first
        project = Project.objects.create(
            title='Test Project',
            created_by=self.admin_user,
            organization=self.organization
        )
        
        self.client.force_authenticate(user=self.annotator_user)
        url = reverse('projects:api:project-detail', kwargs={'pk': project.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Admin role required', response.data['detail'])
        
        # Verify project still exists
        self.assertTrue(Project.objects.filter(pk=project.id).exists())

    def test_admin_can_update_project_config(self):
        """Test that admin users can update project configuration"""
        project = Project.objects.create(
            title='Test Project',
            created_by=self.admin_user,
            organization=self.organization,
            label_config='<View></View>'
        )
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-detail', kwargs={'pk': project.id})
        data = {
            'label_config': '<View><Text name="text" value="$text"/></View>'
        }
        response = self.client.patch(url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_annotator_cannot_update_project_config(self):
        """Test that annotator users cannot update project configuration"""
        project = Project.objects.create(
            title='Test Project',
            created_by=self.admin_user,
            organization=self.organization,
            label_config='<View></View>'
        )
        
        self.client.force_authenticate(user=self.annotator_user)
        url = reverse('projects:api:project-detail', kwargs={'pk': project.id})
        data = {
            'label_config': '<View><Text name="text" value="$text"/></View>'
        }
        response = self.client.patch(url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Admin role required', response.data['detail'])

    def test_admin_can_create_user(self):
        """Test that admin users can create new users"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'password123'
        }
        response = self.client.post(url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_annotator_cannot_create_user(self):
        """Test that annotator users cannot create new users"""
        self.client.force_authenticate(user=self.annotator_user)
        url = reverse('user-list')
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'password123'
        }
        response = self.client.post(url, data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Admin role required', response.data['detail'])

    def test_admin_can_delete_user(self):
        """Test that admin users can delete users"""
        # Create a user to delete
        user_to_delete = User.objects.create_user(
            username='todelete',
            email='todelete@example.com',
            password='password123'
        )
        user_to_delete.active_organization = self.organization
        user_to_delete.save()
        self.organization.add_user(user_to_delete)
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-detail', kwargs={'pk': user_to_delete.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_annotator_cannot_delete_user(self):
        """Test that annotator users cannot delete users"""
        # Create a user to attempt deletion
        user_to_delete = User.objects.create_user(
            username='todelete',
            email='todelete@example.com',
            password='password123'
        )
        user_to_delete.active_organization = self.organization
        user_to_delete.save()
        self.organization.add_user(user_to_delete)
        
        self.client.force_authenticate(user=self.annotator_user)
        url = reverse('user-detail', kwargs={'pk': user_to_delete.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Admin role required', response.data['detail'])
        
        # Verify user still exists
        self.assertTrue(User.objects.filter(pk=user_to_delete.id).exists())

    def test_whoami_includes_role(self):
        """Test that the whoami endpoint includes the user's role"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('current-user-whoami')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'admin')
        
        # Test with annotator
        self.client.force_authenticate(user=self.annotator_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'annotator')

    def test_default_role_is_annotator(self):
        """Test that new users have the default role of 'annotator'"""
        new_user = User.objects.create_user(
            username='newuser',
            email='newuser@example.com',
            password='password123'
        )
        self.assertEqual(new_user.role, 'annotator')

    def test_unauthenticated_user_cannot_access_admin_endpoints(self):
        """Test that unauthenticated users cannot access admin-only endpoints"""
        # Try to create a project without authentication
        url = reverse('projects:api:project-list')
        data = {
            'title': 'Test Project',
            'label_config': '<View></View>'
        }
        response = self.client.post(url, data=data, format='json')
        # Should be 401 Unauthorized or 403 Forbidden depending on DRF settings
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
