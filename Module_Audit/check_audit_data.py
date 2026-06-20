import os
import django
from django.db.models import Avg, Q

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from django.contrib.auth.models import User
from audit.models import ListeAudit, ResultatAudit

print("--- VERIFYING NEW SCORE_MOY FOR USERS ---")
for user in User.objects.all():
    print(f"\nUser: {user.username} (ID: {user.id})")
    
    audits_assigned = ListeAudit.objects.filter(Q(affectation=user) | Q(participants=user))
    planifies = audits_assigned.exclude(resultataudit__isnull=False).count()
    en_cours = audits_assigned.filter(resultataudit__en_cours=True).count()
    termines = audits_assigned.filter(resultataudit__en_cours=False).exclude(resultataudit__en_cours=True).count()
    
    # Old logic
    score_moy_old = ResultatAudit.objects.filter(auditeur=user, en_cours=False).aggregate(Avg('score_audit'))['score_audit__avg']
    score_moy_old_display = round(score_moy_old, 1) if score_moy_old else "0.0"
    
    # New logic
    completed_results = ResultatAudit.objects.filter(audit__in=audits_assigned, en_cours=False)
    score_moy_new = completed_results.aggregate(Avg('score_audit'))['score_audit__avg']
    score_moy_new_display = round(float(score_moy_new) * 100, 1) if score_moy_new is not None else "0.0"
    
    print(f"  Planifies: {planifies}, En cours: {en_cours}, Termines: {termines}")
    print(f"  Old Score Moy display logic: {score_moy_old_display} (fraction: {score_moy_old})")
    print(f"  New Score Moy display logic: {score_moy_new_display} (fraction: {score_moy_new})")
