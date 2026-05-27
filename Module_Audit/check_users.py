import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from django.contrib.auth.models import User

for u in User.objects.all():
    print(f"Username: {u.username}, is_superuser: {u.is_superuser}, is_staff: {u.is_staff}, Groups: {[g.name for g in u.groups.all()]}")
