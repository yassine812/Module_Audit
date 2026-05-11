import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import ResultatAudit, ListeAudit, FormulaireAudit, FormulaireSousCritere

ra = ResultatAudit.objects.order_by('-id').first()
if ra:
    la = ra.audit
    print(f"ListeAudit ID: {la.id}")
    print(f"Formulaire: {la.formulaire_audit}")
    if la.formulaire_audit:
        fsc_count = FormulaireSousCritere.objects.filter(formulaire=la.formulaire_audit).count()
        print(f"SousCriteres in Formulaire: {fsc_count}")
        
        # Check if they are actually linked
        fscs = FormulaireSousCritere.objects.filter(formulaire=la.formulaire_audit)
        for f in fscs[:5]:
            print(f"  - FSC ID: {f.id}, SC: {f.sous_critere}")
else:
    print("No ResultatAudit found.")
