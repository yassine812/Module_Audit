import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from django.contrib.auth.models import User
from audit.models import ListeAudit, ResultatAudit
from django.db.models import Q

def check_data():
    username = 'auditeur' # Based on greeting in screenshot
    try:
        user = User.objects.get(username=username)
        print(f"User: {user.username} (ID: {user.id})")
        
        audits_assigned = ListeAudit.objects.filter(Q(affectation=user) | Q(participants=user))
        print(f"Audits assigned count: {audits_assigned.count()}")
        
        for a in audits_assigned:
            print(f" - Audit ID: {a.id}, Desc: {a.desc}")
            
        planifies = audits_assigned.exclude(resultataudit__isnull=False).count()
        en_cours = audits_assigned.filter(resultataudit__en_cours=True).distinct().count()
        termines = audits_assigned.filter(resultataudit__en_cours=False).exclude(resultataudit__en_cours=True).distinct().count()
        
        print(f"Calculated: Planifies={planifies}, En Cours={en_cours}, Termines={termines}")

    except User.DoesNotExist:
        print(f"User '{username}' not found.")

if __name__ == "__main__":
    check_data()
