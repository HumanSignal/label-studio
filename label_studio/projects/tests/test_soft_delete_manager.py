import types

import projects.models as project_models
import pytest
from django.db import connection
from projects.models import Project

from label_studio.core.utils import db as db_utils
from label_studio.core.utils.db import has_column_cached
from label_studio.organizations.tests.factories import OrganizationFactory
from label_studio.projects.tests.factories import ProjectFactory

pytestmark = pytest.mark.django_db


def test_project_manager_filters_deleted():
    """Project manager hides deleted rows by default; unfiltered manager returns all.

    Purpose: Verify default manager excludes soft-deleted rows and all_objects returns them.
    Setup: Create two projects in one org; mark one as deleted.
    Actions: Query via Project.objects and Project.all_objects.
    Validations: Visible list excludes deleted; unfiltered includes both.
    Edge cases: N/A.
    """
    org = OrganizationFactory()
    p1 = ProjectFactory(organization=org, title='active')
    _ = ProjectFactory(organization=org, title='deleted', deleted_at=p1.created_at)

    visible = list(Project.objects.order_by('id').values_list('title', flat=True))
    all_rows = list(Project.all_objects.order_by('id').values_list('title', flat=True))

    assert 'active' in visible and 'deleted' not in visible
    assert set(all_rows) >= {'active', 'deleted'}


def test_project_manager_for_user_respects_filter():
    """for_user applies org scope and soft-delete filter.

    Purpose: Ensure for_user(user) scopes to user's active org and hides deleted rows.
    Setup: Two orgs; three projects (active+deleted in org1, active in org2).
    Actions: Call Project.objects.for_user(user) for org1 user.
    Validations: Only org1 active project is returned.
    Edge cases: N/A.
    """
    org1 = OrganizationFactory()
    org2 = OrganizationFactory()
    user = org1.created_by
    user.active_organization = org1
    user.save(update_fields=['active_organization'])

    p1 = ProjectFactory(organization=org1, title='org1-active')
    _ = ProjectFactory(organization=org1, title='org1-deleted', deleted_at=p1.created_at)
    _ = ProjectFactory(organization=org2, title='org2-active')

    titles = set(Project.objects.for_user(user).values_list('title', flat=True))
    assert 'org1-active' in titles
    assert 'org1-deleted' not in titles
    assert 'org2-active' not in titles


def test_visible_manager_skips_filter_without_column(monkeypatch):
    """Manager should not reference missing deleted_at during early migrations.

    Purpose: Avoid schema errors before column exists.
    Setup: Force has_column_cached to return False; create active+deleted rows.
    Actions: Query via Project.objects.
    Validations: Both rows are returned (no filter applied).
    Edge cases: N/A.
    """
    monkeypatch.setattr(project_models, 'has_column_cached', lambda *_: False, raising=True)

    org = OrganizationFactory()
    p1 = ProjectFactory(organization=org, title='active')
    _ = ProjectFactory(organization=org, title='deleted', deleted_at=p1.created_at)

    # Without column, the filter is skipped, so both come back
    titles = set(Project.objects.values_list('title', flat=True))
    assert {'active', 'deleted'} <= titles


def test_has_column_cached_memoization_and_clear(monkeypatch):
    """Column presence check is memoized and reset by post_migrate.

    Purpose: Ensure only one introspection call until cache clear.
    Setup: Stub get_table_description to count calls.
    Actions: Call has_column_cached twice, then clear cache, call again.
    Validations: One call before, second after clear.
    Edge cases: N/A.
    """
    # Ensure cache starts empty so first call triggers introspection
    db_utils.signal_clear_column_presence_cache()

    calls = {'count': 0}

    def fake_get_table_description(cursor, table):
        calls['count'] += 1
        # Return objects that mimic description entries with .name attribute
        col = types.SimpleNamespace(name='deleted_at')
        return [col]

    monkeypatch.setattr(connection.introspection, 'get_table_description', fake_get_table_description)

    # First call hits DB introspection
    assert has_column_cached('project', 'deleted_at') is True
    # Second call should be cached
    assert has_column_cached('project', 'deleted_at') is True
    assert calls['count'] == 1

    # Clear cache directly (instead of sending the signal with app_config)
    db_utils.signal_clear_column_presence_cache()

    # After cache clear, another introspection happens
    assert has_column_cached('project', 'deleted_at') is True
    assert calls['count'] == 2
