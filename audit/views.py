from django.urls import reverse_lazy
from django.views.generic import (
    ListView, CreateView, UpdateView,
    DeleteView, DetailView, View
)
from django.http import JsonResponse
from .mixins import SuperuserRequiredMixin
from django.shortcuts import redirect, get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponseForbidden
from django.db import transaction
from .models import (
    TypeAudit,
    TextRef,
    ChapitreNorme,
    Critere,
    SousCritere,
    TypePreuve,
    FormulaireAudit,
    FormulaireSousCritere,
    SousCritere,

)





#type audit
class TypeAuditListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TypeAudit
    template_name = "audit/typeaudit/typeaudit_list.html"
    context_object_name = "types_audit"
    ordering = ["name"]

class TypeAuditCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = TypeAudit
    fields = "__all__"
    template_name = "audit/typeaudit/typeaudit_form.html"
    success_url = reverse_lazy("typeaudit_list")

class TypeAuditUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TypeAudit
    fields = "__all__"
    template_name = "audit/typeaudit/typeaudit_form.html"
    success_url = reverse_lazy("typeaudit_list")

class TypeAuditDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TypeAudit
    template_name = "audit/typeaudit/typeaudit_confirm_delete.html"
    success_url = reverse_lazy("typeaudit_list")

#textref
class TextRefListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TextRef
    template_name = "audit/textref/textref_list.html"
    context_object_name = "textrefs"
    ordering = ["name"]

class TextRefCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = TextRef
    fields = "__all__"
    template_name = "audit/textref/textref_form.html"
    success_url = reverse_lazy("textref_list")

class TextRefUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TextRef
    fields = "__all__"
    template_name = "audit/textref/textref_form.html"
    success_url = reverse_lazy("textref_list")

class TextRefDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TextRef
    template_name = "audit/textref/textref_confirm_delete.html"
    success_url = reverse_lazy("textref_list")

#chapiteNorme
class ChapitreNormeListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = ChapitreNorme
    template_name = "audit/chapitre/chapitre_list.html"
    context_object_name = "chapitres"
    ordering = ["name"]

class ChapitreNormeCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = ChapitreNorme
    fields = "__all__"
    template_name = "audit/chapitre/chapitre_form.html"
    success_url = reverse_lazy("chapitre_list")

class ChapitreNormeUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = ChapitreNorme
    fields = "__all__"
    template_name = "audit/chapitre/chapitre_form.html"
    success_url = reverse_lazy("chapitre_list")

class ChapitreNormeDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = ChapitreNorme
    template_name = "audit/chapitre/chapitre_confirm_delete.html"
    success_url = reverse_lazy("chapitre_list")

#critere
class CritereListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Critere
    template_name = "audit/critere/critere_list.html"
    context_object_name = "criteres"
    ordering = ["name"]

class CritereCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Critere
    fields = "__all__"
    template_name = "audit/critere/critere_form.html"
    success_url = reverse_lazy("critere_list")

class CritereUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Critere
    fields = "__all__"
    template_name = "audit/critere/critere_form.html"
    success_url = reverse_lazy("critere_list")

class CritereDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Critere
    template_name = "audit/critere/critere_confirm_delete.html"
    success_url = reverse_lazy("critere_list")

#SousCritère
class SousCritereListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = SousCritere
    template_name = "audit/souscritere/souscritere_list.html"
    context_object_name = "souscriteres"
    ordering = ["name"]

class SousCritereCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = SousCritere
    fields = "__all__"
    template_name = "audit/souscritere/souscritere_form.html"
    success_url = reverse_lazy("souscritere_list")

class SousCritereUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = SousCritere
    fields = "__all__"
    template_name = "audit/souscritere/souscritere_form.html"
    success_url = reverse_lazy("souscritere_list")

class SousCritereDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = SousCritere
    template_name = "audit/souscritere/souscritere_confirm_delete.html"
    success_url = reverse_lazy("souscritere_list")

#TypePreuve
class TypePreuveListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TypePreuve
    template_name = "audit/typepreuve/typepreuve_list.html"
    context_object_name = "types_preuve"
    ordering = ["name"]

class TypePreuveCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = TypePreuve
    fields = "__all__"
    template_name = "audit/typepreuve/typepreuve_form.html"
    success_url = reverse_lazy("typepreuve_list")

class TypePreuveUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TypePreuve
    fields = "__all__"
    template_name = "audit/typepreuve/typepreuve_form.html"
    success_url = reverse_lazy("typepreuve_list")

class TypePreuveDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TypePreuve
    template_name = "audit/typepreuve/typepreuve_confirm_delete.html"
    success_url = reverse_lazy("typepreuve_list")
# =====================================================
# LIST VIEW
# =====================================================

class PreuveAttenduListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = PreuveAttendu
    template_name = "org/preuveattendu/preuveattendu_list.html"
    context_object_name = "preuves"
    ordering = ["id"]

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
    fields = ["name", "type_preuve"]
    template_name = "org/preuveattendu/preuveattendu_form.html"
    success_url = reverse_lazy("preuveattendu_list")

# =====================================================
# UPDATE VIEW
# =====================================================

class PreuveAttenduUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = PreuveAttendu
    fields = ["name", "type_preuve"]
    template_name = "org/preuveattendu/preuveattendu_form.html"
    success_url = reverse_lazy("preuveattendu_list")

# =====================================================
# DELETE VIEW
# =====================================================

class PreuveAttenduDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = PreuveAttendu
    template_name = "org/preuveattendu/preuveattendu_confirm_delete.html"
    success_url = reverse_lazy("preuveattendu_list")

class Cotation(models.Model):
    valeur = models.FloatField()
    content = models.CharField(max_length=50)
    code = models.CharField(max_length=3)
    type_cotation = models.ForeignKey(TypeCotation, on_delete=models.SET_NULL, null=True, blank=True)
    def __str__(self):
        return f"{self.content} ({self.valeur})"
    # =====================================================
# LIST VIEW
# =====================================================

class CotationListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Cotation
    template_name = "org/cotation/cotation_list.html"
    context_object_name = "cotations"
    ordering = ["type_cotation", "valeur"]

# =====================================================
# DETAIL VIEW
# =====================================================

class CotationDetailView(LoginRequiredMixin, SuperuserRequiredMixin, DetailView):
    model = Cotation
    template_name = "org/cotation/cotation_detail.html"
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
    template_name = "org/cotation/cotation_form.html"
    success_url = reverse_lazy("cotation_list")

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
    template_name = "org/cotation/cotation_form.html"
    success_url = reverse_lazy("cotation_list")

# =====================================================
# DELETE VIEW
# =====================================================

class CotationDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Cotation
    template_name = "org/cotation/cotation_confirm_delete.html"
    success_url = reverse_lazy("cotation_list")


# =====================================================
# CRUD - FORMULAIRE AUDIT
# =====================================================

class FormulaireAuditListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = FormulaireAudit
    template_name = "audit/formulaire/list.html"
    context_object_name = "formulaires"
    ordering = ["-id"]


class FormulaireAuditDetailView(LoginRequiredMixin, SuperuserRequiredMixin, DetailView):
    model = FormulaireAudit
    template_name = "audit/formulaire/detail.html"
    context_object_name = "formulaire"


class FormulaireAuditCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = FormulaireAudit
    fields = ["name", "type_audit"]
    template_name = "audit/formulaire/form.html"
    success_url = reverse_lazy("formulaire_list")


class FormulaireAuditUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = FormulaireAudit
    fields = ["name", "type_audit"]
    template_name = "audit/formulaire/form.html"
    success_url = reverse_lazy("formulaire_list")


class FormulaireAuditDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = FormulaireAudit
    template_name = "audit/formulaire/confirm_delete.html"
    success_url = reverse_lazy("formulaire_list")
class FormulaireSyncView(LoginRequiredMixin, SuperuserRequiredMixin, View):

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
class FormulaireReorderView(LoginRequiredMixin, SuperuserRequiredMixin, View):

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
        if liste_audit.auditeur != request.user and not request.user.is_superuser:
            return HttpResponseForbidden()

        # Prevent duplicate start
        existing = ResultatAudit.objects.filter(audit=liste_audit).first()
        if existing:
            return redirect("resultat_detail", pk=existing.pk)

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
        formulaire = liste_audit.formulaire
        sous_criteres = formulaire.formulairesouscritere_set.select_related(
            "sous_critere__critere",
            "sous_critere__norme",
            "sous_critere__chapitre_norme",
        )

        details = []

        for fs in sous_criteres:
            sc = fs.sous_critere

            details.append(
                DetailResultatAudit(
                    resultat_audit=resultat,
                    critere=sc.critere.name if sc.critere else "",
                    norme=sc.norme.norme if sc.norme else "",
                    sous_critere=sc.name,
                    chapitre_norme=sc.chapitre_norme.name if sc.chapitre_norme else "",
                    text_ref_url=sc.norme.text_ref.url if sc.norme and sc.norme.text_ref else "",
                    value=0,
                    value_max=sc.valeur_max,
                    cotation="",
                    cotation_option=[],  # set properly if needed
                )
            )

        DetailResultatAudit.objects.bulk_create(details)

        return redirect("resultat_detail", pk=resultat.pk)


class ResultatAuditDetailView(LoginRequiredMixin, DetailView):
    model = ResultatAudit
    template_name = "audit/resultat_detail.html"
    context_object_name = "resultat"

    def get_queryset(self):
        qs = ResultatAudit.objects.select_related("audit", "auditeur")

        if self.request.user.is_superuser:
            return qs

        return qs.filter(auditeur=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["details"] = self.object.detailresultataudit_set.all()
        context["readonly"] = not self.object.en_cours
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

        detail.save()  # auto recalculates score via model

        return JsonResponse({
            "status": "saved",
            "score": detail.resultat_audit.score_audit
        })



class CloseAuditView(LoginRequiredMixin, View):

    def post(self, request, pk):

        if not request.user.is_superuser:
            return HttpResponseForbidden()

        resultat = get_object_or_404(ResultatAudit, pk=pk)

        resultat.en_cours = False
        resultat.save(update_fields=["en_cours"])

        return redirect("resultat_report", pk=resultat.pk)

class ResultatAuditListView(LoginRequiredMixin, ListView):
    model = ResultatAudit
    template_name = "audit/resultat_list.html"
    context_object_name = "resultats"
    paginate_by = 20

    def get_queryset(self):
        qs = ResultatAudit.objects.select_related(
            "audit", "auditeur"
        ).order_by("-date_audit")

        if self.request.user.is_superuser:
            return qs

        return qs.filter(auditeur=self.request.user)
class ResultatAuditReportView(LoginRequiredMixin, DetailView):
    model = ResultatAudit
    template_name = "audit/resultat_report.html"
    context_object_name = "resultat"

    def get_queryset(self):
        qs = ResultatAudit.objects.select_related("audit", "auditeur")
        if self.request.user.is_superuser:
            return qs

        return qs.filter(auditeur=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["details"] = self.object.detailresultataudit_set.all()
        context["readonly"] = True
        return context
class ListeAuditListView(LoginRequiredMixin, ListView):
    model = ListeAudit
    template_name = "audit/liste_audit_list.html"
    context_object_name = "audits"
    paginate_by = 20

    def get_queryset(self):
        qs = ListeAudit.objects.select_related(
            "section", "formulaire_audit"
        ).prefetch_related("affectation").order_by("-date")

        if self.request.user.is_superuser:
            return qs

        # Auditeur → only assigned audits
        return qs.filter(affectation=self.request.user)
class ListeAuditDetailView(LoginRequiredMixin, DetailView):
    model = ListeAudit
    template_name = "audit/liste_audit_detail.html"
    context_object_name = "audit"

    def get_queryset(self):
        if self.request.user.is_superuser:
            return ListeAudit.objects.all()

        return ListeAudit.objects.filter(affectation=self.request.user)
class ListeAuditCreateView(LoginRequiredMixin, CreateView):
    model = ListeAudit
    fields = [
        "desc",
        "status",
        "number_audit",
        "section",
        "formulaire_audit",
        "affectation",
    ]
    template_name = "audit/liste_audit_form.html"
    success_url = reverse_lazy("liste_audit_list")

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return HttpResponseForbidden()
        return super().dispatch(request, *args, **kwargs)
class ListeAuditUpdateView(LoginRequiredMixin, UpdateView):
    model = ListeAudit
    fields = [
        "desc",
        "status",
        "number_audit",
        "section",
        "formulaire_audit",
        "affectation",
    ]
    template_name = "audit/liste_audit_form.html"
    success_url = reverse_lazy("liste_audit_list")

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return HttpResponseForbidden()
        return super().dispatch(request, *args, **kwargs)
class ListeAuditUpdateView(LoginRequiredMixin, UpdateView):
    model = ListeAudit
    fields = [
        "desc",
        "status",
        "number_audit",
        "section",
        "formulaire_audit",
        "affectation",
    ]
    template_name = "audit/liste_audit_form.html"
    success_url = reverse_lazy("liste_audit_list")

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return HttpResponseForbidden()
        return super().dispatch(request, *args, **kwargs)