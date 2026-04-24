from .models import ListeAudit, ResultatAudit

def notifications(request):
    if not request.user.is_authenticated:
        return {}
        
    notifs = []
    
    if request.user.is_superuser:
        # if auditor starts an audit (ResultatAudit created and en_cours=True)
        recent_started = ResultatAudit.objects.select_related('auditeur', 'audit').filter(en_cours=True).order_by('-id')[:5]
        for r in recent_started:
            notifs.append({
                'message': f"L'auditeur {r.auditeur.username if r.auditeur else 'Inconnu'} a démarré l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')}",
                'icon': 'play-circle',
                'color': 'text-blue-500',
                'url': f"/audit/etapes/{r.id}/"
            })
    else:
        # if admin planifier un audit pour eux
        user = request.user
        planifies = ListeAudit.objects.filter(affectation=user, resultataudit__isnull=True).order_by('-id')[:5]
        for p in planifies:
            notifs.append({
                'message': f"Un nouvel audit a été planifié pour vous : {p.desc}",
                'icon': 'calendar',
                'color': 'text-orange-500',
                'url': f"/dashboard/#audit-{p.id}"
            })
            
    return {
        'notifications': notifs,
        'notifications_count': len(notifs)
    }
