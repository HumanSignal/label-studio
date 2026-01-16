# Generated migration for annotation review and approval fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0060_add_allow_skip_to_task'),
    ]

    operations = [
        migrations.AddField(
            model_name='annotation',
            name='review_status',
            field=models.CharField(
                blank=True,
                choices=[
                    ('pending', 'Pending Review'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('fixed', 'Fixed'),
                ],
                db_index=True,
                default='pending',
                help_text='Current review status of this annotation',
                max_length=20,
                null=True,
                verbose_name='review status',
            ),
        ),
        migrations.AddField(
            model_name='annotation',
            name='reviewed_by',
            field=models.ForeignKey(
                blank=True,
                help_text='User who reviewed this annotation',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reviewed_annotations',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='annotation',
            name='reviewed_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Time when this annotation was reviewed',
                null=True,
                verbose_name='reviewed at',
            ),
        ),
        migrations.AddField(
            model_name='annotation',
            name='review_comment',
            field=models.TextField(
                blank=True,
                help_text='Feedback or comments from the reviewer',
                null=True,
                verbose_name='review comment',
            ),
        ),
        migrations.AddIndex(
            model_name='annotation',
            index=models.Index(fields=['review_status'], name='task_comple_review__idx'),
        ),
        migrations.AddIndex(
            model_name='annotation',
            index=models.Index(fields=['project', 'review_status'], name='task_comple_project_review_idx'),
        ),
        migrations.AddIndex(
            model_name='annotation',
            index=models.Index(fields=['reviewed_by'], name='task_comple_reviewe_idx'),
        ),
    ]
