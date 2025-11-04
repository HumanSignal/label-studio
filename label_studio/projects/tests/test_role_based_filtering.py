"""Tests for role-based project filtering
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


class ProjectRoleBasedFilteringTestCase(TestCase):
    """Tests for filtering projects based on user role"""

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
        
        # Create two annotator users
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
        
        # Create three projects
        self.project1 = Project.objects.create(
            title='Project 1',
            created_by=self.admin_user,
            organization=self.organization,
            label_config='<View></View>'
        )
        
        self.project2 = Project.objects.create(
            title='Project 2',
            created_by=self.admin_user,
            organization=self.organization,
            label_config='<View></View>'
        )
        
        self.project3 = Project.objects.create(
            title='Project 3',
            created_by=self.admin_user,
            organization=self.organization,
            label_config='<View></View>'
        )
        
        # Assign annotator1 to project1 and project2
        ProjectMember.objects.create(user=self.annotator1, project=self.project1, enabled=True)
        ProjectMember.objects.create(user=self.annotator1, project=self.project2, enabled=True)
        
        # Assign annotator2 to project2 only
        ProjectMember.objects.create(user=self.annotator2, project=self.project2, enabled=True)

    def test_admin_can_see_all_projects(self):
        """Test that admin users can see all projects in their organization"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Admin should see all 3 projects
        self.assertEqual(len(response.data['results']), 3)
        project_ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.project1.id, project_ids)
        self.assertIn(self.project2.id, project_ids)
        self.assertIn(self.project3.id, project_ids)

    def test_annotator1_can_only_see_assigned_projects(self):
        """Test that annotator1 can only see projects they're assigned to"""
        self.client.force_authenticate(user=self.annotator1)
        url = reverse('projects:api:project-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Annotator1 should only see project1 and project2
        self.assertEqual(len(response.data['results']), 2)
        project_ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.project1.id, project_ids)
        self.assertIn(self.project2.id, project_ids)
        self.assertNotIn(self.project3.id, project_ids)

    def test_annotator2_can_only_see_assigned_projects(self):
        """Test that annotator2 can only see projects they're assigned to"""
        self.client.force_authenticate(user=self.annotator2)
        url = reverse('projects:api:project-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Annotator2 should only see project2
        self.assertEqual(len(response.data['results']), 1)
        project_ids = [p['id'] for p in response.data['results']]
        self.assertNotIn(self.project1.id, project_ids)
        self.assertIn(self.project2.id, project_ids)
        self.assertNotIn(self.project3.id, project_ids)

    def test_annotator_with_no_projects_sees_empty_list(self):
        """Test that annotator with no assigned projects sees empty list"""
        # Create a new annotator without project assignments
        annotator3 = User.objects.create_user(
            username='annotator3', 
            email='annotator3@example.com', 
            password='password123'
        )
        annotator3.role = 'annotator'
        annotator3.active_organization = self.organization
        annotator3.save()
        self.organization.add_user(annotator3)
        
        self.client.force_authenticate(user=annotator3)
        url = reverse('projects:api:project-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Annotator3 should see no projects
        self.assertEqual(len(response.data['results']), 0)

    def test_annotator_cannot_access_unassigned_project_detail(self):
        """Test that annotator cannot access detail view of unassigned project"""
        self.client.force_authenticate(user=self.annotator1)
        # Try to access project3 (not assigned to annotator1)
        url = reverse('projects:api:project-detail', kwargs={'pk': self.project3.id})
        response = self.client.get(url)
        
        # Should return 404 as the project is filtered out
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_annotator_can_access_assigned_project_detail(self):
        """Test that annotator can access detail view of assigned project"""
        self.client.force_authenticate(user=self.annotator1)
        # Try to access project1 (assigned to annotator1)
        url = reverse('projects:api:project-detail', kwargs={'pk': self.project1.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.project1.id)

    def test_admin_can_access_any_project_detail(self):
        """Test that admin can access detail view of any project"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('projects:api:project-detail', kwargs={'pk': self.project3.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.project3.id)

    def test_disabled_project_member_cannot_see_project(self):
        """Test that annotator with disabled membership cannot see project"""
        # Disable annotator1's membership in project1
        membership = ProjectMember.objects.get(user=self.annotator1, project=self.project1)
        membership.enabled = False
        membership.save()
        
        self.client.force_authenticate(user=self.annotator1)
        url = reverse('projects:api:project-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Annotator1 should only see project2 now
        self.assertEqual(len(response.data['results']), 1)
        project_ids = [p['id'] for p in response.data['results']]
        self.assertNotIn(self.project1.id, project_ids)
        self.assertIn(self.project2.id, project_ids)

    def test_project_counts_api_filtered_by_role(self):
        """Test that project counts API also respects role-based filtering"""
        self.client.force_authenticate(user=self.annotator1)
        url = reverse('projects:api:project-counts-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Annotator1 should only see counts for project1 and project2
        self.assertEqual(len(response.data['results']), 2)
        project_ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.project1.id, project_ids)
        self.assertIn(self.project2.id, project_ids)
        self.assertNotIn(self.project3.id, project_ids)
