import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import ResultatAudit, DetailResultatAudit

# Find the most recent ResultatAudit
ra = ResultatAudit.objects.order_by('-id').first()
if ra:
    print(f"ResultatAudit ID: {ra.id}")
    print(f"Audit: {ra.audit}")
    print(f"Participants internal: {ra.audit.participants.all()}")
    print(f"Participants externes: {ra.audit.participants_externes}")
    print(f"Audites (Resultat field): {ra.audites.all()}")
else:
    print("No ResultatAudit found.")
