import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import ResultatAudit
print("Fields in ResultatAudit:")
for field in ResultatAudit._meta.fields:
    print(f"- {field.name}")
