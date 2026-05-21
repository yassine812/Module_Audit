from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0019_remove_resultataudit_dummy_field"),
    ]

    operations = [
        migrations.AddField(
            model_name="listeaudit",
            name="date_creation",
            field=models.DateTimeField(auto_now_add=True, blank=True, null=True),
        ),
    ]
