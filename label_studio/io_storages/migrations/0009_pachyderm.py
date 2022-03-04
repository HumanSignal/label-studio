from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('io_storages', '0003_localfilesimportstorage'),
        ('io_storages', '0007_auto_20210928_1252'),
        ('io_storages', '0008_auto_20211129_1132'),
    ]

    operations = [
        migrations.CreateModel(
            name='PachydermMixin',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('repository', models.TextField(blank=True, help_text='Repository', null=True, verbose_name='repository')),
                ('regex_filter', models.TextField(blank=True, help_text='Regex for filtering objects', null=True,
                                                  verbose_name='regex_filter')),
                # ('use_blob_urls',
                #  models.BooleanField(default=False, help_text='Interpret objects as BLOBs and generate URLs',
                #                      verbose_name='use_blob_urls')),
            ],
        ),
        migrations.CreateModel(
            name='PachydermExportStorage',
            fields=[
                ('pachydermmixin_ptr',
                 models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True,
                                      primary_key=True, serialize=False, to='io_storages.pachydermmixin')),
                ('title',
                 models.CharField(help_text='Cloud storage title', max_length=256, null=True, verbose_name='title')),
                ('description', models.TextField(blank=True, help_text='Cloud storage description', null=True,
                                                 verbose_name='description')),
                ('created_at',
                 models.DateTimeField(auto_now_add=True, help_text='Creation time', verbose_name='created at')),
                ('last_sync', models.DateTimeField(blank=True, help_text='Last sync finished time', null=True,
                                                   verbose_name='last sync')),
                ('last_sync_count',
                 models.PositiveIntegerField(blank=True, help_text='Count of tasks synced last time', null=True,
                                             verbose_name='last sync count')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                              related_name='io_storages_pachydermexportstorages',
                                              to='projects.project')),
            ],
            options={
                'abstract': False,
            },
            bases=('io_storages.pachydermmixin', models.Model),
        ),
        migrations.CreateModel(
            name='PachydermImportStorage',
            fields=[
                ('pachydermmixin_ptr',
                 models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True,
                                      primary_key=True, serialize=False, to='io_storages.pachydermmixin')),
                ('title',
                 models.CharField(help_text='Cloud storage title', max_length=256, null=True, verbose_name='title')),
                ('description', models.TextField(blank=True, help_text='Cloud storage description', null=True,
                                                 verbose_name='description')),
                ('created_at',
                 models.DateTimeField(auto_now_add=True, help_text='Creation time', verbose_name='created at')),
                ('last_sync', models.DateTimeField(blank=True, help_text='Last sync finished time', null=True,
                                                   verbose_name='last sync')),
                ('last_sync_count',
                 models.PositiveIntegerField(blank=True, help_text='Count of tasks synced last time', null=True,
                                             verbose_name='last sync count')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                              related_name='io_storages_pachydermimportstorages',
                                              to='projects.project')),
            ],
            options={
                'abstract': False,
            },
            bases=('io_storages.pachydermmixin', models.Model),
        ),
        migrations.CreateModel(
            name='PachydermImportStorageLink',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.TextField(help_text='External link key', verbose_name='key')),
                ('object_exists',
                 models.BooleanField(default=True, help_text='Whether object under external link still exists',
                                     verbose_name='object exists')),
                ('created_at',
                 models.DateTimeField(auto_now_add=True, help_text='Creation time', verbose_name='created at')),
                ('task', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,
                                              related_name='io_storages_pachydermimportstoragelink', to='tasks.task')),
                ('storage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='links',
                                              to='io_storages.pachydermimportstorage')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PachydermExportStorageLink',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_exists',
                 models.BooleanField(default=True, help_text='Whether object under external link still exists',
                                     verbose_name='object exists')),
                ('created_at',
                 models.DateTimeField(auto_now_add=True, help_text='Creation time', verbose_name='created at')),
                ('annotation', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,
                                                    related_name='io_storages_pachydermexportstoragelink',
                                                    to='tasks.annotation')),
                ('storage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='links',
                                              to='io_storages.pachydermexportstorage')),
            ],
            options={
                'abstract': False,
            },
        ),

        migrations.AddField(
            model_name='pachydermexportstorage',
            name='can_delete_objects',
            field=models.BooleanField(blank=True, help_text='Deletion from storage enabled', null=True,
                                      verbose_name='can_delete_objects'),
        ),

        migrations.AlterField(
            model_name='pachydermexportstorage',
            name='project',
            field=models.ForeignKey(help_text='A unique integer value identifying this project.',
                                    on_delete=django.db.models.deletion.CASCADE,
                                    related_name='io_storages_pachydermexportstorages', to='projects.project'),
        ),
        migrations.AlterField(
            model_name='pachydermimportstorage',
            name='project',
            field=models.ForeignKey(help_text='A unique integer value identifying this project.',
                                    on_delete=django.db.models.deletion.CASCADE,
                                    related_name='io_storages_pachydermimportstorages', to='projects.project'),
        ),
    ]
