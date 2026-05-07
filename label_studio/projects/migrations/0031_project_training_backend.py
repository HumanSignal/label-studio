from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0030_alter_project_label_config'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='training_backend',
            field=models.TextField(
                blank=True,
                default='',
                help_text='ML backend title targeted for training on annotation updates',
                null=True,
                verbose_name='training backend',
            ),
        ),
    ]
