import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import FormulaireSousCritere, FormulaireAudit

f = FormulaireAudit.objects.order_by('-id').first()
if f:
    print(f"Form ID: {f.id}, Name: {f.name}")
    fscs = FormulaireSousCritere.objects.filter(formulaire=f)
    print(f"Total FSC associations: {fscs.count()}")
    for fsc in fscs:
        print(f"  - FSC ID: {fsc.id}, SC ID: {fsc.sous_critere.id}, Content: '{fsc.sous_critere.content[:30]}'")
else:
    print("No FormulaireAudit found.")
