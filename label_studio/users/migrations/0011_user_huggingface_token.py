from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0010_userproducttour'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='huggingface_token',
            field=models.TextField(
                blank=True,
                help_text='Personal Hugging Face access token for dataset imports',
                null=True,
                verbose_name='huggingface token',
            ),
        ),
    ]
