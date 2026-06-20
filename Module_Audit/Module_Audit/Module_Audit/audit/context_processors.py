import datetime
from django.utils import timezone
from django.db.models import Q
from .models import ListeAudit, ResultatAudit

def notifications(request):
    if not request.user.is_authenticated:
        return {}
        
    user = request.user
    notifs = []
    local_now = timezone.localtime(timezone.now())
    today_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    def make_aware_if_naive(dt):
        if dt and timezone.is_naive(dt):
            return timezone.make_aware(dt, timezone.get_current_timezone())
        return dt

    if user.is_superuser:
        # 1. En Retard (planned and overdue)
        late_audits = ListeAudit.objects.filter(
            Q(resultataudit__isnull=True) | Q(resultataudit__en_cours=True),
            date__lt=today_start
        ).distinct().order_by('-date_creation')[:5]
        for p in late_audits:
            formatted_date = p.date.strftime('%d/%m/%Y') if p.date else ''
            notifs.append({
                'id': f"su-late-{p.id}",
                'message': f"L'audit '{p.desc}' (prévu le {formatted_date}) est en retard !",
                'icon': 'alert-triangle',
                'color': 'text-red-500',
                'url': f"/audit/liste-audit/?highlight={p.id}#audit-{p.id}",
                'date_sort': make_aware_if_naive(p.date_creation or p.date)
            })
            
        # 2. Started (in progress)
        recent_started = ResultatAudit.objects.select_related('auditeur', 'audit').filter(en_cours=True).order_by('-date_audit')[:5]
        for r in recent_started:
            notifs.append({
                'id': f"started-{r.id}",
                'message': f"L'auditeur {r.auditeur.username if r.auditeur else 'Inconnu'} a démarré l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')}",
                'icon': 'play-circle',
                'color': 'text-blue-500',
                'url': f"/audit/resultat/{r.id}/etapes/",
                'date_sort': make_aware_if_naive(r.date_audit)
            })
            
        # 3. Finished (completed)
        recent_finished = ResultatAudit.objects.select_related('auditeur', 'audit').filter(en_cours=False).order_by('-date_audit')[:5]
        for r in recent_finished:
            score_pct = round(r.score_audit * 100) if r.score_audit else 0
            notifs.append({
                'id': f"finished-{r.id}",
                'message': f"L'auditeur {r.auditeur.username if r.auditeur else 'Inconnu'} a finalisé l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')} (Score: {score_pct}%)",
                'icon': 'check-circle',
                'color': 'text-green-500',
                'url': f"/audit/resultats/{r.id}/report/",
                'date_sort': make_aware_if_naive(r.date_audit)
            })
            
    else:
        # For Auditeur / Participant
        # 1. En Retard (planned and overdue)
        late_audits = ListeAudit.objects.filter(
            Q(affectation=user) | Q(participants=user),
            Q(resultataudit__isnull=True) | Q(resultataudit__en_cours=True),
            date__lt=today_start
        ).distinct().order_by('-date_creation')[:5]
        for p in late_audits:
            formatted_date = p.date.strftime('%d/%m/%Y') if p.date else ''
            notifs.append({
                'id': f"aud-late-{p.id}",
                'message': f"Votre audit '{p.desc}' (prévu le {formatted_date}) est en retard !",
                'icon': 'alert-triangle',
                'color': 'text-red-500',
                'url': f"/audit/liste-audit/?highlight={p.id}#audit-{p.id}",
                'date_sort': make_aware_if_naive(p.date_creation or p.date)
            })
            
        # 2. Started (in progress)
        recent_started = ResultatAudit.objects.select_related('auditeur', 'audit').filter(
            Q(co_auditeur=user) | Q(audites=user) | Q(auditeur=user),
            en_cours=True
        ).order_by('-date_audit')[:5]
        for r in recent_started:
            notifs.append({
                'id': f"started-{r.id}",
                'message': f"Vous avez démarré l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')}",
                'icon': 'play-circle',
                'color': 'text-blue-500',
                'url': f"/audit/resultat/{r.id}/etapes/",
                'date_sort': make_aware_if_naive(r.date_audit)
            })
            
        # 3. Finished (completed)
        recent_finished = ResultatAudit.objects.select_related('auditeur', 'audit').filter(
            Q(co_auditeur=user) | Q(audites=user) | Q(auditeur=user),
            en_cours=False
        ).order_by('-date_audit')[:5]
        for r in recent_finished:
            score_pct = round(r.score_audit * 100) if r.score_audit else 0
            notifs.append({
                'id': f"finished-{r.id}",
                'message': f"Vous avez finalisé l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')} (Score: {score_pct}%)",
                'icon': 'check-circle',
                'color': 'text-green-500',
                'url': f"/audit/resultats/{r.id}/report/",
                'date_sort': make_aware_if_naive(r.date_audit)
            })
            
        # 4. Planned but not overdue
        planifies_qs = ListeAudit.objects.filter(
            Q(affectation=user) | Q(participants=user), 
            resultataudit__isnull=True,
            date__gte=today_start
        ).distinct().order_by('-date_creation')[:5]
        for p in planifies_qs:
            local_date = timezone.localtime(make_aware_if_naive(p.date)) if p.date else None
            formatted_date = local_date.strftime('%d/%m/%Y') if local_date else ''
            notifs.append({
                'id': f"aud-planned-{p.id}",
                'message': f"Vous êtes affecté à un audit '{p.desc}' prévu le {formatted_date}",
                'icon': 'calendar',
                'color': 'text-orange-500',
                'url': f"/audit/liste-audit/?highlight={p.id}#audit-{p.id}",
                'date_sort': make_aware_if_naive(p.date_creation or p.date)
            })
            
    # Sort all notifications from newest to oldest
    notifs.sort(key=lambda x: x['date_sort'], reverse=True)
    
    # Filter out dismissed notifications
    dismissed_ids = request.session.get('dismissed_notifications', [])
    notifs = [n for n in notifs if n.get('id') not in dismissed_ids]
    
    # Strip the date_sort key before returning
    for n in notifs:
        n.pop('date_sort', None)
        
    return {
        'notifications': notifs[:10],
        'notifications_count': len(notifs[:10])
    }
