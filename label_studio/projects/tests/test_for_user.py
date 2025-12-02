from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import models

from organizations.models import Organization
from projects.models import Project

# 테스트하려는 로직을 가진 커스텀 매니저를 정의합니다.
class ProjectContributorManager(models.Manager):
    """'contributor' 필드를 기준으로 프로젝트를 필터링하는 매니저"""
    def for_user(self, user):
        return self.get_queryset().filter(contributor=user)

class ForUserContributorTest(TestCase):
    """
    ProjectManager.for_user가 contributor 기준으로 필터링할 때의 동작을 테스트합니다.
    """

    @classmethod
    def setUpTestData(cls):
        """
        테스트에 필요한 기본 데이터를 설정합니다.
        이 메서드는 테스트 클래스 시작 시 한 번만 실행됩니다.
        """
        # 테스트 중에만 사용할 커스텀 매니저를 Project 모델에 추가합니다.
        # 이렇게 하면 기존의 Project.objects 매니저에 영향을 주지 않습니다.
        cls.manager = ProjectContributorManager()
        Project.add_to_class('for_user_test_objects', cls.manager)

        # 1. 테스트용 조직과 사용자 생성
        cls.organization = Organization.objects.create(title='Test Org for ForUser')
        User = get_user_model()
        cls.user1 = User.objects.create_user(username='tester1', email='tester1@test.com', password='password')
        cls.user2 = User.objects.create_user(username='tester2', email='tester2@test.com', password='password')
        cls.user3 = User.objects.create_user(username='tester3', email='tester3@test.com', password='password')

        # 2. 테스트용 프로젝트 생성
        cls.project1 = Project.objects.create(title='Project A', created_by=cls.user1, organization=cls.organization)
        cls.project2 = Project.objects.create(title='Project B', created_by=cls.user1, organization=cls.organization)
        cls.project3 = Project.objects.create(title='Project C', created_by=cls.user2, organization=cls.organization)

        # 3. 프로젝트에 기여자(contributor) 할당
        # Project A에는 user1만 참여
        cls.project1.add_collaborator(cls.user1)

        # Project B에는 user1과 user2가 모두 참여
        cls.project2.add_collaborator(cls.user1)
        cls.project2.add_collaborator(cls.user2)

        # Project C에는 user2만 참여
        cls.project3.add_collaborator(cls.user2)
        # user3는 아무 프로젝트에도 참여하지 않음

    def test_for_user_finds_projects_for_user1(self):
        """user1으로 필터링 시, user1이 참여하는 모든 프로젝트(A, B)가 반환되어야 합니다."""
        projects_for_user1 = Project.for_user_test_objects.for_user(self.user1)

        self.assertEqual(projects_for_user1.count(), 2, "user1은 2개의 프로젝트에 참여해야 합니다.")
        self.assertIn(self.project1, projects_for_user1, "Project A가 결과에 포함되어야 합니다.")
        self.assertIn(self.project2, projects_for_user1, "Project B가 결과에 포함되어야 합니다.")
        # 더 엄격한 확인을 위해 집합(set)으로 비교
        self.assertSetEqual(set(projects_for_user1), {self.project1, self.project2})

    def test_for_user_finds_projects_for_user2(self):
        """user2로 필터링 시, user2가 참여하는 모든 프로젝트(B, C)가 반환되어야 합니다."""
        projects_for_user2 = Project.for_user_test_objects.for_user(self.user2)

        self.assertEqual(projects_for_user2.count(), 2, "user2는 2개의 프로젝트에 참여해야 합니다.")
        self.assertIn(self.project2, projects_for_user2, "Project B가 결과에 포함되어야 합니다.")
        self.assertIn(self.project3, projects_for_user2, "Project C가 결과에 포함되어야 합니다.")
        self.assertSetEqual(set(projects_for_user2), {self.project2, self.project3})

    def test_for_user_returns_empty_for_user3(self):
        """user3로 필터링 시, 아무 프로젝트에도 참여하지 않으므로 빈 쿼리셋이 반환되어야 합니다."""
        projects_for_user3 = Project.for_user_test_objects.for_user(self.user3)

        self.assertEqual(projects_for_user3.count(), 0, "user3는 참여하는 프로젝트가 없어야 합니다.")
        self.assertFalse(projects_for_user3.exists(), "결과는 비어있어야 합니다.")

    @classmethod
    def tearDownClass(cls):
        """테스트 클래스가 끝난 후, 모델에 추가했던 커스텀 매니저를 삭제하여 다른 테스트에 영향을 주지 않도록 합니다."""
        delattr(Project, 'for_user_test_objects')
        super().tearDownClass()
