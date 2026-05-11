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
    print(f"En cours: {ra.en_cours}")
    details = ra.detailresultataudit_set.all()
    print(f"Number of details: {details.count()}")
    for d in details[:5]:
        print(f"  - Detail ID: {d.id}, Critere: '{d.critere}', Sous-Critere: '{d.sous_critere[:50]}...'")
else:
    print("No ResultatAudit found.")
