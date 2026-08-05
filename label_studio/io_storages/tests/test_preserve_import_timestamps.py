"""Coverage for LABEL_STUDIO_PRESERVE_IMPORT_TIMESTAMPS opt-in behavior in
ImportStorage.add_task. See core/settings/base.py for the setting and
io_storages/base_models.py for the code path.
"""

import json
from datetime import datetime
from datetime import timezone as dt_timezone

import boto3
import pytest
from django.test import override_settings
from django.utils import timezone
from io_storages.models import S3ImportStorage
from moto import mock_s3
from projects.models import Project
from projects.tests.factories import ProjectFactory
from tasks.models import Annotation
from tests.conftest import set_feature_flag_envvar  # noqa: F401

LABEL_CONFIG = """
<View>
  <Text name="text" value="$text"/>
  <Choices name="sentiment" toName="text">
    <Choice value="positive"/>
    <Choice value="negative"/>
  </Choices>
</View>
"""


def _annotation_result() -> list[dict]:
    return [
        {
            'from_name': 'sentiment',
            'to_name': 'text',
            'type': 'choices',
            'value': {'choices': ['positive']},
        }
    ]


TASK_WITH_TIMESTAMPED_ANNOTATION: dict = {
    'data': {'text': 'hello'},
    'annotations': [
        {
            'result': _annotation_result(),
            'created_at': '2024-06-01T12:00:00Z',
            'updated_at': '2024-06-01T12:05:00Z',
        }
    ],
}

TASK_WITHOUT_TIMESTAMPS: dict = {
    'data': {'text': 'hello'},
    'annotations': [{'result': _annotation_result()}],
}


def _sync_via_s3(project: Project, task_json: dict, bucket_name: str = 'pytest-preserve-timestamps') -> None:
    """Push a task JSON to a mocked S3 bucket and sync it into the project."""
    with mock_s3():
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket=bucket_name)
        s3.put_object(Bucket=bucket_name, Key='task.json', Body=json.dumps([task_json]))
        storage = S3ImportStorage(
            project=project,
            bucket=bucket_name,
            aws_access_key_id='example',
            aws_secret_access_key='example',
            use_blob_urls=False,
        )
        storage.save()
        storage.sync()


@pytest.mark.django_db
class TestPreserveImportTimestamps:
    @pytest.fixture
    def project(self):
        return ProjectFactory(label_config=LABEL_CONFIG)

    @override_settings(PRESERVE_IMPORT_TIMESTAMPS=True)
    def test_source_timestamps_preserved_when_enabled(self, project, set_feature_flag_envvar):
        """With the setting on, created_at/updated_at from the source JSON survive the save."""
        _sync_via_s3(project, TASK_WITH_TIMESTAMPED_ANNOTATION)

        ann = Annotation.objects.get(project=project)
        assert ann.created_at == datetime(2024, 6, 1, 12, 0, tzinfo=dt_timezone.utc)
        assert ann.updated_at == datetime(2024, 6, 1, 12, 5, tzinfo=dt_timezone.utc)

    def test_source_timestamps_ignored_by_default(self, project, set_feature_flag_envvar):
        """Default (setting off): auto_now_add / auto_now overwrite the source values
        with the sync time. Confirms we haven't accidentally changed default behavior.
        """
        before = timezone.now()
        _sync_via_s3(project, TASK_WITH_TIMESTAMPED_ANNOTATION)

        ann = Annotation.objects.get(project=project)
        # Source JSON said 2024-06-01; expected now(), not that value.
        assert ann.created_at >= before
        assert ann.updated_at >= before

    @override_settings(PRESERVE_IMPORT_TIMESTAMPS=True)
    def test_missing_source_timestamps_fall_back_to_now(self, project, set_feature_flag_envvar):
        """With the setting on but no timestamps in the source JSON, both fields fall
        back to now() rather than being left NULL by suppress_autotime.
        """
        before = timezone.now()
        _sync_via_s3(project, TASK_WITHOUT_TIMESTAMPS)

        ann = Annotation.objects.get(project=project)
        assert ann.created_at is not None
        assert ann.updated_at is not None
        assert ann.created_at >= before
        assert ann.updated_at >= before
