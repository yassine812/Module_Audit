from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView,DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from audit.mixins import SuperuserRequiredMixin
from .models import Section, TypeEquipement, Equipement,ProcessusDoc,Processus,NiveauAttendu,Site

class SectionListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Section
    template_name = "org/section_list.html"
    context_object_name = "sections"
    ordering = ["name"]
# ==============================
# CREATE VIEW
# ==============================
class SectionCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Section
    fields = ["name", "description"]
    template_name = "org/section_form.html"
    success_url = reverse_lazy("section_list")
# ==============================
# UPDATE VIEW
# ==============================
class SectionUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Section
    fields = ["name", "description"]
    template_name = "org/section_form.html"
    success_url = reverse_lazy("section_list")
# ==============================
# DELETE VIEW
# ==============================
class SectionDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Section
    template_name = "org/section_confirm_delete.html"
    success_url = reverse_lazy("section_list")
# ==============================
# LIST VIEW
# ==============================

class SiteListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Site
    template_name = "org/site/site_list.html"
    context_object_name = "sites"
    ordering = ["name"]


# ==============================
# CREATE VIEW
# ==============================

class SiteCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Site
    fields = ["name", "section", "niveau_evaluation"]
    template_name = "org/site/site_form.html"
    success_url = reverse_lazy("site_list")


# ==============================
# UPDATE VIEW
# ==============================

class SiteUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Site
    fields = ["name", "section", "niveau_evaluation"]
    template_name = "org/site/site_form.html"
    success_url = reverse_lazy("site_list")


# ==============================
# DELETE VIEW
# ==============================

class SiteDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Site
    template_name = "org/site/site_confirm_delete.html"
    success_url = reverse_lazy("site_list")
# ==============================
# LIST VIEW
# ==============================

class ProcessusListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Processus
    template_name = "org/processus/processus_list.html"
    context_object_name = "processus_list"
    ordering = ["name"]


# ==============================
# CREATE VIEW
# ==============================

class ProcessusCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Processus
    fields = ["name"]
    template_name = "org/processus/processus_form.html"
    success_url = reverse_lazy("processus_list")


# ==============================
# UPDATE VIEW
# ==============================

class ProcessusUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Processus
    fields = ["name"]
    template_name = "org/processus/processus_form.html"
    success_url = reverse_lazy("processus_list")


# ==============================
# DELETE VIEW
# ==============================

class ProcessusDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Processus
    template_name = "org/processus/processus_confirm_delete.html"
    success_url = reverse_lazy("processus_list")
class ProcessusDocListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = ProcessusDoc
    template_name = "org/processusdoc/processusdoc_list.html"
    context_object_name = "documents"
    ordering = ["name"]

# ==============================
# LIST VIEW
# ==============================

class TypeEquipementListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TypeEquipement
    template_name = "org/typeequipement/typeequipement_list.html"
    context_object_name = "types"
    ordering = ["name"]


# ==============================
# DETAIL VIEW
# ==============================

class TypeEquipementDetailView(LoginRequiredMixin, SuperuserRequiredMixin, DetailView):
    model = TypeEquipement
    template_name = "org/typeequipement/typeequipement_detail.html"
    context_object_name = "typeequipement"


# ==============================
# CREATE VIEW
# ==============================

class TypeEquipementCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = TypeEquipement
    fields = ["name", "description"]
    template_name = "org/typeequipement/typeequipement_form.html"
    success_url = reverse_lazy("typeequipement_list")


# ==============================
# UPDATE VIEW
# ==============================

class TypeEquipementUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TypeEquipement
    fields = ["name"]
    template_name = "org/typeequipement/typeequipement_form.html"
    success_url = reverse_lazy("typeequipement_list")


# ==============================
# DELETE VIEW
# ==============================

class TypeEquipementDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TypeEquipement
    template_name = "org/typeequipement/typeequipement_confirm_delete.html"
    success_url = reverse_lazy("typeequipement_list")

# =====================================================
# CREATE VIEW
# =====================================================

class NiveauAttenduCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = NiveauAttendu
    fields = ["name", "pourcentage", "commentaire"]
    template_name = "org/niveauattendu/niveauattendu_form.html"
    success_url = reverse_lazy("niveauattendu_list")


# =====================================================
# UPDATE VIEW
# =====================================================

class NiveauAttenduUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = NiveauAttendu
    fields = ["name", "pourcentage", "commentaire"]
    template_name = "org/niveauattendu/niveauattendu_form.html"
    success_url = reverse_lazy("niveauattendu_list")


# =====================================================
# DELETE VIEW
# =====================================================

class NiveauAttenduDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = NiveauAttendu
    template_name = "org/niveauattendu/niveauattendu_confirm_delete.html"
    success_url = reverse_lazy("niveauattendu_list")
# =====================================================
# LIST VIEW
# =====================================================

class EquipementListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Equipement
    template_name = "org/equipement/equipement_list.html"
    context_object_name = "equipements"
    ordering = ["name"]


# =====================================================
# DETAIL VIEW
# =====================================================

class EquipementDetailView(LoginRequiredMixin, SuperuserRequiredMixin, DetailView):
    model = Equipement
    template_name = "org/equipement/equipement_detail.html"
    context_object_name = "equipement"


# =====================================================
# CREATE VIEW
# =====================================================

class EquipementCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Equipement
    fields = [
        "type_equipement",
        "site",
        "name",
        "serial_number",
        "commentaire",
    ]
    template_name = "org/equipement/equipement_form.html"
    success_url = reverse_lazy("equipement_list")


# =====================================================
# UPDATE VIEW
# =====================================================

class EquipementUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Equipement
    fields = [
        "type_equipement",
        "site",
        "name",
        "serial_number",
        "commentaire",
    ]
    template_name = "org/equipement/equipement_form.html"
    success_url = reverse_lazy("equipement_list")


# =====================================================
# DELETE VIEW
# =====================================================

class EquipementDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Equipement
    template_name = "org/equipement/equipement_confirm_delete.html"
    success_url = reverse_lazy("equipement_list")