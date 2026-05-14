from .models import ListeAudit, ResultatAudit

def notifications(request):
    if not request.user.is_authenticated:
        return {}
        
    notifs = []
    
    if request.user.is_superuser:
        # if auditor starts an audit (ResultatAudit created and en_cours=True)
        recent_started = ResultatAudit.objects.select_related('auditeur', 'audit').filter(en_cours=True).order_by('-id')
        total_count = recent_started.count()
        for r in recent_started[:5]:
            notifs.append({
                'message': f"L'auditeur {r.auditeur.username if r.auditeur else 'Inconnu'} a démarré l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')}",
                'icon': 'play-circle',
                'color': 'text-blue-500',
                'url': f"/audit/resultat/{r.id}/etapes/"
            })
    else:
        # if admin planifier un audit pour eux (Auditor OR Participant)
        from django.db.models import Q
        user = request.user
        planifies_qs = ListeAudit.objects.filter(
            Q(affectation=user) | Q(participants=user), 
            resultataudit__isnull=True
        ).distinct().order_by('-id')
        total_count = planifies_qs.count()
        for p in planifies_qs[:5]:
            notifs.append({
                'message': f"Un nouvel audit a été planifié pour vous : {p.desc}",
                'icon': 'calendar',
                'color': 'text-orange-500',
                'url': f"/audit/liste-audit/{p.id}/"
            })
            
    return {
        'notifications': notifs,
        'notifications_count': total_count
    }
