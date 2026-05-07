import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import ResultatAudit, DetailResultatAudit

print("--- RECALCULATING ALL SCORES ---")
for r in ResultatAudit.objects.all():
    print(f"Audit PK: {r.pk}, Subject: {r.sujet}, Current Score: {r.score_audit}%")
    details = r.detailresultataudit_set.all()
    print(f"  Details count: {details.count()}")
    for d in details:
        print(f"    - ID: {d.pk}, Crit: {d.critere}, Val: {d.value}, Max: {d.value_max}, Cot: {d.cotation}")
    
    total_val = sum(d.value for d in details if d.value >= 0)
    total_max = sum(d.value_max for d in details if d.value >= 0)
    calc_score = (total_val / total_max * 100) if total_max > 0 else 0
    print(f"  Calculated by logic: {calc_score}%")
    if r.score_audit != round(calc_score, 2):
        print(f"  !!! MISMATCH detected for Resultat {r.pk} !!!")
