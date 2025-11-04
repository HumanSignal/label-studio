# Generated migration for adding role field to User model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0011_user_custom_hotkeys"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="role",
            field=models.CharField(
                max_length=32,
                default="annotator",
                choices=[("admin", "Admin"), ("annotator", "Annotator")],
                help_text="User role for access control",
                verbose_name="role",
            ),
        ),
    ]
