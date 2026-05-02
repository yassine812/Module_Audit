import os
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import FormulaireAudit, FormulaireSousCritere, Critere, SousCritere
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
import re

def test_copy(pk):
    print(f"--- testing copy for PK: {pk} ---")
    try:
        original_form = FormulaireAudit.objects.get(pk=pk)
        
        # 1. Determine the new name
        original_name = original_form.name
        base_name = re.sub(r' - Copie( \d+)?$', '', original_name)
        
        existing_copies = FormulaireAudit.objects.filter(name__startswith=f"{base_name} - Copie")
        last_number = 0
        for copy in existing_copies:
            match = re.search(r' - Copie (\d+)$', copy.name)
            if match:
                num = int(match.group(1))
                if num > last_number:
                    last_number = num
            elif copy.name == f"{base_name} - Copie":
                if last_number < 1: last_number = 1
        
        new_nom = f"{base_name} - Copie {last_number + 1}"
        print(f"New Name: {new_nom}")

        # 2. Duplicate the FormulaireAudit
        new_form = FormulaireAudit.objects.get(pk=original_form.pk)
        new_form.pk = None
        new_form.name = new_nom
        new_form.save()
        print(f"Created new form (ID: {new_form.id})")
        
        # Copy M2M sections
        new_form.section.set(original_form.section.all())
        
        # 3. Deep Copy Structure: Criteres -> SousCriteres
        fsc_associations = FormulaireSousCritere.objects.filter(formulaire=original_form).order_by('ordre')
        print(f"Found {fsc_associations.count()} associations")
        
        critere_map = {}

        for assoc in fsc_associations:
            old_sc = assoc.sous_critere
            old_crit = old_sc.critere
            print(f"  Copying assoc for SC: {old_sc.content[:20]} (Crit: {old_crit.name})")

            # Get or Create the cloned Criterion for this new Form
            if old_crit.id not in critere_map:
                new_crit = Critere.objects.get(pk=old_crit.pk)
                new_crit.pk = None
                new_crit.formulaire = new_form
                new_crit.save()
                critere_map[old_crit.id] = new_crit
                print(f"    Cloned Critere: {new_crit.name}")
            else:
                new_crit = critere_map[old_crit.id]
            
            # Duplicate the SousCritere and link to the NEW Criterion
            new_sc = SousCritere.objects.get(pk=old_sc.pk)
            new_sc.pk = None
            new_sc.critere = new_crit
            new_sc.save()
            print(f"    Cloned SousCritere (New ID: {new_sc.id})")
            
            # Copy M2M relations of SousCritere
            new_sc.preuve_attendu.set(old_sc.preuve_attendu.all())
            if hasattr(old_sc, 'type_audit'):
                print("    Setting type_audit M2M")
                # This is likely the problem area
                try:
                    new_sc.type_audit.set(old_sc.type_audit.all())
                except Exception as m2m_err:
                    print(f"    M2M Error: {m2m_err}")
                    raise m2m_err
            
            # Create the association in the new form
            FormulaireSousCritere.objects.create(
                formulaire=new_form,
                sous_critere=new_sc,
                ordre=assoc.ordre
            )
        
        print("Success!")
        
    except Exception as e:
        print("General Error during copy:")
        traceback.print_exc()

if __name__ == "__main__":
    test_copy(9) # Main Office
