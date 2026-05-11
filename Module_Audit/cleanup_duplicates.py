import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import FormulaireSousCritere, FormulaireAudit

def cleanup_duplicates():
    print("Starting cleanup of duplicate FormulaireSousCritere records...")
    
    # We want to keep only the one with the lowest ID for each (formulaire, sous_critere) pair
    duplicates_found = 0
    
    all_forms = FormulaireAudit.objects.all()
    for form in all_forms:
        seen = set()
        fscs = FormulaireSousCritere.objects.filter(formulaire=form).order_by('id')
        
        for fsc in fscs:
            key = fsc.sous_critere_id
            if key in seen:
                print(f"  - Deleting duplicate FSC ID {fsc.id} (Form: {form.id}, SC: {key})")
                fsc.delete()
                duplicates_found += 1
            else:
                seen.add(key)
                
    print(f"Cleanup complete. Total duplicates removed: {duplicates_found}")

if __name__ == "__main__":
    cleanup_duplicates()
