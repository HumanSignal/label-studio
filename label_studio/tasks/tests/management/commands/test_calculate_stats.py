from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from tasks.management.commands.calculate_stats import Command


@patch('tasks.management.commands.calculate_stats.start_job_async_or_sync')
@patch('tasks.management.commands.calculate_stats.Project.objects.filter')
def test_calculate_stats_stamps_each_project_organization(mock_filter, mock_start):
    """Each stats job must carry the iterated project's stable tenant tuple."""
    tasks = MagicMock()
    project = SimpleNamespace(id=456, organization_id=123, tasks=tasks)
    mock_filter.return_value = [project]

    Command().handle(organization=123)

    mock_filter.assert_called_once_with(organization_id=123)
    mock_start.assert_called_once()
    assert mock_start.call_args.kwargs['job_tenant'] == 123
