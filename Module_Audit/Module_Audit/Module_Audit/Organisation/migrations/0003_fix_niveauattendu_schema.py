# Generated manually to fix NiveauAttendu model schema

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('Organisation', '0002_processusdoc'),
    ]

    operations = [
        # Drop the old NiveauAttendu table
        migrations.DeleteModel(
            name='NiveauAttendu',
        ),
        # Recreate NiveauAttendu with correct schema
        migrations.CreateModel(
            name='NiveauAttendu',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('min_percentage', models.FloatField()),
                ('max_percentage', models.FloatField()),
                ('label', models.CharField(max_length=100)),
                ('site', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='niveaux', to='Organisation.site')),
            ],
            options={
                'ordering': ['min_percentage'],
            },
        ),
    ]
