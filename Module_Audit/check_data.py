import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import ResultatAudit
print("Last 5 ResultatAudit records:")
for r in ResultatAudit.objects.all().order_by('-id')[:5]:
    print(f"ID: {r.id}, Sujet: {r.sujet}, Commentaire: '{r.commentaire}'")
