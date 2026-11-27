from django.db import migrations
from django.db.models import JSONField
from django.utils.translation import gettext_lazy as _


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0034_project_annotator_evaluation_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectsummary',
            name='dimension_value_counts',
            field=JSONField(
                _('dimension value counts'),
                blank=True,
                help_text='Dimension-backed label distribution counts cache',
                null=True,
            ),
        ),
    ]
