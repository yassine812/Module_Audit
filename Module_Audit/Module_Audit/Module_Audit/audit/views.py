from django.urls import reverse_lazy
from django.views.generic import (
    ListView, CreateView, UpdateView,
    DeleteView, DetailView, View, TemplateView
)
from django.contrib.auth.models import User
from django.http import JsonResponse
from .mixins import SuperuserRequiredMixin, AuditeurOrSuperuserRequiredMixin
from django.shortcuts import redirect, get_object_or_404, render
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.views import PasswordChangeView
from django.contrib.messages.views import SuccessMessageMixin
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseForbidden
from django.db import transaction
from django.db.models import ProtectedError
from .models import (
    TypeAudit,
    TextRef,
    ChapitreNorme,
    Critere,
    SousCritere,
    TypePreuve,
    FormulaireAudit,
    FormulaireSousCritere,
    PreuveAttendu,
    Cotation,
    TypeCotation,
    ListeAudit,
    ResultatAudit,
    DetailResultatAudit,
    SousCritereTypeAudit,
)
from .forms import FormulaireAuditForm, CritereFormSet, SousCritereFormSet, TypeAuditForm, CritereForm, TypePreuveForm, PreuveAttenduForm, SousCritereStandaloneForm
from Organisation.models import Processus, TypeEquipement, Section
from django import forms

from django.contrib.auth.models import Group

class UserForm(forms.ModelForm):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('auditeur', 'Auditeur'),
        ('participant', 'Participant'),
    ]
    role = forms.ChoiceField(choices=ROLE_CHOICES, label="Rôle", widget=forms.Select(attrs={'class': 'form-control select2'}))

    password = forms.CharField(widget=forms.PasswordInput(), label="Mot de passe", required=False, help_text="Laissez vide pour ne pas modifier")

    class Meta:
        model = User
        fields = ["username", "email", "password"]
        labels = {
            "username": "Nom d'utilisateur",
            "email": "Adresse Email",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            if self.instance.is_superuser:
                self.initial['role'] = 'admin'
            elif self.instance.groups.filter(name='Auditeur').exists():
                self.initial['role'] = 'auditeur'
            elif self.instance.groups.filter(name='Participant').exists():
                self.initial['role'] = 'participant'

class UserCreateForm(UserForm):
    password = forms.CharField(widget=forms.PasswordInput(), label="Mot de passe")
    
    class Meta(UserForm.Meta):
        fields = ["username", "email", "password"]

# Dashboard View
class DashboardView(LoginRequiredMixin, TemplateView):
    
    def get_template_names(self):
        if self.request.user.is_superuser:
            return ["dashboard.html"]
        return ["audit/auditeur_dashboard.html"]
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # --- SHARED CONTEXT (for all users) ---
        context['month_choices'] = [
            (1,'Janvier'),(2,'Février'),(3,'Mars'),(4,'Avril'),
            (5,'Mai'),(6,'Juin'),(7,'Juillet'),(8,'Août'),
            (9,'Septembre'),(10,'Octobre'),(11,'Novembre'),(12,'Décembre'),
        ]
        from django.utils import timezone
        current_year = timezone.now().year
        from django.db.models.functions import ExtractYear
        fa_years = set(FormulaireAudit.objects.annotate(y=ExtractYear('date_creation')).values_list('y', flat=True).distinct())
        la_years = set(ListeAudit.objects.annotate(y=ExtractYear('date')).values_list('y', flat=True).distinct())
        ra_years = set(ResultatAudit.objects.annotate(y=ExtractYear('date_audit')).values_list('y', flat=True).distinct())
        ta_years = set(TypeAudit.objects.annotate(y=ExtractYear('date_creation')).values_list('y', flat=True).distinct())
        all_years = sorted((fa_years | la_years | ra_years | ta_years | {current_year}), reverse=True)
        context['available_years'] = all_years
        context['current_year'] = current_year

        if self.request.user.is_superuser:
            context['types_audit_count'] = TypeAudit.objects.count()
            context['formulaires_count'] = FormulaireAudit.objects.count()
            context['audits_count'] = ListeAudit.objects.count()
            context['resultats_count'] = ResultatAudit.objects.count()
            
            # Calculate progress percs
            context['types_audit_progress'] = min(int((context['types_audit_count'] / 50) * 100), 100) if context['types_audit_count'] > 0 else 0
            context['formulaires_progress'] = min(int((context['formulaires_count'] / 100) * 100), 100) if context['formulaires_count'] > 0 else 0
            context['audits_progress'] = min(int((context['audits_count'] / 200) * 100), 100) if context['audits_count'] > 0 else 0
            context['resultats_progress'] = min(int((context['resultats_count'] / 150) * 100), 100) if context['resultats_count'] > 0 else 0
            
            # Log activities for superusers (Recent admin actions)
            from django.contrib.admin.models import LogEntry
            context['recent_activities'] = LogEntry.objects.select_related('content_type', 'user').order_by('-action_time')[:3]
        else:
            from django.db.models import Avg, Q
            user = self.request.user
            # Include audits where user is Auditor OR Participant
            audits_assigned = ListeAudit.objects.filter(Q(affectation=user) | Q(participants=user))
            
            planifies = audits_assigned.exclude(resultataudit__isnull=False).count()
            en_cours = audits_assigned.filter(resultataudit__en_cours=True).distinct().count()
            termines = audits_assigned.filter(resultataudit__en_cours=False).exclude(resultataudit__en_cours=True).distinct().count()
            
            # Score average remains for results where user is the lead Auditor
            score_moy = ResultatAudit.objects.filter(auditeur=user, en_cours=False).aggregate(Avg('score_audit'))['score_audit__avg']
            
            context['planifies_count'] = planifies
            en_cours_count = audits_assigned.filter(resultataudit__en_cours=True).distinct().count()
            context['en_cours_count'] = en_cours
            context['termines_count'] = termines
            context['score_moy'] = round(score_moy, 1) if score_moy else "0.0"
            
            context['recent_audits'] = audits_assigned.select_related('formulaire_audit', 'site').prefetch_related('affectation', 'participants').order_by('-date')[:10]
        return context

class ChartDataAPIView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        from django.db.models.functions import TruncMonth, TruncDay
        from django.db.models import Count
        from django.utils import timezone
        import calendar

        year_param = request.GET.get('year')
        month_params = request.GET.getlist('month')  # supports multiple months

        now = timezone.now()
        target_year = int(year_param) if year_param else now.year
        target_months = [int(m) for m in month_params if m]  # list of ints

        # Determine mode
        is_filtered_months = bool(target_months)

        MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                        'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

        def aggregate_model(model, date_field):
            qs = model.objects.filter(**{f"{date_field}__year": target_year})

            if is_filtered_months:
                # Filter to the selected months only
                qs = qs.filter(**{f"{date_field}__month__in": target_months})
                # Group by month
                agg = (qs.annotate(month=TruncMonth(date_field))
                         .values(f"{date_field}__month")
                         .annotate(count=Count('id'))
                         .order_by(f"{date_field}__month"))
                # Build result only for the selected months (in order)
                month_map = {str(e[f"{date_field}__month"]): e['count'] for e in agg}
                return [month_map.get(str(m), 0) for m in sorted(target_months)]
            else:
                # All 12 months
                agg = (qs.annotate(month=TruncMonth(date_field))
                         .values(f"{date_field}__month")
                         .annotate(count=Count('id'))
                         .order_by(f"{date_field}__month"))
                month_map = {str(e[f"{date_field}__month"]): e['count'] for e in agg}
                return [month_map.get(str(m), 0) for m in range(1, 13)]

        types_audit_data = aggregate_model(TypeAudit, 'date_creation')
        formulaires_data = aggregate_model(FormulaireAudit, 'date_creation')
        audits_data = aggregate_model(ListeAudit, 'date')
        resultats_data = aggregate_model(ResultatAudit, 'date_audit')

        if is_filtered_months:
            labels = [MONTH_LABELS[m - 1] for m in sorted(target_months)]
        else:
            labels = MONTH_LABELS

        return JsonResponse({
            'labels': labels,
            'datasets': {
                'types_audit': types_audit_data,
                'formulaires': formulaires_data,
                'audits_planifies': audits_data,
                'resultats': resultats_data,
            },
            'totals': {
                'types_audit': sum(types_audit_data),
                'formulaires': sum(formulaires_data),
                'audits_planifies': sum(audits_data),
                'resultats': sum(resultats_data),
            }
        })

#type audit
class TypeAuditListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TypeAudit
    template_name = "audit/typeaudit/typeaudit_list.html"
    context_object_name = "object_list"
    ordering = ["id"]
    paginate_by = 7

    def get_queryset(self):
        return TypeAudit.objects.prefetch_related('section')

class TypeAuditCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = TypeAudit
    form_class = TypeAuditForm
    template_name = "audit/typeaudit/typeaudit_form.html"
    success_url = reverse_lazy("typeaudit_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/typeaudit/typeaudit_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': "Le type d'audit a été créé avec succès."
            })
        self.object = form.save(commit=False)
        self.object.save()
        form.save_m2m()  # Save ManyToMany relationships
        return redirect(self.get_success_url())

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/typeaudit/typeaudit_form_modal.html", {'form': form})
        return super().form_invalid(form)


class TypeAuditUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TypeAudit
    form_class = TypeAuditForm
    template_name = "audit/typeaudit/typeaudit_form.html"
    success_url = reverse_lazy("typeaudit_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/typeaudit/typeaudit_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': "Le type d'audit a été mis à jour avec succès."
            })
        self.object = form.save()
        return redirect(self.get_success_url())

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/typeaudit/typeaudit_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)
class TypeAuditDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TypeAudit
    template_name = "audit/typeaudit/typeaudit_confirm_delete.html"
    success_url = reverse_lazy("typeaudit_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/typeaudit/typeaudit_delete_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Type d'audit supprimé avec succès."})
            except ProtectedError:
                error_msg = "Impossible de supprimer ce type car il est lié à des formulaires d'audit existants."
                return JsonResponse({'success': False, 'message': error_msg}, status=400)
        return super().form_valid(form)
#textref
class TextRefListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TextRef
    template_name = "audit/textref/textref_list.html"
    context_object_name = "textrefs"
    ordering = ["id"]
    paginate_by = 7

class TextRefCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = TextRef
    fields = "__all__"
    template_name = "audit/textref/textref_form.html"
    success_url = reverse_lazy("textref_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/textref/textref_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Le texte de référence a été créé avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/textref/textref_form_modal.html", {'form': form})
        return super().form_invalid(form)

class TextRefUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TextRef
    fields = "__all__"
    template_name = "audit/textref/textref_form.html"
    success_url = reverse_lazy("textref_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/textref/textref_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Le texte de référence a été mis à jour avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/textref/textref_form_modal.html", {'form': form, 'object': self.object})
        return super().form_invalid(form)
class TextRefDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TextRef
    template_name = "audit/textref/textref_confirm_delete.html"
    success_url = reverse_lazy("textref_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/textref/textref_delete_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Texte de référence supprimé avec succès."})
            except ProtectedError:
                return JsonResponse({
                    'success': False,
                    'message': "Cette référence ne peut pas être supprimée car elle est utilisée ailleurs."
                }, status=400)
        return super().form_valid(form)
#chapiteNorme
class ChapitreNormeListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = ChapitreNorme
    template_name = "audit/chapitre/chapitre_list.html"
    context_object_name = "chapitres"
    ordering = ["id"]
    paginate_by = 7
class ChapitreNormeCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = ChapitreNorme
    fields = "__all__"
    template_name = "audit/chapitre/chapitre_form.html"
    success_url = reverse_lazy("chapitre_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/chapitre/chapitre_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Le chapitre a été créé avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/chapitre/chapitre_form_modal.html", {'form': form})
        return super().form_invalid(form)
class ChapitreNormeUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = ChapitreNorme
    fields = "__all__"
    template_name = "audit/chapitre/chapitre_form.html"
    success_url = reverse_lazy("chapitre_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/chapitre/chapitre_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Le chapitre a été mis à jour avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/chapitre/chapitre_form_modal.html", {'form': form, 'object': self.object})
        return super().form_invalid(form)
class ChapitreNormeDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = ChapitreNorme
    template_name = "audit/chapitre/chapitre_confirm_delete.html"
    success_url = reverse_lazy("chapitre_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/chapitre/chapitre_delete_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Chapitre supprimé avec succès."})
            except ProtectedError:
                return JsonResponse({
                    'success': False,
                    'message': "Ce chapitre ne peut pas être supprimé car il est utilisé."
                }, status=400)
        return super().form_valid(form)
#critere
class CritereListView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, ListView):
    model = Critere
    template_name = "audit/critere/critere_list.html"
    context_object_name = "criteres"
    ordering = ["id"]
    paginate_by = 7

    def paginate_queryset(self, queryset, page_size):
        from django.http import Http404
        try:
            return super().paginate_queryset(queryset, page_size)
        except Http404:
            self.kwargs[self.page_kwarg] = 'last'
            mutable_get = self.request.GET.copy()
            mutable_get[self.page_kwarg] = 'last'
            self.request.GET = mutable_get
            return super().paginate_queryset(queryset, page_size)
class CritereCreateView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, CreateView):
    model = Critere
    form_class = CritereForm
    template_name = "audit/critere/critere_form.html"
    success_url = reverse_lazy("critere_list")
    
    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/critere/critere_form_modal.html"]
        return ["audit/critere/critere_form.html"]

    def get_context_data(self, **kwargs):
        data = super().get_context_data(**kwargs)
        if self.request.POST:
            data['sous_criteres'] = SousCritereFormSet(self.request.POST)
        else:
            data['sous_criteres'] = SousCritereFormSet()
        return data

    def form_valid(self, form):
        context = self.get_context_data()
        sous_criteres = context['sous_criteres']
        if sous_criteres.is_valid():
            self.object = form.save()
            sous_criteres.instance = self.object
            saved_scs = sous_criteres.save()
            
            # Sync Type Audit from Parent to Children
            parent_types = list(self.object.type_audit.all())
            for sc in saved_scs:
                sc.type_audit.set(parent_types)
                
            if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f"Le critère '{self.object.name}' et ses sous-critères ont été créés avec succès."
                })
            return redirect(self.success_url)
        else:
            return self.form_invalid(form)

    def form_invalid(self, form):
        context = self.get_context_data()
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/critere/critere_form_modal.html", {
                'form': form,
                'sous_criteres': context['sous_criteres']
            })
        return super().form_invalid(form)


class CritereUpdateView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, UpdateView):
    model = Critere
    form_class = CritereForm
    template_name = "audit/critere/critere_form.html"
    success_url = reverse_lazy("critere_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/critere/critere_form_modal.html"]
        return ["audit/critere/critere_form.html"]

    def get_context_data(self, **kwargs):
        data = super().get_context_data(**kwargs)
        if self.request.POST:
            data['sous_criteres'] = SousCritereFormSet(self.request.POST, instance=self.object)
        else:
            data['sous_criteres'] = SousCritereFormSet(instance=self.object)
        return data

    def form_valid(self, form):
        context = self.get_context_data()
        sous_criteres = context['sous_criteres']
        if sous_criteres.is_valid():
            self.object = form.save()
            saved_scs = sous_criteres.save()
            
            # Sync Type Audit from Parent to Children
            parent_types = list(self.object.type_audit.all())
            for sc in saved_scs:
                sc.type_audit.set(parent_types)

            if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f"Le critère '{self.object.name}' et ses sous-critères ont été mis à jour avec succès."
                })
            return redirect(self.success_url)
        else:
            return self.form_invalid(form)

    def form_invalid(self, form):
        context = self.get_context_data()
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/critere/critere_form_modal.html", {
                'form': form,
                'object': self.get_object(),
                'sous_criteres': context['sous_criteres']
            })
        return super().form_invalid(form)
class CritereDeleteView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, DeleteView):
    model = Critere
    template_name = "audit/critere/critere_confirm_delete.html"
    success_url = reverse_lazy("critere_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/critere/critere_delete_modal.html"]
        return ["audit/critere/critere_confirm_delete.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Critère supprimé avec succès."})
            except ProtectedError:
                # Identify why it's protected (e.g., linked SousCritere)
                related_sous_criteres = self.object.souscritere_set.all()
                error_msg = f"Impossible de supprimer le critère '{self.object.name}' car il possède des dépendances actives."
                if related_sous_criteres.exists():
                    sc_names = [sc.content[:30] for sc in related_sous_criteres[:3]]
                    error_msg = (
                        f"Impossible de supprimer le critère '{self.object.name}' car il est utilisé par "
                        f"{len(related_sous_criteres)} sous-critère(s): {', '.join(sc_names)}{'...' if len(related_sous_criteres) > 3 else ''}."
                    )
                return JsonResponse({'success': False, 'message': error_msg}, status=400)

        return super().form_valid(form)
#SousCritère
class SousCritereListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = SousCritere
    template_name = "audit/souscritere/souscritere_list.html"
    context_object_name = "souscriteres"
    ordering = ["id"]
    paginate_by = 7

    def paginate_queryset(self, queryset, page_size):
        from django.http import Http404
        try:
            return super().paginate_queryset(queryset, page_size)
        except Http404:
            self.kwargs[self.page_kwarg] = 'last'
            mutable_get = self.request.GET.copy()
            mutable_get[self.page_kwarg] = 'last'
            self.request.GET = mutable_get
            return super().paginate_queryset(queryset, page_size)
class SousCritereCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = SousCritere
    form_class = SousCritereStandaloneForm
    template_name = "audit/souscritere/souscritere_form.html"
    success_url = reverse_lazy("souscritere_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/souscritere/souscritere_form_modal.html"]
        return ["audit/souscritere/souscritere_form.html"]

    def form_valid(self, form):
        self.object = form.save()
        
        # Automatically inherit Type Audits from parent Critere
        if self.object.critere:
            parent_type_audits = self.object.critere.type_audit.all()
            for ta in parent_type_audits:
                SousCritereTypeAudit.objects.get_or_create(
                    sous_critere=self.object,
                    type_audit=ta,
                    defaults={'status': 'optionnel'}
                )

        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f"Le sous-critère a été créé avec succès."
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/souscritere/souscritere_form_modal.html", {'form': form})
        return super().form_invalid(form)


class SousCritereUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = SousCritere
    form_class = SousCritereStandaloneForm
    template_name = "audit/souscritere/souscritere_form.html"
    success_url = reverse_lazy("souscritere_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/souscritere/souscritere_form_modal.html"]
        return ["audit/souscritere/souscritere_form.html"]

    def form_valid(self, form):
        self.object = form.save()

        # Update inherited Type Audits from parent Critere
        if self.object.critere:
            parent_type_audits = list(self.object.critere.type_audit.all())
            # Remove ones that parent no longer has
            SousCritereTypeAudit.objects.filter(sous_critere=self.object).exclude(type_audit__in=parent_type_audits).delete()
            # Add new ones
            for ta in parent_type_audits:
                SousCritereTypeAudit.objects.get_or_create(
                    sous_critere=self.object,
                    type_audit=ta,
                    defaults={'status': 'optionnel'}
                )

        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': f"Le sous-critère a été mis à jour avec succès."
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/souscritere/souscritere_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)


class SousCritereDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = SousCritere
    template_name = "audit/souscritere/souscritere_confirm_delete.html"
    success_url = reverse_lazy("souscritere_list")
    
    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/souscritere/souscritere_delete_modal.html"]
        return ["audit/souscritere/souscritere_confirm_delete.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Sous-critère supprimé avec succès."})
            except ProtectedError:
                # Add specific error handling if it's protected
                error_msg = f"Impossible de supprimer le sous-critère car il possède des dépendances actives."
                return JsonResponse({'success': False, 'message': error_msg}, status=400)
        return super().form_valid(form)

#TypePreuve
class TypePreuveListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TypePreuve
    template_name = "audit/typepreuve/typepreuve_list.html"
    context_object_name = "types_preuve"
    ordering = ["id"]
    paginate_by = 7
class TypePreuveCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = TypePreuve
    form_class = TypePreuveForm
    template_name = "audit/typepreuve/typepreuve_form.html"
    success_url = reverse_lazy("typepreuve_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/typepreuve/typepreuve_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Le type de preuve a été créé avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/typepreuve/typepreuve_form_modal.html", {'form': form})
        return super().form_invalid(form)

class TypePreuveUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TypePreuve
    form_class = TypePreuveForm
    template_name = "audit/typepreuve/typepreuve_form.html"
    success_url = reverse_lazy("typepreuve_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/typepreuve/typepreuve_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Le type de preuve a été mis à jour avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/typepreuve/typepreuve_form_modal.html", {'form': form, 'object': self.object})
        return super().form_invalid(form)

class TypePreuveDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TypePreuve
    template_name = "audit/typepreuve/typepreuve_confirm_delete.html"
    success_url = reverse_lazy("typepreuve_list")

    def delete(self, request, *args, **kwargs):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = self.get_object()
            try:
                self.object.delete()
                return JsonResponse({'success': True})
            except ProtectedError:
                return JsonResponse({
                    'success': False,
                    'message': "Ce type de preuve ne peut pas être supprimé car il est utilisé ailleurs."
                }, status=400)
        return super().delete(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = self.get_object()
            return render(self.request, "audit/typepreuve/typepreuve_delete_modal.html", {'object': self.object})
        return super().get(request, *args, **kwargs)
# =====================================================
# LIST VIEW
# =====================================================

class PreuveAttenduListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = PreuveAttendu
    template_name = "org/preuveattendu/preuveattendu_list.html"
    context_object_name = "preuves"
    ordering = ["id"]
    paginate_by = 7
# =====================================================
# DETAIL VIEW
# =====================================================
class PreuveAttenduDetailView(LoginRequiredMixin, SuperuserRequiredMixin, DetailView):
    model = PreuveAttendu
    template_name = "org/preuveattendu/preuveattendu_detail.html"
    context_object_name = "preuve"
# =====================================================
# CREATE VIEW
# =====================================================
class PreuveAttenduCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = PreuveAttendu
    form_class = PreuveAttenduForm
    template_name = "org/preuveattendu/preuveattendu_form.html"
    success_url = reverse_lazy("preuveattendu_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/preuveattendu/preuveattendu_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "La preuve attendue a été créée avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/preuveattendu/preuveattendu_form_modal.html", {'form': form})
        return super().form_invalid(form)

class PreuveAttenduUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = PreuveAttendu
    form_class = PreuveAttenduForm
    template_name = "org/preuveattendu/preuveattendu_form.html"
    success_url = reverse_lazy("preuveattendu_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/preuveattendu/preuveattendu_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "La preuve attendue a été mise à jour avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/preuveattendu/preuveattendu_form_modal.html", {'form': form, 'object': self.object})
        return super().form_invalid(form)

class PreuveAttenduDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = PreuveAttendu
    template_name = "org/preuveattendu/preuveattendu_confirm_delete.html"
    success_url = reverse_lazy("preuveattendu_list")

    def delete(self, request, *args, **kwargs):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = self.get_object()
            try:
                self.object.delete()
                return JsonResponse({'success': True})
            except ProtectedError:
                return JsonResponse({
                    'success': False,
                    'message': "Cette preuve attendue ne peut pas être supprimée car elle est utilisée ailleurs."
                }, status=400)
        return super().delete(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = self.get_object()
            return render(self.request, "org/preuveattendu/preuveattendu_delete_modal.html", {'object': self.object})
        return super().get(request, *args, **kwargs)

# =====================================================
# TYPE COTATION VIEWS
# =====================================================

class TypeCotationListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TypeCotation
    template_name = "audit/typecotation/typecotation_list.html"
    context_object_name = "typecotations"
    ordering = ["id"]
    paginate_by = 7

class TypeCotationCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = TypeCotation
    fields = ["name"]
    template_name = "audit/typecotation/typecotation_form.html"
    success_url = reverse_lazy("typecotation_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/typecotation/typecotation_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': "Le type de cotation a été créé avec succès."
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/typecotation/typecotation_form_modal.html", {'form': form})
        return super().form_invalid(form)

class TypeCotationUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TypeCotation
    fields = ["name"]
    template_name = "audit/typecotation/typecotation_form.html"
    success_url = reverse_lazy("typecotation_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/typecotation/typecotation_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': "Le type de cotation a été mis à jour avec succès."
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/typecotation/typecotation_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)

class TypeCotationDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TypeCotation
    template_name = "audit/typecotation/typecotation_confirm_delete.html"
    success_url = reverse_lazy("typecotation_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/typecotation/typecotation_delete_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Type de cotation supprimé avec succès."})
            except ProtectedError:
                error_msg = "Impossible de supprimer ce type car il est lié à des cotations existantes."
                return JsonResponse({'success': False, 'message': error_msg}, status=400)
        return super().form_valid(form)

# =====================================================
# COTATION VIEWS
# =====================================================

class CotationListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Cotation
    template_name = "audit/cotation/cotation_list.html"
    context_object_name = "cotations"
    ordering = ["id"]
    paginate_by = 7

# =====================================================
# DETAIL VIEW
# =====================================================

class CotationDetailView(LoginRequiredMixin, SuperuserRequiredMixin, DetailView):
    model = Cotation
    template_name = "audit/cotation/cotation_detail.html"
    context_object_name = "cotation"

# =====================================================
# CREATE VIEW
# =====================================================

class CotationCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Cotation
    fields = [
        "valeur",
        "content",
        "code",
        "type_cotation",
    ]
    template_name = "audit/cotation/cotation_form.html"
    success_url = reverse_lazy("cotation_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/cotation/cotation_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': "La cotation a été créée avec succès."
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/cotation/cotation_form_modal.html", {'form': form})
        return super().form_invalid(form)

# =====================================================
# UPDATE VIEW
# =====================================================

class CotationUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Cotation
    fields = [
        "valeur",
        "content",
        "code",
        "type_cotation",
    ]
    template_name = "audit/cotation/cotation_form.html"
    success_url = reverse_lazy("cotation_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/cotation/cotation_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': "La cotation a été mise à jour avec succès."
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "audit/cotation/cotation_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)

# =====================================================
# DELETE VIEW
# =====================================================

class CotationDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Cotation
    template_name = "audit/cotation/cotation_confirm_delete.html"
    success_url = reverse_lazy("cotation_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["audit/cotation/cotation_delete_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Cotation supprimée avec succès."})
            except ProtectedError:
                error_msg = "Impossible de supprimer cette cotation car elle est utilisée dans des audits existants."
                return JsonResponse({'success': False, 'message': error_msg}, status=400)
        return super().form_valid(form)


# =====================================================
# CRUD - FORMULAIRE AUDIT
# =====================================================

class FormulaireAuditListView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, ListView):
    model = FormulaireAudit
    template_name = "audit/formulaire/formulaire_list.html"
    context_object_name = "formulaires"
    ordering = ["-id"]


class FormulaireAuditDetailView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, DetailView):
    model = FormulaireAudit
    template_name = "audit/formulaire/formulaire_detail.html"
    context_object_name = "formulaire"


class FormulaireAuditCreateView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, CreateView):
    model = FormulaireAudit
    form_class = FormulaireAuditForm
    template_name = "audit/formulaire/formulaire_form.html"
    success_url = reverse_lazy("formulaire_list")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['criteres'] = Critere.objects.all()
        # Ensure we always pass criteria and an empty selection for new forms
        context['selected_sc_ids'] = []
        context['is_edit'] = False
        return context

    def form_valid(self, form):
        with transaction.atomic():
            self.object = form.save()
            selected_sc_ids = self.request.POST.getlist('sous_criteres')
            if selected_sc_ids:
                for i, sc_id in enumerate(selected_sc_ids):
                    FormulaireSousCritere.objects.create(
                        formulaire=self.object,
                        sous_critere_id=sc_id,
                        ordre=i
                    )
        return redirect(self.success_url)

class FormulaireAuditUpdateView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, UpdateView):
    model = FormulaireAudit
    form_class = FormulaireAuditForm
    template_name = "audit/formulaire/formulaire_form.html"
    success_url = reverse_lazy("formulaire_list")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['criteres'] = Critere.objects.all()
        # Pass currently selected sub-criteria IDs for pre-checking
        context['selected_sc_ids'] = list(self.object.formulairesouscritere_set.values_list('sous_critere_id', flat=True))
        context['is_edit'] = True
        return context

    def form_valid(self, form):
        with transaction.atomic():
            self.object = form.save()
            # Refresh associations
            self.object.formulairesouscritere_set.all().delete()
            selected_sc_ids = self.request.POST.getlist('sous_criteres')
            if selected_sc_ids:
                for i, sc_id in enumerate(selected_sc_ids):
                    FormulaireSousCritere.objects.create(
                        formulaire=self.object,
                        sous_critere_id=sc_id,
                        ordre=i
                    )
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest' or self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'status': 'success'})
        return redirect(self.success_url)

    def form_invalid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest' or self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'status': 'error', 'message': 'Erreurs de validation', 'errors': form.errors})
        return super().form_invalid(form)

class FormulaireAuditDeleteView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, DeleteView):
    model = FormulaireAudit
    template_name = "audit/formulaire/formulaire_confirm_delete.html"
    success_url = reverse_lazy("formulaire_list")
class FormulaireSyncView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, View):
    def post(self, request, pk):
        formulaire = get_object_or_404(FormulaireAudit, pk=pk)

        # get all SousCritere linked to TypeAudit
        sous_criteres = SousCritere.objects.filter(
            type_audit=formulaire.type_audit
        )

        for sc in sous_criteres:
            FormulaireSousCritere.objects.get_or_create(
                formulaire=formulaire,
                sous_critere=sc,
                defaults={"ordre": 0}
            )

        return redirect("formulaire_detail", pk=formulaire.pk)
class FormulaireReorderView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, View):

    def post(self, request, pk):
        formulaire = get_object_or_404(FormulaireAudit, pk=pk)

        # Expecting list of IDs like: order[] = [12, 8, 15, 9]
        order = request.POST.getlist("order[]")

        # Only update items that belong to this formulaire
        queryset = FormulaireSousCritere.objects.filter(
            formulaire=formulaire
        )

        for index, fsc_id in enumerate(order):
            try:
                fsc = queryset.get(id=fsc_id)
                fsc.ordre = index + 1
                fsc.save(update_fields=["ordre"])
            except FormulaireSousCritere.DoesNotExist:
                continue

        return JsonResponse({"status": "success"})

class StartAuditView(LoginRequiredMixin, View):

    @transaction.atomic
    def post(self, request, pk):

        liste_audit = get_object_or_404(ListeAudit, pk=pk)

        # Permission check
        if not request.user.is_superuser and not liste_audit.affectation.filter(pk=request.user.pk).exists():
            return HttpResponseForbidden()

        # Prevent duplicate start
        existing = ResultatAudit.objects.filter(audit=liste_audit).first()
        if existing:
            return redirect("etape_audit", pk=existing.pk)

        # Create ResultatAudit
        resultat = ResultatAudit.objects.create(
            ref_audit=liste_audit.pk,
            audit=liste_audit,
            users=str(request.user),
            sujet=liste_audit.desc,
            auditeur=request.user,
            site=getattr(liste_audit, "site", None),
            en_cours=True
        )

        # Generate detail rows
        formulaire = liste_audit.formulaire_audit
        if not formulaire:
            # Handle case where no formulaire is attached to the audit
            return JsonResponse({"status": "error", "message": "Aucun formulaire associé à cet audit"}, status=400)

        sous_criteres = formulaire.formulairesouscritere_set.select_related(
            "sous_critere__critere",
            "sous_critere__critere__chapitre_norme",
            "sous_critere__critere__chapitre_norme__text_ref",
        )

        details = []

        for fs in sous_criteres:
            sc = fs.sous_critere

            details.append(
                DetailResultatAudit(
                    resultat_audit=resultat,
                    critere=sc.critere.name if sc.critere else "",
                    norme=sc.critere.chapitre_norme.text_ref.norme if sc.critere and sc.critere.chapitre_norme and sc.critere.chapitre_norme.text_ref else "",
                    sous_critere=sc.content,
                    chapitre_norme=sc.critere.chapitre_norme.name if sc.critere and sc.critere.chapitre_norme else "",
                    text_ref_url=sc.critere.chapitre_norme.text_ref.text_ref.content.url if sc.critere and sc.critere.chapitre_norme and sc.critere.chapitre_norme.text_ref and sc.critere.chapitre_norme.text_ref.text_ref and sc.critere.chapitre_norme.text_ref.text_ref.content else "",
                    value=0,
                    value_max=getattr(sc, 'valeur_max', 5),
                    cotation="",
                    cotation_option=[],
                )
            )

        DetailResultatAudit.objects.bulk_create(details)

        return redirect("etape_audit", pk=resultat.pk)


class EtapeAuditView(LoginRequiredMixin, DetailView):
    model = ResultatAudit
    template_name = "audit/resultataudit/etape_audit.html"
    context_object_name = "resultat"

    def get_queryset(self):
        qs = ResultatAudit.objects.select_related("audit", "auditeur")
        if self.request.user.is_superuser:
            return qs
        return qs.filter(auditeur=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["details"] = self.object.detailresultataudit_set.all().order_by('id')
        context["readonly"] = not self.object.en_cours
        
        # Fetch all available cotations for the wizard buttons
        context["cotations"] = Cotation.objects.all().order_by('-valeur')
        return context


class ResultatAuditDetailView(LoginRequiredMixin, DetailView):
    model = ResultatAudit
    template_name = "audit/resultataudit/resultat_detail.html"
    context_object_name = "resultat"

    def get_queryset(self):
        qs = ResultatAudit.objects.select_related("audit", "auditeur")

        if self.request.user.is_superuser:
            return qs

        return qs.filter(auditeur=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        resultat = self.get_object()
        resultat.recalculate_score()
        
        details = resultat.detailresultataudit_set.all().order_by('id')
        
        # Group by the 'critere' CharField (snapshot)
        groups = {}
        for d in details:
            crit_name = d.critere or "Sans Catégorie"
            if crit_name not in groups:
                groups[crit_name] = {
                    'name': crit_name,
                    'chapitre': d.chapitre_norme or "",
                    'details': [],
                    'percentages': []
                }
            groups[crit_name]['details'].append(d)
            if d.value >= 0: # Non N/A
                perc = d.value / d.value_max if d.value_max > 0 else 0
                groups[crit_name]['percentages'].append(perc)

        # Finalize grouping list with category scores
        grouped_results = []
        for crit_name, data in groups.items():
            category_score = (sum(data['values']) / len(data['values'])) if data['values'] else 0
            grouped_results.append({
                'critere': {'text_ref': data['name'], 'chapitre_norme': {'text_ref': data['chapitre']}},
                'details': data['details'],
                'score': round(category_score, 1)
            })

        context["grouped_results"] = grouped_results
        context["nb_criteres"] = len(grouped_results)
        context["readonly"] = not resultat.en_cours
        return context

class DetailResultatAuditUpdateView(LoginRequiredMixin, View):

    def post(self, request, pk):

        detail = get_object_or_404(DetailResultatAudit, pk=pk)
        resultat = detail.resultat_audit

        if not resultat.en_cours:
            return HttpResponseForbidden()

        if not request.user.is_superuser and resultat.auditeur != request.user:
            return HttpResponseForbidden()

        detail.commentaire = request.POST.get("commentaire", "")
        detail.cotation = request.POST.get("cotation", "")
        detail.code = request.POST.get("code", "")

        try:
            detail.value = float(request.POST.get("value", 0))
        except ValueError:
            detail.value = 0

        if request.FILES.get("justificatif"):
            detail.justificatif = request.FILES.get("justificatif")

        if request.FILES.get("justificatif_bis"):
            detail.justificatif_bis = request.FILES.get("justificatif_bis")

        detail.save()
        
        # Explicitly recalculate result score in the view
        resultat.recalculate_score()

        # Calculate category score for the updated detail's critere (average of percentages)
        crit_name = detail.critere
        cat_details = DetailResultatAudit.objects.filter(resultat_audit=resultat, critere=crit_name)
        percentages = []
        for d in cat_details:
            if d.value >= 0:
                percentages.append(d.value)
        category_score = (sum(percentages) / len(percentages)) if percentages else 0

        from django.utils.text import slugify

        return JsonResponse({
            "status": "saved",
            "score": round(float(resultat.score_audit), 1),
            "category_id": slugify(crit_name),
            "category_score": round(category_score, 1)
        })



class CloseAuditView(LoginRequiredMixin, View):

    def post(self, request, pk):
        resultat = get_object_or_404(ResultatAudit, pk=pk)

        if not request.user.is_superuser and resultat.auditeur != request.user:
            return HttpResponseForbidden()

        resultat.en_cours = False
        resultat.recalculate_score()
        resultat.save(update_fields=["en_cours", "score_audit"])

        return redirect("resultat_report", pk=resultat.pk)


class FinishAuditView(LoginRequiredMixin, View):
    """
    Directly finishes an audit.
    If 'en_cours', it marks the existing ResultatAudit as finished.
    If 'planifie', it creates a new ResultatAudit and marks it as finished.
    """
    @transaction.atomic
    def post(self, request, pk):
        liste_audit = get_object_or_404(ListeAudit, pk=pk)
        
        if not request.user.is_superuser and not liste_audit.affectation.filter(pk=request.user.pk).exists():
            return HttpResponseForbidden()
        resultat = ResultatAudit.objects.filter(audit=liste_audit).first()

        if not resultat:
            # Create new ResultatAudit for planned audit
            resultat = ResultatAudit.objects.create(
                ref_audit=liste_audit.pk,
                audit=liste_audit,
                users=str(request.user),
                sujet=liste_audit.desc,
                auditeur=request.user,
                site=getattr(liste_audit, "site", None),
                en_cours=False
            )

            # Generate detail rows (matching StartAuditView logic)
            formulaire = liste_audit.formulaire_audit
            if formulaire:
                sous_criteres = formulaire.formulairesouscritere_set.select_related(
                    "sous_critere",
                    "sous_critere__critere",
                    "sous_critere__critere__chapitre_norme",
                    "sous_critere__critere__chapitre_norme__text_ref",
                )

                details = []
                for fs in sous_criteres:
                    sc = fs.sous_critere
                    details.append(
                        DetailResultatAudit(
                            resultat_audit=resultat,
                            critere=sc.critere.name if sc.critere else "",
                            norme=sc.critere.chapitre_norme.text_ref.norme if sc.critere and sc.critere.chapitre_norme and sc.critere.chapitre_norme.text_ref else "",
                            sous_critere=sc.content,
                            chapitre_norme=sc.critere.chapitre_norme.name if sc.critere and sc.critere.chapitre_norme else "",
                            text_ref_url=sc.critere.chapitre_norme.text_ref.text_ref.content.url if sc.critere and sc.critere.chapitre_norme and sc.critere.chapitre_norme.text_ref and sc.critere.chapitre_norme.text_ref.text_ref and sc.critere.chapitre_norme.text_ref.text_ref.content else "",
                            value=0,
                            value_max=sc.valeur_max if hasattr(sc, 'valeur_max') else 5, # Fallback to 5
                            cotation="",
                            cotation_option=[],
                        )
                    )
                DetailResultatAudit.objects.bulk_create(details)
        else:
            # Mark existing as finished
            resultat.en_cours = False
            resultat.save(update_fields=["en_cours"])

        return redirect("liste_audit_list")

class ResultatAuditListView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, ListView):
    model = ResultatAudit
    template_name = "audit/resultataudit/resultat_list.html"
    context_object_name = "resultats"
    paginate_by = 20

    def get_queryset(self):
        qs = ResultatAudit.objects.select_related(
            "audit", "auditeur"
        ).order_by("-date_audit")

        if self.request.user.is_superuser:
            return qs

        return qs.filter(auditeur=self.request.user)
class ResultatAuditReportView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, DetailView):
    model = ResultatAudit
    template_name = "audit/resultataudit/resultat_report.html"
    context_object_name = "resultat"

    def get_queryset(self):
        qs = ResultatAudit.objects.select_related("audit", "auditeur")
        if self.request.user.is_superuser:
            return qs

        return qs.filter(auditeur=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        resultat = self.object
        # Ensure score is recalculated for the report
        resultat.recalculate_score()
        
        details = resultat.detailresultataudit_set.all().order_by('id')
        
        # Same grouping logic as detail view using CharField snapshot
        groups = {}
        for d in details:
            crit_name = d.critere or "Sans Catégorie"
            if crit_name not in groups:
                groups[crit_name] = {
                    'name': crit_name,
                    'chapitre': d.chapitre_norme or "",
                    'details': [],
                    'values': []
                }
            groups[crit_name]['details'].append(d)
            if d.value >= 0:
                groups[crit_name]['values'].append(d.value)

        grouped_results = []
        for crit_name, data in groups.items():
            category_score = (sum(data['values']) / len(data['values'])) if data['values'] else 0
            grouped_results.append({
                'critere': {'text_ref': data['name'], 'chapitre_norme': {'text_ref': data['chapitre']}},
                'details': data['details'],
                'score': round(category_score, 1)
            })

        context["grouped_results"] = grouped_results
        context["nb_criteres"] = len(grouped_results)
        context["readonly"] = True
        return context

# =====================================================
# USER MANAGEMENT
# =====================================================

class AdminRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser

class UserListView(LoginRequiredMixin, AdminRequiredMixin, ListView):
    model = User
    template_name = "users/user_list.html"
    context_object_name = "users"
    ordering = ["-is_superuser", "username"]

class UserCreateView(LoginRequiredMixin, AdminRequiredMixin, CreateView):
    model = User
    form_class = UserCreateForm
    template_name = "users/user_form.html"
    success_url = reverse_lazy("user_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["users/user_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        user = form.save(commit=False)
        user.set_password(form.cleaned_data["password"])
        
        role = form.cleaned_data.get('role')
        if role == 'admin':
            user.is_superuser = True
            user.is_staff = True
        else:
            user.is_superuser = False
            user.is_staff = False
            
        user.save()
        
        # Manage groups
        user.groups.clear()
        if role == 'auditeur':
            group = Group.objects.get(name='Auditeur')
            user.groups.add(group)
        elif role == 'participant':
            group = Group.objects.get(name='Participant')
            user.groups.add(group)
            
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': "L'utilisateur a été créé avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "users/user_form_modal.html", {'form': form})
        return super().form_invalid(form)

class UserUpdateView(LoginRequiredMixin, AdminRequiredMixin, UpdateView):
    model = User
    form_class = UserForm
    template_name = "users/user_form.html"
    success_url = reverse_lazy("user_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["users/user_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        user = form.save(commit=False)
        role = form.cleaned_data.get('role')
        
        # Handle password update if provided
        new_password = form.cleaned_data.get("password")
        if new_password:
            user.set_password(new_password)
            
        if role == 'admin':
            user.is_superuser = True
            user.is_staff = True
        else:
            user.is_superuser = False
            user.is_staff = False
            
        user.save()
        
        # Manage groups
        user.groups.clear()
        if role == 'auditeur':
            group = Group.objects.get(name='Auditeur')
            user.groups.add(group)
        elif role == 'participant':
            group = Group.objects.get(name='Participant')
            user.groups.add(group)
            
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': "L'utilisateur a été mis à jour avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "users/user_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)

class UserDeleteView(LoginRequiredMixin, AdminRequiredMixin, DeleteView):
    model = User
    template_name = "users/user_confirm_delete.html"
    success_url = reverse_lazy("user_list")

# Profile Views
class UserProfileView(LoginRequiredMixin, TemplateView):
    template_name = "users/profile.html"

class UserPasswordChangeView(LoginRequiredMixin, SuccessMessageMixin, PasswordChangeView):
    template_name = "users/password_change.html"
    success_url = reverse_lazy("user_profile")
    success_message = "Votre mot de passe a été modifié avec succès."

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["users/password_change_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            form.save()
            return JsonResponse({'success': True, 'message': self.success_message})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "users/password_change_modal.html", {'form': form})
        return super().form_invalid(form)

class ListeAuditListView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, ListView):
    model = ListeAudit
    template_name = "audit/listeaudit/liste_audit_list.html"
    context_object_name = "audits"
    paginate_by = 20

    def get_paginate_by(self, queryset):
        user_agent = self.request.META.get('HTTP_USER_AGENT', '').lower()
        if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
            return 4
        return self.paginate_by

    def get_queryset(self):
        qs = ListeAudit.objects.select_related(
            "section", "formulaire_audit"
        ).prefetch_related("affectation").order_by("-id")

        if self.request.user.is_superuser:
            base_qs = qs
        else:
            # Auditeur or Participant → only assigned audits
            from django.db.models import Q
            base_qs = qs.filter(Q(affectation=self.request.user) | Q(participants=self.request.user))
        
        # Apply filters
        status_filter = self.request.GET.get('status', 'all')
        
        # Consistent with models.py get_audit_status()
        if status_filter == 'planifie':
            # Audits without any ResultatAudit
            return base_qs.exclude(resultataudit__isnull=False)
        elif status_filter == 'en_cours':
            # Audits with at least one active ResultatAudit
            return base_qs.filter(resultataudit__en_cours=True).distinct()
        elif status_filter == 'termine':
            # Audits with ResultatAudit that are NOT en_cours 
            # (and no active ones to avoid double counting if that's possible, 
            # though usually it's 1:1)
            return base_qs.filter(resultataudit__en_cours=False).exclude(resultataudit__en_cours=True).distinct()
        
        # Final sort by ID ascending (oldest first)
        return base_qs.order_by("id")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['current_filter'] = self.request.GET.get('status', 'all')
        return context

class ListeAuditDetailView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, DetailView):
    model = ListeAudit
    template_name = "audit/listeaudit/liste_audit_detail.html"
    context_object_name = "audit"

    def get_queryset(self):
        if self.request.user.is_superuser:
            return ListeAudit.objects.all()

        from django.db.models import Q
        return ListeAudit.objects.filter(Q(affectation=self.request.user) | Q(participants=self.request.user))
class ListeAuditCreateView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, CreateView):
    model = ListeAudit
    fields = [
        "desc",
        "status",
        "section",
        "formulaire_audit",
        "date",
        "affectation",
        "participants",
    ]
    template_name = "audit/listeaudit/liste_audit_form.html"
    success_url = reverse_lazy("liste_audit_list")

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        from django.contrib.auth.models import Group
        
        # Filter auditors
        try:
            auditeur_group = Group.objects.get(name='Auditeur')
            form.fields['affectation'].queryset = auditeur_group.user_set.all()
        except Group.DoesNotExist:
            form.fields['affectation'].queryset = User.objects.filter(is_superuser=False)
            
        # Filter participants
        try:
            participant_group = Group.objects.get(name='Participant')
            form.fields['participants'].queryset = participant_group.user_set.all()
        except Group.DoesNotExist:
            # Fallback to empty if groups not set up
            form.fields['participants'].queryset = User.objects.none()
            
        return form

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['processus_list'] = Processus.objects.all()
        context['types_audit_list'] = TypeAudit.objects.all()
        context['types_equipement_list'] = TypeEquipement.objects.all()
        context['sections_list'] = Section.objects.all()
        context['type_cotations'] = TypeCotation.objects.all()
        context['preuves_attendues'] = PreuveAttendu.objects.all()
        context['chapitres_list'] = ChapitreNorme.objects.all()
        context['critere_formset'] = CritereFormSet(prefix='critere')
        return context

    @transaction.atomic
    def form_valid(self, form):
        print("POST:", self.request.POST)
        print(f"DEBUG: form_valid called for {self.__class__.__name__}")

        # 1. Handle New Formulaire Creation if requested
        new_name = self.request.POST.get('new_name')
        if new_name:
            processus_id = self.request.POST.get('new_processus')
            type_audit_id = self.request.POST.get('new_type_audit')
            type_equipement_id = self.request.POST.get('new_type_equipement')
            section_ids = self.request.POST.getlist('new_sections[]')

            new_formulaire = FormulaireAudit.objects.create(
                name=new_name,
                processus_id=processus_id if processus_id else None,
                type_audit_id=type_audit_id if type_audit_id else None,
                type_equipement_id=type_equipement_id if type_equipement_id else None
            )
            if section_ids:
                new_formulaire.section.set(Section.objects.filter(id__in=section_ids))
            
            # Set this new formulaire to the audit instance
            form.instance.formulaire_audit = new_formulaire

            # ✅ MANUAL PARSING OF NESTED POST DATA (CRITICAL FIX)
            print("DEBUG: STARTING MANUAL PARSING (CREATE)")
            i = 0
            while True:
                critere_name = self.request.POST.get(f'critere-{i}-name')
                if not critere_name:
                    break  # No more criteria

                chapitre_id = self.request.POST.get(f'critere-{i}-chapitre_norme')
                
                # Create the Critere linked to the new Formulaire
                critere = Critere.objects.create(
                    name=critere_name,
                    chapitre_norme_id=chapitre_id if chapitre_id else None,
                    formulaire=new_formulaire
                )
                print(f"DEBUG: CREATED CRITERE {i}: {critere_name}")

                j = 0
                while True:
                    sc_content = self.request.POST.get(f'critere-{i}-souscritere-{j}-content')
                    if not sc_content:
                        break  # No more sub-criteria

                    type_cotation = self.request.POST.get(f'critere-{i}-souscritere-{j}-type_cotation')
                    reaction = self.request.POST.get(f'critere-{i}-souscritere-{j}-reaction')

                    # Create the SousCritere linked to the Critere
                    sc = SousCritere.objects.create(
                        critere=critere,
                        content=sc_content,
                        type_cotation_id=type_cotation if type_cotation else None,
                        reaction=reaction
                    )

                    # Link to Formulaire
                    FormulaireSousCritere.objects.create(
                        formulaire=new_formulaire,
                        sous_critere=sc,
                        ordre=j
                    )
                    
                    # Handle M2M fields
                    preuves_ids = self.request.POST.getlist(f'critere-{i}-souscritere-{j}-preuve_attendu')
                    if preuves_ids:
                        sc.preuve_attendu.set(preuves_ids)
                    
                    types_audit_ids = self.request.POST.getlist(f'critere-{i}-souscritere-{j}-type_audit')
                    if types_audit_ids:
                        for ta_id in types_audit_ids:
                            SousCritereTypeAudit.objects.create(sous_critere=sc, type_audit_id=ta_id)

                    print(f"DEBUG: CREATED SOUSCRITERE {i}-{j}: {sc_content}")
                    j += 1
                i += 1

        # Save the audit instance
        self.object = form.save()
        return redirect(self.get_success_url())


    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return HttpResponseForbidden()
        return super().dispatch(request, *args, **kwargs)

class ListeAuditDeleteView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, DeleteView):
    model = ListeAudit
    template_name = "audit/listeaudit/liste_audit_confirm_delete.html"
    success_url = reverse_lazy("liste_audit_list")

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return HttpResponseForbidden()
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        # We can also use AJAX if needed, but a standard DeleteView works 
        # as long as we use a form in the template or a direct POST.
        return self.delete(request, *args, **kwargs)

class ListeAuditUpdateView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, UpdateView):
    model = ListeAudit
    fields = [
        "desc",
        "status",
        "section",
        "formulaire_audit",
        "date",
        "affectation",
        "participants",
    ]
    template_name = "audit/listeaudit/liste_audit_form.html"
    success_url = reverse_lazy("liste_audit_list")

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        from django.contrib.auth.models import Group
        
        # Filter auditors
        try:
            auditeur_group = Group.objects.get(name='Auditeur')
            form.fields['affectation'].queryset = auditeur_group.user_set.all()
        except Group.DoesNotExist:
            form.fields['affectation'].queryset = User.objects.filter(is_superuser=False)
            
        # Filter participants
        try:
            participant_group = Group.objects.get(name='Participant')
            form.fields['participants'].queryset = participant_group.user_set.all()
        except Group.DoesNotExist:
            form.fields['participants'].queryset = User.objects.none()
            
        return form

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['processus_list'] = Processus.objects.all()
        context['types_audit_list'] = TypeAudit.objects.all()
        context['types_equipement_list'] = TypeEquipement.objects.all()
        context['sections_list'] = Section.objects.all()
        context['type_cotations'] = TypeCotation.objects.all()
        context['preuves_attendues'] = PreuveAttendu.objects.all()
        context['chapitres_list'] = ChapitreNorme.objects.all()
        context['critere_formset'] = CritereFormSet(prefix='critere')
        return context

    @transaction.atomic
    def form_valid(self, form):
        print("POST:", self.request.POST)

        # 1. Handle New Formulaire Creation if requested
        new_name = self.request.POST.get('new_name')
        if new_name:
            processus_id = self.request.POST.get('new_processus')
            type_audit_id = self.request.POST.get('new_type_audit')
            type_equipement_id = self.request.POST.get('new_type_equipement')
            section_ids = self.request.POST.getlist('new_sections[]')

            new_formulaire = FormulaireAudit.objects.create(
                name=new_name,
                processus_id=processus_id if processus_id else None,
                type_audit_id=type_audit_id if type_audit_id else None,
                type_equipement_id=type_equipement_id if type_equipement_id else None
            )
            if section_ids:
                new_formulaire.section.set(Section.objects.filter(id__in=section_ids))
            
            # Set this new formulaire to the audit instance
            form.instance.formulaire_audit = new_formulaire

            # ✅ MANUAL PARSING OF NESTED POST DATA (CRITICAL FIX)
            print("DEBUG: STARTING MANUAL PARSING (UPDATE)")
            i = 0
            while True:
                critere_name = self.request.POST.get(f'critere-{i}-name')
                if not critere_name:
                    break  # No more criteria

                chapitre_id = self.request.POST.get(f'critere-{i}-chapitre_norme')
                
                # Create the Critere linked to the new Formulaire
                critere = Critere.objects.create(
                    name=critere_name,
                    chapitre_norme_id=chapitre_id if chapitre_id else None,
                    formulaire=new_formulaire
                )
                print(f"DEBUG: CREATED CRITERE {i}: {critere_name}")

                j = 0
                while True:
                    sc_content = self.request.POST.get(f'critere-{i}-souscritere-{j}-content')
                    if not sc_content:
                        break  # No more sub-criteria

                    type_cotation = self.request.POST.get(f'critere-{i}-souscritere-{j}-type_cotation')
                    reaction = self.request.POST.get(f'critere-{i}-souscritere-{j}-reaction')

                    # Create the SousCritere linked to the Critere
                    sc = SousCritere.objects.create(
                        critere=critere,
                        content=sc_content,
                        type_cotation_id=type_cotation if type_cotation else None,
                        reaction=reaction
                    )

                    # Link to Formulaire
                    FormulaireSousCritere.objects.create(
                        formulaire=new_formulaire,
                        sous_critere=sc,
                        ordre=j
                    )
                    
                    # Handle M2M fields
                    preuves_ids = self.request.POST.getlist(f'critere-{i}-souscritere-{j}-preuve_attendu')
                    if preuves_ids:
                        sc.preuve_attendu.set(preuves_ids)
                    
                    types_audit_ids = self.request.POST.getlist(f'critere-{i}-souscritere-{j}-type_audit')
                    if types_audit_ids:
                        for ta_id in types_audit_ids:
                            SousCritereTypeAudit.objects.create(sous_critere=sc, type_audit_id=ta_id)

                    print(f"DEBUG: CREATED SOUSCRITERE {i}-{j}: {sc_content}")
                    j += 1
                i += 1

        # Save the audit instance
        self.object = form.save()
        return redirect(self.get_success_url())


    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return HttpResponseForbidden()
        return super().dispatch(request, *args, **kwargs)

def get_sous_criteres(request):
    type_id = request.GET.get('type_id')
    if not type_id:
        return JsonResponse([], safe=False)
    
    sous_criteres = SousCritere.objects.filter(type_audit=type_id).select_related('critere')

    data = [
        {
            "id": sc.id,
            "content": sc.content,
            "critere_id": sc.critere_id
        }
        for sc in sous_criteres
    ]

    return JsonResponse(data, safe=False)

def get_structure(request):
    try:
        type_id = request.GET.get('type_audit_id')
        if not type_id:
            return JsonResponse([], safe=False)

        # Get all criteria
        criteres = Critere.objects.all().select_related('chapitre_norme__text_ref')
        
        # Get sous-critères for this type audit
        # This handles the filter carefully
        sous_criteres = SousCritere.objects.filter(type_audit=type_id)

        result = []
        for critere in criteres:
            sc_list = sous_criteres.filter(critere=critere)
            
            result.append({
                "critere_id": critere.id,
                "critere_nom": critere.name,
                "norme": critere.chapitre_norme.text_ref.norme if critere.chapitre_norme and critere.chapitre_norme.text_ref else "Aucune",
                "chapitre": critere.chapitre_norme.name if critere.chapitre_norme else "Aucun",
                "sous_criteres": [
                    {
                        "id": sc.id,
                        "nom": sc.content
                    }
                    for sc in sc_list
                ]
            })

        return JsonResponse(result, safe=False)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def get_formulaire_structure(request):
    """AJAX: Return grouped critères and sous-critères for a FormulaireAudit."""
    formulaire_id = request.GET.get('formulaire_id')
    if not formulaire_id:
        return JsonResponse([], safe=False)

    try:
        formulaire = FormulaireAudit.objects.get(pk=formulaire_id)
    except FormulaireAudit.DoesNotExist:
        return JsonResponse({"error": "Formulaire not found"}, status=404)

    # Group sous-critères by their parent critère
    fsc_qs = (
        FormulaireSousCritere.objects
        .filter(formulaire=formulaire)
        .select_related('sous_critere__critere__chapitre_norme__text_ref')
        .order_by('sous_critere__critere__name', 'ordre')
    )

    grouped = {}
    for fsc in fsc_qs:
        sc = fsc.sous_critere
        crit = sc.critere
        key = crit.id
        if key not in grouped:
            grouped[key] = {
                "critere_id": crit.id,
                "critere_nom": crit.name,
                "chapitre": crit.chapitre_norme.name if crit.chapitre_norme else "N/A",
                "norme": crit.chapitre_norme.text_ref.norme if crit.chapitre_norme and crit.chapitre_norme.text_ref else "N/A",
                "sous_criteres": []
            }
        grouped[key]["sous_criteres"].append({
            "id": sc.id,
            "nom": sc.content,
        })

    return JsonResponse({
        "type_audit_id": formulaire.type_audit_id if formulaire.type_audit else None,
        "criteres": list(grouped.values())
    }, safe=False)

@transaction.atomic
def quick_create_formulaire(request):
    """AJAX view to quickly create a FULL FormulaireAudit from the audit form."""
    if not request.user.is_superuser:
        return JsonResponse({"status": "error", "message": "Permission denied"}, status=403)
    
    if request.method == "POST":
        name = request.POST.get("name")
        processus_id = request.POST.get("processus")
        type_audit_id = request.POST.get("type_audit")
        type_equipement_id = request.POST.get("type_equipement")
        section_ids = request.POST.getlist("sections[]") # ManyToMany
        sous_critere_ids = request.POST.getlist("sous_criteres[]") # Specific selections from sync
        
        if not name:
            return JsonResponse({"status": "error", "message": "Le nom est obligatoire"}, status=400)
        
        new_sous_criteres_json = request.POST.get("new_sous_criteres")
        print(f"DEBUG: new_sous_criteres_json = {new_sous_criteres_json}")  # Debug line

        try:
            from Organisation.models import Processus, TypeEquipement, Section
            
            # Create the object
            formulaire = FormulaireAudit.objects.create(
                name=name,
                processus_id=processus_id if processus_id else None,
                type_audit_id=type_audit_id if type_audit_id else None,
                type_equipement_id=type_equipement_id if type_equipement_id else None
            )
            
            # Set ManyToMany sections
            if section_ids:
                formulaire.section.set(Section.objects.filter(id__in=section_ids))

            # Handle Structure Sync/Custom Selection
            if sous_critere_ids or new_sous_criteres_json:
                
                # 1. Existing sub-criteria
                if sous_critere_ids:
                    for sc_id in sous_critere_ids:
                        FormulaireSousCritere.objects.create(
                            formulaire=formulaire,
                            sous_critere_id=sc_id
                        )
                
                # 2. New ad-hoc sub-criteria (JSON)
                if new_sous_criteres_json:
                    import json
                    try:
                        new_items = json.loads(new_sous_criteres_json)
                        print(f"DEBUG: Parsed {len(new_items)} new sous-criteres")  # Debug line
                        created_criteres = {} # Temp cache for new criteria in this session
                        
                        for item in new_items:
                            crit_id = item.get('crit_id')
                            is_new_crit = item.get('is_new_crit')
                            
                            real_crit_id = None
                            if is_new_crit and crit_id:
                                if crit_id in created_criteres:
                                    real_crit_id = created_criteres[crit_id]
                                else:
                                    # Create a brand new Criterion (Fixed field name to 'name')
                                    new_c = Critere.objects.create(
                                        name=item.get('crit_name') or "Nouveau Critère",
                                        chapitre_norme_id=item.get('chapitre_id') if item.get('chapitre_id') else None
                                    )
                                    created_criteres[crit_id] = new_c.id
                                    real_crit_id = new_c.id
                            else:
                                real_crit_id = crit_id

                            # Create the SousCritere
                            new_sc = SousCritere.objects.create(
                                content=item.get('content') or item.get('name'),
                                critere_id=real_crit_id,
                                reaction=item.get('reaction'),
                                type_cotation_id=item.get('type_cotation') if item.get('type_cotation') else None
                            )
                            
                            # Handle M2M: types_audit through SousCritereTypeAudit
                            types_audit_ids = item.get('types_audit')
                            if types_audit_ids:
                                for ta_id in types_audit_ids:
                                    SousCritereTypeAudit.objects.create(
                                        sous_critere=new_sc,
                                        type_audit_id=ta_id
                                    )
                            
                            # Handle M2M: preuve_attendu
                            preuve_ids = item.get('preuves')
                            if preuve_ids:
                                new_sc.preuve_attendu.set(preuve_ids)

                            # Link it to the formulaire
                            FormulaireSousCritere.objects.create(
                                formulaire=formulaire,
                                sous_critere=new_sc
                            )
                    except Exception as e:
                        print(f"Error parsing new_sous_criteres: {e}")
            
            elif type_audit_id:
                # Default: Sync everything for this type audit
                formulaire.sync_sous_criteres_from_type_audit()
            return JsonResponse({
                "status": "success",
                "id": formulaire.id,
                "name": formulaire.name
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

@transaction.atomic
def save_sous_critere_inline(request):
    """AJAX view to save a single SousCritere linked to an existing Critere."""
    if not request.user.is_superuser:
        return JsonResponse({"status": "error", "message": "Permission denied"}, status=403)

    if request.method == "POST":
        critere_id = request.POST.get("critere_id") or request.POST.get("critere")
        content = request.POST.get("content")
        type_cotation_id = request.POST.get("type_cotation")
        reaction = request.POST.get("reaction")
        type_audit_ids = request.POST.getlist("types_audit[]") or request.POST.getlist("type_audit")
        preuve_ids = request.POST.getlist("preuves[]") or request.POST.getlist("preuve_attendu")

        if not critere_id or not content:
            return JsonResponse({"status": "error", "message": "Données manquantes"}, status=400)

        try:
            
            sc = SousCritere.objects.create(
                critere_id=critere_id,
                content=content,
                type_cotation_id=type_cotation_id if type_cotation_id else None,
                reaction=reaction
            )

            if type_audit_ids:
                for ta_id in type_audit_ids:
                    SousCritereTypeAudit.objects.create(sous_critere=sc, type_audit_id=ta_id)
            
            if preuve_ids:
                sc.preuve_attendu.set(preuve_ids)

            return JsonResponse({
                "status": "success",
                "id": sc.id,
                "nom": sc.content
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

@transaction.atomic
def save_critere_inline(request):
    """AJAX view to save a single Critere and its SousCriteres independently."""
    if not request.user.is_superuser:
        return JsonResponse({"status": "error", "message": "Permission denied"}, status=403)

    if request.method == "POST":
        name = request.POST.get("name")
        chapitre_id = request.POST.get("chapitre_id") or request.POST.get("chapitre_norme")
        type_audit_id = request.POST.get("type_audit_id")
        sous_criteres_json = request.POST.get("sous_criteres")

        if not name:
            return JsonResponse({"status": "error", "message": "Le nom du critère est obligatoire"}, status=400)

        try:
            import json

            # 1. Create the Critere
            critere = Critere.objects.create(
                name=name,
                chapitre_norme_id=chapitre_id if chapitre_id else None
            )

            created_sc = []
            # 2. Add Sub-criteria
            if sous_criteres_json:
                sc_data = json.loads(sous_criteres_json)
                for item in sc_data:
                    sc = SousCritere.objects.create(
                        critere=critere,
                        content=item.get('content'),
                        type_cotation_id=item.get('type_cotation') if item.get('type_cotation') else None,
                        reaction=item.get('reaction')
                    )

                    # Handle ManyToMany Mappings
                    if type_audit_id:
                        SousCritereTypeAudit.objects.create(sous_critere=sc, type_audit_id=type_audit_id)
                    
                    if item.get('preuves'):
                        sc.preuve_attendu.set(item.get('preuves'))

                    created_sc.append({
                        "id": sc.id,
                        "nom": sc.content
                    })

            return JsonResponse({
                "status": "success",
                "critere_id": critere.id,
                "critere_name": critere.name,
                "sous_criteres": created_sc
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)


@transaction.atomic
def update_critere_inline(request, pk):
    """AJAX view to update a single Critere."""
    if not request.user.is_superuser:
        return JsonResponse({"status": "error", "message": "Permission denied"}, status=403)
    if request.method == "POST":
        try:
            critere = Critere.objects.get(pk=pk)
            name = request.POST.get("name")
            chapitre_id = request.POST.get("chapitre_id") or request.POST.get("chapitre_norme")
            if name:
                critere.name = name
            if chapitre_id:
                critere.chapitre_norme_id = chapitre_id
            critere.save()
            return JsonResponse({"status": "success", "id": critere.id, "name": critere.name})
        except Critere.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Critère not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)


@transaction.atomic
def update_sous_critere_inline(request, pk):
    """AJAX view to update a single SousCritere."""
    if not request.user.is_superuser:
        return JsonResponse({"status": "error", "message": "Permission denied"}, status=403)
    if request.method == "POST":
        try:
            sc = SousCritere.objects.get(pk=pk)
            content = request.POST.get("content")
            type_cotation_id = request.POST.get("type_cotation")
            reaction = request.POST.get("reaction")
            type_audit_ids = request.POST.getlist("types_audit[]") or request.POST.getlist("type_audit")
            preuve_ids = request.POST.getlist("preuves[]") or request.POST.getlist("preuve_attendu")
            
            if content:
                sc.content = content
            if type_cotation_id:
                sc.type_cotation_id = type_cotation_id
            if reaction is not None:
                sc.reaction = reaction
            sc.save()

            if type_audit_ids:
                SousCritereTypeAudit.objects.filter(sous_critere=sc).delete()
                for ta_id in type_audit_ids:
                    SousCritereTypeAudit.objects.create(sous_critere=sc, type_audit_id=ta_id)
            
            if preuve_ids:
                sc.preuve_attendu.set(preuve_ids)

            return JsonResponse({"status": "success", "id": sc.id, "content": sc.content})
        except SousCritere.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Sous-critère not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@transaction.atomic
def copy_formulaire(request, pk):
    """
    AJAX view to create a deep copy of a FormulaireAudit.
    Duplicates Formulaire -> Criteres -> SousCriteres while keeping order.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"status": "error", "message": "Authentication required"}, status=401)
    
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

    original_form = get_object_or_404(FormulaireAudit, pk=pk)
    
    try:
        # 1. Determine the new name
        import re
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

        # 2. Duplicate the FormulaireAudit
        new_form = FormulaireAudit.objects.get(pk=original_form.pk)
        new_form.pk = None
        new_form.name = new_nom
        new_form.save()
        
        # Copy M2M sections
        new_form.section.set(original_form.section.all())
        
        # 3. Deep Copy Structure: Criteres -> SousCriteres
        # Instead of original_form.criteres.all(), we use FormulaireSousCritere 
        # because criteria might not be directly linked via FK to the form.
        fsc_associations = FormulaireSousCritere.objects.filter(formulaire=original_form).order_by('ordre')
        
        # Keep track of cloned criteria to avoid redundant copies
        # Map: original_critere_id -> cloned_critere_object
        critere_map = {}

        for assoc in fsc_associations:
            old_sc = assoc.sous_critere
            old_crit = old_sc.critere
            
            # Get or Create the cloned Criterion for this new Form
            if old_crit.id not in critere_map:
                new_crit = Critere.objects.get(pk=old_crit.pk)
                new_crit.pk = None
                new_crit.formulaire = new_form # Link to new form
                new_crit.save()
                critere_map[old_crit.id] = new_crit
            else:
                new_crit = critere_map[old_crit.id]
            
            # Duplicate the SousCritere and link to the NEW Criterion
            new_sc = SousCritere.objects.get(pk=old_sc.pk)
            new_sc.pk = None
            new_sc.critere = new_crit
            new_sc.save()
            
            # Copy M2M relations of SousCritere
            new_sc.preuve_attendu.set(old_sc.preuve_attendu.all())
            if hasattr(old_sc, 'type_audit'):
                new_sc.type_audit.set(old_sc.type_audit.all())
            
            # Create the association in the new form
            FormulaireSousCritere.objects.create(
                formulaire=new_form,
                sous_critere=new_sc,
                ordre=assoc.ordre
            )
        
        return JsonResponse({
            "status": "success", 
            "message": f"Modèle '{original_form.name}' copié avec succès.",
            "new_id": new_form.id,
            "new_name": new_form.name
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@transaction.atomic
def delete_critere_inline(request, pk):
    """AJAX view to delete a single Critere."""
    if not request.user.is_superuser:
        return JsonResponse({"status": "error", "message": "Permission denied"}, status=403)
    if request.method == "POST":
        try:
            critere = Critere.objects.get(pk=pk)
            critere.delete()
            return JsonResponse({"status": "success", "message": "Critère supprimé"})
        except Critere.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Critère introuvable"}, status=404)
        except ProtectedError:
            return JsonResponse({"status": "error", "message": "Ce critère ne peut pas être supprimé car il est déjà utilisé dans d'autres formulaires ou audits."}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

@transaction.atomic
def delete_sous_critere_inline(request, pk):
    """AJAX view to delete a single SousCritere."""
    if not request.user.is_superuser:
        return JsonResponse({"status": "error", "message": "Permission denied"}, status=403)
    if request.method == "POST":
        try:
            sc = SousCritere.objects.get(pk=pk)
            sc.delete()
            return JsonResponse({"status": "success", "message": "Sous-critère supprimé"})
        except SousCritere.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Sous-critère introuvable"}, status=404)
        except ProtectedError:
            return JsonResponse({"status": "error", "message": "Ce sous-critère ne peut pas être supprimé car il est déjà utilisé."}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

def get_critere_type_audits(request, pk):
    """API endpoint returning related TypeAudits for a given Critere."""
    try:
        critere = Critere.objects.get(pk=pk)
        type_audits = list(critere.type_audit.values_list('id', flat=True))
        return JsonResponse({"status": "success", "type_audits": type_audits})
    except Critere.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Critère introuvable"}, status=404)