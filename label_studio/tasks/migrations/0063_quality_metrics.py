"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0062_annotationcomment'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnnotationMetrics',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('time_spent', models.FloatField(blank=True, help_text='Time spent on annotation in seconds', null=True, verbose_name='time spent')),
                ('quality_score', models.FloatField(blank=True, help_text='Overall quality score (0-100)', null=True, verbose_name='quality score')),
                ('accuracy_score', models.FloatField(blank=True, help_text='Accuracy compared to ground truth (0-100)', null=True, verbose_name='accuracy score')),
                ('agreement_score', models.FloatField(blank=True, help_text='Inter-annotator agreement score (0-100)', null=True, verbose_name='agreement score')),
                ('num_regions', models.IntegerField(default=0, help_text='Number of labeled regions in annotation', verbose_name='number of regions')),
                ('num_revisions', models.IntegerField(default=0, help_text='Number of times annotation was revised', verbose_name='number of revisions')),
                ('is_outlier', models.BooleanField(default=False, help_text='Whether this annotation is statistical outlier', verbose_name='is outlier')),
                ('needs_review', models.BooleanField(default=False, help_text='Whether this annotation needs quality review', verbose_name='needs review')),
                ('calculated_at', models.DateTimeField(auto_now=True, help_text='Last time metrics were calculated', verbose_name='calculated at')),
                ('annotation', models.OneToOneField(help_text='Annotation these metrics belong to', on_delete=django.db.models.deletion.CASCADE, related_name='metrics', to='tasks.annotation')),
            ],
            options={
                'verbose_name_plural': 'Annotation metrics',
                'db_table': 'annotation_metrics',
            },
        ),
        migrations.CreateModel(
            name='QualityScore',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score', models.IntegerField(choices=[(1, 'Poor'), (2, 'Below Average'), (3, 'Average'), (4, 'Good'), (5, 'Excellent')], help_text='Quality rating from 1 (poor) to 5 (excellent)', verbose_name='quality score')),
                ('completeness_score', models.IntegerField(blank=True, choices=[(1, 'Poor'), (2, 'Below Average'), (3, 'Average'), (4, 'Good'), (5, 'Excellent')], help_text='How complete is the annotation', null=True, verbose_name='completeness')),
                ('accuracy_score', models.IntegerField(blank=True, choices=[(1, 'Poor'), (2, 'Below Average'), (3, 'Average'), (4, 'Good'), (5, 'Excellent')], help_text='How accurate is the annotation', null=True, verbose_name='accuracy')),
                ('consistency_score', models.IntegerField(blank=True, choices=[(1, 'Poor'), (2, 'Below Average'), (3, 'Average'), (4, 'Good'), (5, 'Excellent')], help_text='How consistent with guidelines', null=True, verbose_name='consistency')),
                ('feedback', models.TextField(blank=True, help_text='Detailed feedback for annotator', verbose_name='feedback')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
                ('annotation', models.ForeignKey(help_text='Annotation being evaluated', on_delete=django.db.models.deletion.CASCADE, related_name='quality_scores', to='tasks.annotation')),
                ('reviewer', models.ForeignKey(help_text='Reviewer who evaluated quality', on_delete=django.db.models.deletion.CASCADE, related_name='quality_reviews', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'quality_score',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='annotationmetrics',
            index=models.Index(fields=['annotation'], name='annotation_annotat_ccbe62_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationmetrics',
            index=models.Index(fields=['quality_score'], name='annotation_quality_7d9f3a_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationmetrics',
            index=models.Index(fields=['accuracy_score'], name='annotation_accurac_4e8b21_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationmetrics',
            index=models.Index(fields=['agreement_score'], name='annotation_agreeme_9a2c56_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationmetrics',
            index=models.Index(fields=['is_outlier'], name='annotation_is_outl_1f4d78_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationmetrics',
            index=models.Index(fields=['needs_review'], name='annotation_needs_r_6e3a94_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityscore',
            index=models.Index(fields=['annotation', 'created_at'], name='quality_sc_annotat_5b7e29_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityscore',
            index=models.Index(fields=['reviewer'], name='quality_sc_reviewe_8c4f12_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityscore',
            index=models.Index(fields=['score'], name='quality_sc_score_3a9d56_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='qualityscore',
            unique_together={('annotation', 'reviewer')},
        ),
    ]
