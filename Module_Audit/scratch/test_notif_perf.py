import os
import django
import time
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import ResultatAudit, ListeAudit
from django.contrib.auth.models import User
from django.db.models import Q

def test_notifications():
    start_time = time.time()
    user = User.objects.get(username='admin')
    print(f"Testing for user: {user.username}")
    
    # Superuser logic
    recent_started = ResultatAudit.objects.select_related('auditeur', 'audit').filter(en_cours=True).order_by('-id')[:10]
    notifs = []
    for r in recent_started:
        notifs.append({
            'id': f"res-{r.id}",
            'message': f"L'auditeur {r.auditeur.username if r.auditeur else 'Inconnu'} a démarré l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')}",
            'type': 'audit_started',
            'target_id': r.id,
            'date': r.date_audit.strftime('%Y-%m-%d %H:%M:%S') if r.date_audit else None
        })
    
    print(f"Admin Notifs count: {len(notifs)}")
    print(f"Time taken: {time.time() - start_time:.4f}s")

    # Regular user logic
    auditor = User.objects.filter(groups__name='Auditeur').first()
    if auditor:
        start_time = time.time()
        print(f"Testing for auditor: {auditor.username}")
        planifies = ListeAudit.objects.filter(
            Q(affectation=auditor) | Q(participants=auditor), 
            resultataudit__isnull=True
        ).distinct().order_by('-id')[:10]
        notifs = []
        for p in planifies:
            notifs.append({
                'id': f"plan-{p.id}",
                'message': f"Un nouvel audit a été planifié pour vous : {p.desc}",
                'type': 'audit_planned',
                'target_id': p.id,
                'date': p.date.strftime('%Y-%m-%d %H:%M:%S') if p.date else None
            })
        print(f"Auditor Notifs count: {len(notifs)}")
        print(f"Time taken: {time.time() - start_time:.4f}s")

if __name__ == "__main__":
    test_notifications()
