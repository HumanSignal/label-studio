"""Tests for project members API
This file and its contents are licensed under the Apache License 2.0.
Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from organizations.models import Organization
from projects.models import Project, ProjectMember
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class ProjectMembersAPITestCase(TestCase):
    """Tests for project members API endpoints"""

    def setUp(self):
        self.client = APIClient()
        
        # Create an admin user
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
        
        # Create annotator users
        self.annotator1 = User.objects.create_user(
            username='annotator1', 
            email='annotator1@example.com', 
            password='password123'
        )
        self.annotator1.role = 'annotator'
        self.annotator1.active_organization = self.organization
        self.annotator1.save()
        
        self.annotator2 = User.objects.create_user(
            username='annotator2', 
            email='annotator2@example.com', 
            password='password123'
        )
        self.annotator2.role = 'annotator'
        self.annotator2.active_organization = self.organization
        self.annotator2.save()
        
        # Add users to organization
        self.organization.add_user(self.admin_user)
        self.organization.add_user(self.annotator1)
        self.organization.add_user(self.annotator2)
        
        # Create a test project
        self.project = Project.objects.create(
            title='Test Project',
            created_by=self.admin_user,
            organization=self.organization,
            label_config='<View></View>'
        )

    def test_admin_can_list_project_members(self):
        """Test that admin can list project members"""
        # Add a member to the project
        ProjectMember.objects.create(user=self.annotator1, project=self.project, enabled=True)
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-annotators', kwargs={'pk': self.project.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['user_id'], self.annotator1.id)
        self.assertEqual(response.data[0]['email'], self.annotator1.email)
        self.assertEqual(response.data[0]['role'], 'annotator')

    def test_annotator_can_list_project_members(self):
        """Test that annotator can also list project members (view only)"""
        ProjectMember.objects.create(user=self.annotator1, project=self.project, enabled=True)
        ProjectMember.objects.create(user=self.annotator2, project=self.project, enabled=True)
        
        self.client.force_authenticate(user=self.annotator1)
        url = reverse('projects:api:project-annotators', kwargs={'pk': self.project.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_admin_can_add_member_by_user_id(self):
        """Test that admin can add a member to project by user ID"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-annotators', kwargs={'pk': self.project.id})
        data = {'user_id': self.annotator1.id}
        response = self.client.post(url, data=data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user_id'], self.annotator1.id)
        self.assertEqual(response.data['email'], self.annotator1.email)
        
        # Verify member was actually added
        self.assertTrue(
            ProjectMember.objects.filter(
                user=self.annotator1, 
                project=self.project
            ).exists()
        )

    def test_admin_can_add_member_by_email(self):
        """Test that admin can add a member to project by email"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-annotators', kwargs={'pk': self.project.id})
        data = {'email': self.annotator1.email}
        response = self.client.post(url, data=data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], self.annotator1.email)

    def test_annotator_cannot_add_member(self):
        """Test that annotator cannot add members to project"""
        ProjectMember.objects.create(user=self.annotator1, project=self.project, enabled=True)
        
        self.client.force_authenticate(user=self.annotator1)
        url = reverse('projects:api:project-annotators', kwargs={'pk': self.project.id})
        data = {'user_id': self.annotator2.id}
        response = self.client.post(url, data=data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Admin role required', response.data['detail'])

    def test_adding_existing_member_returns_ok(self):
        """Test that adding an already existing member returns 200 OK"""
        # Add member first time
        ProjectMember.objects.create(user=self.annotator1, project=self.project, enabled=True)
        
        # Try to add same member again
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-annotators', kwargs={'pk': self.project.id})
        data = {'user_id': self.annotator1.id}
        response = self.client.post(url, data=data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('already a member', response.data['message'])

    def test_adding_nonexistent_user_returns_404(self):
        """Test that adding a non-existent user returns 404"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-annotators', kwargs={'pk': self.project.id})
        data = {'user_id': 99999}
        response = self.client.post(url, data=data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'User not found')

    def test_admin_can_remove_member(self):
        """Test that admin can remove a member from project"""
        # Add member first
        ProjectMember.objects.create(user=self.annotator1, project=self.project, enabled=True)
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-annotator-detail', kwargs={
            'pk': self.project.id,
            'user_id': self.annotator1.id
        })
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify member was actually removed
        self.assertFalse(
            ProjectMember.objects.filter(
                user=self.annotator1, 
                project=self.project
            ).exists()
        )

    def test_annotator_cannot_remove_member(self):
        """Test that annotator cannot remove members from project"""
        ProjectMember.objects.create(user=self.annotator1, project=self.project, enabled=True)
        ProjectMember.objects.create(user=self.annotator2, project=self.project, enabled=True)
        
        self.client.force_authenticate(user=self.annotator1)
        url = reverse('projects:api:project-annotator-detail', kwargs={
            'pk': self.project.id,
            'user_id': self.annotator2.id
        })
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Admin role required', response.data['detail'])

    def test_removing_nonexistent_member_returns_404(self):
        """Test that removing a non-existent member returns 404"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-annotator-detail', kwargs={
            'pk': self.project.id,
            'user_id': self.annotator1.id
        })
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'User is not a member of this project')

    def test_list_members_shows_user_details(self):
        """Test that listing members shows complete user details"""
        ProjectMember.objects.create(user=self.annotator1, project=self.project, enabled=True)
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-annotators', kwargs={'pk': self.project.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        member_data = response.data[0]
        
        # Verify all fields are present
        self.assertIn('user_id', member_data)
        self.assertIn('email', member_data)
        self.assertIn('username', member_data)
        self.assertIn('first_name', member_data)
        self.assertIn('last_name', member_data)
        self.assertIn('role', member_data)
        self.assertIn('enabled', member_data)
        self.assertIn('created_at', member_data)
