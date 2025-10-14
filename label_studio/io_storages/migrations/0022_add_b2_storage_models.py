# Generated manually for Backblaze B2 Cloud Storage integration

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0031_alter_project_show_ground_truth_first'),
        ('tasks', '0057_annotation_proj_result_octlen_idx_async'),
        ('io_storages', '0021_azureblobimportstorage_recursive_scan_and_more'),
    ]

    operations = [
        # Create B2 Import Storage
        migrations.CreateModel(
            name='B2ImportStorage',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                # StorageInfo fields
                ('last_sync', models.DateTimeField(blank=True, help_text='Last sync finished time', null=True, verbose_name='last sync')),
                ('last_sync_count', models.PositiveIntegerField(blank=True, help_text='Count of tasks synced last time', null=True, verbose_name='last sync count')),
                ('last_sync_job', models.CharField(blank=True, help_text='Last sync job ID', max_length=256, null=True, verbose_name='last_sync_job')),
                ('status', models.CharField(choices=[('initialized', 'Initialized'), ('queued', 'Queued'), ('in_progress', 'In progress'), ('failed', 'Failed'), ('completed', 'Completed'), ('completed_with_errors', 'Completed with errors')], default='initialized', max_length=64)),
                ('traceback', models.TextField(blank=True, help_text='Traceback report for the last failed sync', null=True)),
                ('meta', models.JSONField(default=dict, help_text='Meta and debug information about storage processes', null=True, verbose_name='meta')),
                # Storage fields
                ('title', models.CharField(blank=True, help_text='Cloud storage title', max_length=256, null=True, verbose_name='title')),
                ('description', models.TextField(blank=True, help_text='Cloud storage description', null=True, verbose_name='description')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Creation time', verbose_name='created at')),
                ('synchronizable', models.BooleanField(default=True, help_text='If storage can be synced', verbose_name='synchronizable')),
                # B2StorageMixin fields
                ('bucket', models.TextField(blank=True, help_text='B2 bucket name', null=True, verbose_name='bucket')),
                ('prefix', models.TextField(blank=True, help_text='B2 bucket prefix (folder path)', null=True, verbose_name='prefix')),
                ('regex_filter', models.TextField(blank=True, help_text='Cloud storage regex for filtering objects', null=True, verbose_name='regex_filter')),
                ('use_blob_urls', models.BooleanField(default=False, help_text='Interpret objects as BLOBs and generate URLs', verbose_name='use_blob_urls')),
                ('b2_access_key_id', models.TextField(blank=True, help_text='B2 Application Key ID (equivalent to AWS_ACCESS_KEY_ID)', null=True, verbose_name='b2_access_key_id')),
                ('b2_secret_access_key', models.TextField(blank=True, help_text='B2 Application Key (equivalent to AWS_SECRET_ACCESS_KEY)', null=True, verbose_name='b2_secret_access_key')),
                ('b2_endpoint_url', models.TextField(blank=True, help_text='B2 S3-compatible endpoint URL (e.g., https://s3.us-west-004.backblazeb2.com)', null=True, verbose_name='b2_endpoint_url')),
                ('region_name', models.TextField(blank=True, help_text='B2 Region (e.g., us-west-004, us-east-005, eu-central-003)', null=True, verbose_name='region_name')),
                # B2ImportStorageBase fields
                ('presign', models.BooleanField(default=True, help_text='Generate presigned URLs', verbose_name='presign')),
                ('presign_ttl', models.PositiveSmallIntegerField(default=1, help_text='Presigned URLs TTL (in minutes)', verbose_name='presign_ttl')),
                ('recursive_scan', models.BooleanField(default=False, help_text='Perform recursive scan over the bucket content', verbose_name='recursive scan')),
                # ProjectStorageMixin fields
                ('project', models.ForeignKey(help_text='A unique integer value identifying this project.', on_delete=django.db.models.deletion.CASCADE, related_name='io_storages_b2importstorages', to='projects.project')),
            ],
            options={
                'abstract': False,
            },
        ),
        
        # Create B2 Export Storage
        migrations.CreateModel(
            name='B2ExportStorage',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                # StorageInfo fields
                ('last_sync', models.DateTimeField(blank=True, help_text='Last sync finished time', null=True, verbose_name='last sync')),
                ('last_sync_count', models.PositiveIntegerField(blank=True, help_text='Count of tasks synced last time', null=True, verbose_name='last sync count')),
                ('last_sync_job', models.CharField(blank=True, help_text='Last sync job ID', max_length=256, null=True, verbose_name='last_sync_job')),
                ('status', models.CharField(choices=[('initialized', 'Initialized'), ('queued', 'Queued'), ('in_progress', 'In progress'), ('failed', 'Failed'), ('completed', 'Completed'), ('completed_with_errors', 'Completed with errors')], default='initialized', max_length=64)),
                ('traceback', models.TextField(blank=True, help_text='Traceback report for the last failed sync', null=True)),
                ('meta', models.JSONField(default=dict, help_text='Meta and debug information about storage processes', null=True, verbose_name='meta')),
                # Storage fields
                ('title', models.CharField(blank=True, help_text='Cloud storage title', max_length=256, null=True, verbose_name='title')),
                ('description', models.TextField(blank=True, help_text='Cloud storage description', null=True, verbose_name='description')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Creation time', verbose_name='created at')),
                ('synchronizable', models.BooleanField(default=True, help_text='If storage can be synced', verbose_name='synchronizable')),
                # ExportStorage fields
                ('can_delete_objects', models.BooleanField(blank=True, help_text='Deletion from storage enabled', null=True, verbose_name='can_delete_objects')),
                # B2StorageMixin fields
                ('bucket', models.TextField(blank=True, help_text='B2 bucket name', null=True, verbose_name='bucket')),
                ('prefix', models.TextField(blank=True, help_text='B2 bucket prefix (folder path)', null=True, verbose_name='prefix')),
                ('regex_filter', models.TextField(blank=True, help_text='Cloud storage regex for filtering objects', null=True, verbose_name='regex_filter')),
                ('use_blob_urls', models.BooleanField(default=False, help_text='Interpret objects as BLOBs and generate URLs', verbose_name='use_blob_urls')),
                ('b2_access_key_id', models.TextField(blank=True, help_text='B2 Application Key ID (equivalent to AWS_ACCESS_KEY_ID)', null=True, verbose_name='b2_access_key_id')),
                ('b2_secret_access_key', models.TextField(blank=True, help_text='B2 Application Key (equivalent to AWS_SECRET_ACCESS_KEY)', null=True, verbose_name='b2_secret_access_key')),
                ('b2_endpoint_url', models.TextField(blank=True, help_text='B2 S3-compatible endpoint URL (e.g., https://s3.us-west-004.backblazeb2.com)', null=True, verbose_name='b2_endpoint_url')),
                ('region_name', models.TextField(blank=True, help_text='B2 Region (e.g., us-west-004, us-east-005, eu-central-003)', null=True, verbose_name='region_name')),
                # ProjectStorageMixin fields
                ('project', models.ForeignKey(help_text='A unique integer value identifying this project.', on_delete=django.db.models.deletion.CASCADE, related_name='io_storages_b2exportstorages', to='projects.project')),
            ],
            options={
                'abstract': False,
            },
        ),
        
        # Create B2 Import Storage Link
        migrations.CreateModel(
            name='B2ImportStorageLink',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.TextField(help_text='External link key', verbose_name='key')),
                ('object_exists', models.BooleanField(default=True, help_text='Whether object under external link still exists', verbose_name='object exists')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Creation time', verbose_name='created at')),
                ('row_group', models.IntegerField(blank=True, help_text='Parquet row group', null=True)),
                ('row_index', models.IntegerField(blank=True, help_text='Parquet row index, or JSON[L] object index', null=True)),
                ('task', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='io_storages_b2importstoragelink', to='tasks.task')),
                ('storage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='links', to='io_storages.b2importstorage')),
            ],
            options={
                'abstract': False,
            },
        ),
        
        # Create B2 Export Storage Link
        migrations.CreateModel(
            name='B2ExportStorageLink',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_exists', models.BooleanField(default=True, help_text='Whether object under external link still exists', verbose_name='object exists')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Creation time', verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Update time', verbose_name='updated at')),
                ('annotation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='io_storages_b2exportstoragelink', to='tasks.annotation')),
                ('storage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='links', to='io_storages.b2exportstorage')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]

