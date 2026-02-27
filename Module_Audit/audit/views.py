from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import (
    TypeAudit,
    TextRef,
    ChapitreNorme,
    Critere,
    SousCritere,
    TypePreuve,
)
from .mixins import SuperuserRequiredMixin

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

