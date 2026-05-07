from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from billing.utils import validate_project_creation, validate_task_import
from organizations.models import Organization


class UsageLimitEnforcementTest(SimpleTestCase):
    @override_settings(BILLING_ENFORCE_USAGE_LIMITS=False)
    def test_validate_project_creation_skips_when_enforcement_disabled(self):
        organization = Mock()

        with patch('billing.utils.check_project_limit') as check_project_limit:
            validate_project_creation(organization)

        check_project_limit.assert_not_called()

    @override_settings(BILLING_ENFORCE_USAGE_LIMITS=False)
    def test_validate_task_import_skips_when_enforcement_disabled(self):
        organization = Mock()

        with patch('billing.utils.check_task_limit') as check_task_limit:
            validate_task_import(organization, 25)

        check_task_limit.assert_not_called()

    @override_settings(BILLING_ENFORCE_USAGE_LIMITS=False)
    def test_organization_project_guard_skips_when_enforcement_disabled(self):
        organization = Organization()

        with patch('billing.services.plans.check_org_limits') as check_org_limits:
            organization.check_max_projects()

        check_org_limits.assert_not_called()

    @override_settings(BILLING_ENFORCE_USAGE_LIMITS=False)
    def test_organization_task_guard_skips_when_enforcement_disabled(self):
        organization = Organization()

        with patch('billing.services.plans.check_org_limits') as check_org_limits:
            organization.check_max_tasks(25)

        check_org_limits.assert_not_called()
