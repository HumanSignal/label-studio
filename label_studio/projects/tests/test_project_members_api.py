from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from projects.tests.factories import ProjectFactory
from users.tests.factories import UserFactory
from projects.models import ProjectMember

class TestProjectMembersAPI(APITestCase):
    def setUp(self):
        self.project = ProjectFactory()
        self.org = self.project.organization
        self.owner = self.project.created_by
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

        # Organization 멤버 생성 (프로젝트 멤버 아님)
        self.org_member_user = UserFactory(email='org_member@example.com') 
        self.org.add_user(self.org_member_user)
        
        # 이미 프로젝트 멤버인 유저 생성
        self.project_member_user = UserFactory(email='project_member@example.com')
        self.org.add_user(self.project_member_user)
        self.project.add_collaborator(self.project_member_user)

        # 다른 Organization 유저 생성
        self.other_org_user = UserFactory(email='other_org@example.com')
        # 다른 조직 유저는 현재 조직에 추가하지 않음
        
    def test_get_project_members(self):
        """프로젝트 멤버 조회 테스트"""
        url = reverse('projects:api:project-members-list', kwargs={'pk': self.project.pk})
        
        if not self.project.has_collaborator(self.owner):
            self.project.add_collaborator(self.owner)

        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        member_ids = [m['user'] for m in data]

        self.assertIn(self.owner.id, member_ids)
        self.assertIn(self.project_member_user.id, member_ids)
        self.assertNotIn(self.org_member_user.id, member_ids)

    def test_add_project_members_success(self):
        """프로젝트 멤버 추가 성공 테스트"""
        
        # 1. 추가 전 잠재적 멤버(후보) 확인
        potential_url = reverse('projects:api:project-potential-members-list', kwargs={'pk': self.project.pk})
        potential_response = self.client.get(potential_url)
        potential_data = potential_response.json()
        
        print("\n--- [Before Addition] Potential Collaborators ---")
        for user in potential_data:
            print(f"ID: {user['id']}, Email: {user.get('email', 'N/A')}, Name: {user.get('first_name', '')} {user.get('last_name', '')}")
        print("------------------------------------------------")
        
        # 2. 멤버 추가 요청 (format='json' 추가)
        url = reverse('projects:api:project-members-list', kwargs={'pk': self.project.pk})
        data = {'ids': [self.org_member_user.id]}
        
        print(f"\n>>> Adding User ID {self.org_member_user.id} ({self.org_member_user.email}) to Project Members...")
        
        response = self.client.post(url, data, format='json') # 수정된 부분
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 3. 추가 후 결과 확인
        self.assertTrue(self.project.has_collaborator(self.org_member_user))
        
        response_data = response.json()
        print("\n--- [After Addition] Added Members Response ---")
        for member in response_data:
             print(f"Member ID: {member['id']}, User ID: {member['user']}, Role: {member.get('role', 'N/A')}")
        print("-----------------------------------------------")

        added_user_ids = [m['user'] for m in response_data]
        self.assertIn(self.org_member_user.id, added_user_ids)
        
        # 4. 추가 후 잠재적 멤버 목록 재확인 (해당 유저가 사라졌는지)
        potential_response_after = self.client.get(potential_url)
        potential_data_after = potential_response_after.json()
        
        print("\n--- [After Addition] Potential Collaborators (Should exclude added user) ---")
        for user in potential_data_after:
             print(f"ID: {user['id']}, Email: {user.get('email', 'N/A')}")
        print("--------------------------------------------------------------------------")
        
        potential_ids_after = [u['id'] for u in potential_data_after]
        self.assertNotIn(self.org_member_user.id, potential_ids_after)


    def test_add_project_members_invalid_user_id(self):
        """존재하지 않는 유저 ID로 추가 시 실패 테스트"""
        url = reverse('projects:api:project-members-list', kwargs={'pk': self.project.pk})
        data = {'ids': [999999]}
        
        response = self.client.post(url, data, format='json') # 수정된 부분
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_project_members_other_org_user(self):
        """다른 조직의 유저를 추가하려고 할 때 실패 테스트"""
        url = reverse('projects:api:project-members-list', kwargs={'pk': self.project.pk})
        data = {'ids': [self.other_org_user.id]}
        
        response = self.client.post(url, data, format='json') # 수정된 부분
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_potential_collaborators(self):
        """잠재적 멤버(조직에는 속하지만 프로젝트에는 속하지 않은 유저) 조회 테스트"""
        url = reverse('projects:api:project-potential-members-list', kwargs={'pk': self.project.pk})
        
        if not self.project.has_collaborator(self.owner):
            self.project.add_collaborator(self.owner)

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        potential_ids = [u['id'] for u in data]
        
        self.assertIn(self.org_member_user.id, potential_ids)
        self.assertNotIn(self.project_member_user.id, potential_ids)
        self.assertNotIn(self.owner.id, potential_ids)
        self.assertNotIn(self.other_org_user.id, potential_ids)
