import io
import os

import psutil
import pytest
from data_export.serializers import ExportDataSerializer
from django.conf import settings
from tasks.functions import export_project

pytestmark = pytest.mark.django_db


def memory_limit(max_mem):
    try:
        import resource
    except ImportError:

        def decorator(f):
            return f

        return decorator

    def decorator(f):
        def wrapper(*args, **kwargs):
            process = psutil.Process(os.getpid())
            prev_limits = resource.getrlimit(resource.RLIMIT_AS)
            resource.setrlimit(resource.RLIMIT_AS, (process.memory_info().rss + max_mem, -1))
            result = f(*args, **kwargs)
            resource.setrlimit(resource.RLIMIT_AS, prev_limits)
            return result

        return wrapper

    return decorator


class TestExportProject:
    @pytest.fixture
    def generate_export_file(self, mocker):
        return mocker.patch(
            'tasks.functions.DataExport.generate_export_file',
            return_value=(io.BytesIO(b'stream'), 'application/json', 'project.json'),
        )

    @pytest.fixture
    def project(self, configured_project):
        return configured_project

    def test_export_project(self, mocker, generate_export_file, project):
        data = ExportDataSerializer(
            project.tasks.all(),
            many=True,
            context={'interpolate_key_frames': settings.INTERPOLATE_KEY_FRAMES},
        ).data

        with mocker.patch('builtins.open'):
            filepath = export_project(project.id, 'JSON', settings.EXPORT_DIR)

        assert filepath == os.path.join(settings.EXPORT_DIR, 'project.json')

        generate_export_file.assert_called_once_with(project, data, 'JSON', settings.CONVERTER_DOWNLOAD_RESOURCES, {})

    def test_project_does_not_exist(self, mocker, generate_export_file):
        with mocker.patch('builtins.open'):
            with pytest.raises(Exception):
                export_project(1, 'JSON', settings.EXPORT_DIR)

        generate_export_file.assert_not_called()
