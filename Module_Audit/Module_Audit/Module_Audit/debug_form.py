import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import FormulaireAudit, FormulaireSousCritere, Critere, SousCritere

def check_form(name):
    print(f"--- Checking Form: {name} ---")
    try:
        form = FormulaireAudit.objects.get(name=name)
        print(f"ID: {form.id}")
        
        # Method 1: criteres related_name
        criteres = form.criteres.all()
        print(f"Direct Criteria (via FK): {criteres.count()}")
        for c in criteres:
            print(f"  - Critere: {c.name}")
            sc_count = SousCritere.objects.filter(critere=c).count()
            print(f"    Sub-criteria count: {sc_count}")

        # Method 2: FormulaireSousCritere
        fsc = FormulaireSousCritere.objects.filter(formulaire=form)
        print(f"FormulaireSousCritere Count: {fsc.count()}")
        for assoc in fsc:
            print(f"  - SC: {assoc.sous_critere.content[:30]} (Crit: {assoc.sous_critere.critere.name})")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_form("Main Office")
    check_form("Main Office - Copie 1")
