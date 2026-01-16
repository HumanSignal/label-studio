"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0061_annotation_review_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnnotationComment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(help_text='Comment content', verbose_name='comment text')),
                ('is_resolved', models.BooleanField(default=False, help_text='Whether this comment thread is resolved', verbose_name='is resolved')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
                ('annotation', models.ForeignKey(help_text='Annotation this comment belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='tasks.annotation')),
                ('author', models.ForeignKey(help_text='User who created this comment', on_delete=django.db.models.deletion.CASCADE, related_name='annotation_comments', to=settings.AUTH_USER_MODEL)),
                ('parent', models.ForeignKey(blank=True, help_text='Parent comment for threaded discussions', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='tasks.annotationcomment')),
            ],
            options={
                'db_table': 'annotation_comment',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='annotationcomment',
            index=models.Index(fields=['annotation', 'created_at'], name='annotation_annotati_d5fc37_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationcomment',
            index=models.Index(fields=['author'], name='annotation_author_4e1f22_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationcomment',
            index=models.Index(fields=['parent'], name='annotation_parent_8f3a19_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationcomment',
            index=models.Index(fields=['is_resolved'], name='annotation_is_reso_9c2b45_idx'),
        ),
    ]
