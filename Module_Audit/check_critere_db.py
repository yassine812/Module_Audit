import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import Critere, SousCritere

print("All Criteria:")
for c in Critere.objects.all():
    print(f"ID: {c.id}, Name: {c.name}, Formulaire: {c.formulaire_id}, TypeAudit: {[t.id for t in c.type_audit.all()]}")

print("\nAll SousCriteria:")
for sc in SousCritere.objects.all():
    print(f"ID: {sc.id}, Content: {sc.content[:30]}, Critere: {sc.critere_id}")
