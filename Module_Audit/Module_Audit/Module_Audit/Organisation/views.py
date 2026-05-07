from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView,DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.contrib import messages
from django.db.models import ProtectedError
from django.http import HttpResponseBadRequest
from audit.mixins import SuperuserRequiredMixin, AuditeurOrSuperuserRequiredMixin
from .models import Section, TypeEquipement, Equipement,ProcessusDoc,Processus,NiveauAttendu,Site
from .forms import SiteForm, NiveauAttenduForm, SectionForm, ProcessusDocForm
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render

class SectionListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Section
    template_name = "org/section/section_list.html"
    context_object_name = "sections"
    ordering = ["id"]
    paginate_by = 7

# ==============================
# CREATE VIEW
# ==============================
class SectionCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Section
    form_class = SectionForm
    template_name = "org/section/section_form.html"
    success_url = reverse_lazy("section_list")
    
    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/section/section_form_modal.html"]
        return ["org/section/section_form.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': f"La section '{self.object.name}' a été créée avec succès."
            })
        messages.success(self.request, f"La section '{form.instance.name}' a été créée avec succès.")
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/section/section_form_modal.html", {'form': form})
        return super().form_invalid(form)

# ==============================
# UPDATE VIEW
# ==============================
class SectionUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Section
    form_class = SectionForm
    template_name = "org/section/section_form.html"
    success_url = reverse_lazy("section_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/section/section_form_modal.html"]
        return ["org/section/section_form.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': f"La section '{self.object.name}' a été mise à jour avec succès."
            })
        messages.success(self.request, f"La section '{form.instance.name}' a été mise à jour avec succès.")
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/section/section_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)

# ==============================
# DELETE VIEW
# ==============================
class SectionDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Section
    template_name = "org/section/section_confirm_delete.html"
    success_url = reverse_lazy("section_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/section/section_delete_modal.html"]
        return ["org/section/section_confirm_delete.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Section supprimée avec succès."})
            except ProtectedError:
                # Although models currently use SET_NULL, we check for potential protected links
                related_sites = self.object.site_set.all()
                error_msg = f"Impossible de supprimer la section '{self.object.name}' car elle possède des dépendances actives."
                if related_sites.exists():
                    site_names = [site.name for site in related_sites[:3]]
                    error_msg = (
                        f"Impossible de supprimer la section '{self.object.name}' car elle est utilisée par "
                        f"{len(related_sites)} site(s): {', '.join(site_names)}{'...' if len(related_sites) > 3 else ''}."
                    )
                return JsonResponse({'success': False, 'message': error_msg}, status=400)

        try:
            return super().form_valid(form)
        except ProtectedError:
            messages.error(self.request, f"Impossible de supprimer la section '{self.get_object().name}' car elle possède des dépendances actives.")
            return redirect(self.success_url)

# ==============================
# LIST VIEW
# ==============================

class SiteListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Site
    template_name = "org/site/site_list.html"
    context_object_name = "sites"
    ordering = ["id"]
    paginate_by = 7

# ==============================
# CREATE VIEW
# ==============================

class SiteCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Site
    form_class = SiteForm
    template_name = "org/site/site_form.html"
    success_url = reverse_lazy("site_list")
    
    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/site/site_form_modal.html"]
        return ["org/site/site_form.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': f"Le site '{self.object.name}' a été créé avec succès."
            })
        messages.success(self.request, f"Le site '{form.instance.name}' a été créé avec succès.")
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/site/site_form_modal.html", {'form': form})
        return super().form_invalid(form)

# ==============================
# UPDATE VIEW
# ==============================
class SiteUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Site
    form_class = SiteForm
    template_name = "org/site/site_form.html"
    success_url = reverse_lazy("site_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/site/site_form_modal.html"]
        return ["org/site/site_form.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': f"Le site '{self.object.name}' a été mis à jour avec succès."
            })
        messages.success(self.request, f"Le site '{form.instance.name}' a été mis à jour avec succès.")
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/site/site_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)

# ==============================
# DELETE VIEW
# ==============================
class SiteDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Site
    template_name = "org/site/site_confirm_delete.html"
    success_url = reverse_lazy("site_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/site/site_delete_modal.html"]
        return ["org/site/site_confirm_delete.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Site supprimé avec succès."})
            except ProtectedError:
                related_equipements = self.object.equipement_set.all()
                from audit.models import ResultatAudit
                related_results = ResultatAudit.objects.filter(site=self.object)
                
                reasons = []
                if related_equipements.exists():
                    items = [f"'{e.name}'" for e in related_equipements[:3]]
                    if len(related_equipements) > 3:
                        items.append("...")
                    reasons.append(f"{len(related_equipements)} équipement(s) ({', '.join(items)})")
                
                if related_results.exists():
                    reasons.append(f"{len(related_results)} résultat(s) d'audit")

                error_msg = (
                    f"Impossible de supprimer le site '{self.object.name}' car il possède des dépendances actives : "
                    f"{' et '.join(reasons)}."
                )
                return JsonResponse({'success': False, 'message': error_msg}, status=400)
        
        try:
            return super().form_valid(form)
        except ProtectedError:
            related_equipements = self.object.equipement_set.all()
            from audit.models import ResultatAudit
            related_results = ResultatAudit.objects.filter(site=self.object)
            
            reasons = []
            if related_equipements.exists():
                reasons.append(f"{len(related_equipements)} équipement(s)")
            if related_results.exists():
                reasons.append(f"{len(related_results)} résultat(s) d'audit")

            messages.error(
                self.request, 
                f"Impossible de supprimer le site '{self.object.name}' car il est utilisé par "
                f"{' et '.join(reasons)}. Veuillez supprimer ces éléments d'abord."
            )
            return redirect(self.success_url)

# ==============================
# LIST VIEW
# ==============================

class ProcessusListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = Processus
    template_name = "org/processus/processus_list.html"
    context_object_name = "processus_list"
    ordering = ["id"]
    paginate_by = 7
# ==============================
# CREATE VIEW
# ==============================

class ProcessusCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = Processus
    fields = ["name"]
    template_name = "org/processus/processus_form.html"
    success_url = reverse_lazy("processus_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/processus/processus_form_modal.html"]
        return ["org/processus/processus_form.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': f"Le processus '{self.object.name}' a été créé avec succès."
            })
        messages.success(self.request, f"Le processus '{form.instance.name}' a été créé avec succès.")
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/processus/processus_form_modal.html", {'form': form})
        return super().form_invalid(form)


# ==============================
# UPDATE VIEW
# ==============================

class ProcessusUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = Processus
    fields = ["name"]
    template_name = "org/processus/processus_form.html"
    success_url = reverse_lazy("processus_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/processus/processus_form_modal.html"]
        return ["org/processus/processus_form.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': f"Le processus '{self.object.name}' a été mis à jour avec succès."
            })
        messages.success(self.request, f"Le processus '{form.instance.name}' a été mis à jour avec succès.")
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/processus/processus_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)


# ==============================
# DELETE VIEW
# ==============================

class ProcessusDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = Processus
    template_name = "org/processus/processus_confirm_delete.html"
    success_url = reverse_lazy("processus_list")
    ordering = ["name"]

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/processus/processus_delete_modal.html"]
        return ["org/processus/processus_confirm_delete.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Processus supprimé avec succès."})
            except ProtectedError:
                # Check for documents or forms linked to this processus
                related_docs = self.object.ProcessDoc.all()
                from audit.models import FormulaireAudit
                related_forms = FormulaireAudit.objects.filter(processus=self.object)
                
                reasons = []
                if related_docs.exists():
                    reasons.append(f"{len(related_docs)} document(s)")
                if related_forms.exists():
                    reasons.append(f"{len(related_forms)} formulaire(s) d'audit")
                
                error_msg = f"Impossible de supprimer ce processus car il possède des dépendances actives : {', '.join(reasons) if reasons else 'éléments protégés'}."
                return JsonResponse({'success': False, 'message': error_msg}, status=400)

        return super().form_valid(form)

class ProcessusDocListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = ProcessusDoc
    template_name = "org/processusdoc/processusdoc_list.html"
    context_object_name = "documents"
    ordering = ["id"]
    paginate_by = 7

class ProcessusDocCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = ProcessusDoc
    form_class = ProcessusDocForm
    template_name = "org/processusdoc/processusdoc_form.html"
    success_url = reverse_lazy("processusdoc_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/processusdoc/processusdoc_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Document téléchargé avec succès."})
        messages.success(self.request, "Document téléchargé avec succès.")
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/processusdoc/processusdoc_form_modal.html", {'form': form})
        return super().form_invalid(form)

class ProcessusDocUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = ProcessusDoc
    form_class = ProcessusDocForm
    template_name = "org/processusdoc/processusdoc_form.html"
    success_url = reverse_lazy("processusdoc_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/processusdoc/processusdoc_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Document mis à jour avec succès."})
        messages.success(self.request, "Document mis à jour avec succès.")
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/processusdoc/processusdoc_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)

class ProcessusDocDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = ProcessusDoc
    template_name = "org/processusdoc/processusdoc_confirm_delete.html"
    success_url = reverse_lazy("processusdoc_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/processusdoc/processusdoc_delete_modal.html"]
        return ["org/processusdoc/processusdoc_confirm_delete.html"]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Document supprimé avec succès."})
            except ProtectedError:
                return JsonResponse({'success': False, 'message': "Ce document ne peut pas être supprimé car il est lié à d'autres éléments."}, status=400)
        return super().form_valid(form)

def processusdoc_open(request, pk):
    doc = get_object_or_404(ProcessusDoc, pk=pk)
    if not doc.content:
        raise Http404("Fichier non trouvé")
    
    # Check if it's a DOCX file
    if doc.content.name.lower().endswith('.docx'):
        # Render the custom JS viewer
        return render(request, "org/processusdoc/processusdoc_viewer.html", {"doc": doc})
        
    # Standard behavior for PDF/Images/etc.
    response = FileResponse(doc.content.open(), as_attachment=False)
    return response

# ==============================
# LIST VIEW
# ==============================

class TypeEquipementListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = TypeEquipement
    template_name = "org/typeequipement/typeequipement_list.html"
    context_object_name = "types"
    ordering = ["id"]
    paginate_by = 7


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
    fields = ["name"]
    template_name = "org/typeequipement/typeequipement_form.html"
    success_url = reverse_lazy("typeequipement_list")

    def get_template_names(self):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return ["org/typeequipement/typeequipement_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Le type d'équipement a été créé avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return render(self.request, "org/typeequipement/typeequipement_form_modal.html", {'form': form})
        return super().form_invalid(form)
# ==============================
# UPDATE VIEW
# ==============================
class TypeEquipementUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = TypeEquipement
    fields = ["name"]
    template_name = "org/typeequipement/typeequipement_form.html"
    success_url = reverse_lazy("typeequipement_list")

    def get_template_names(self):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return ["org/typeequipement/typeequipement_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "Le type d'équipement a été mis à jour avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return render(self.request, "org/typeequipement/typeequipement_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)


# ==============================
# DELETE VIEW
# ==============================

class TypeEquipementDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = TypeEquipement
    template_name = "org/typeequipement/typeequipement_confirm_delete.html"
    success_url = reverse_lazy("typeequipement_list")
    
    def get_template_names(self):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return ["org/typeequipement/typeequipement_delete_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Type d'équipement supprimé avec succès."})
            except ProtectedError:
                return JsonResponse({'success': False, 'message': "Impossible de supprimer ce type car il est lié à des équipements existants. Veuillez les modifier d'abord."}, status=400)
        
        try:
            return super().form_valid(form)
        except ProtectedError:
            related_equipements = self.object.equipement_set.all()
            equipement_names = [equip.name for equip in related_equipements]
            messages.error(
                self.request, 
                f"Impossible de supprimer le type d'équipement '{self.object.name}' car il est utilisé par "
                f"{len(related_equipements)} équipement(s): {', '.join(equipement_names)}. "
                "Veuillez supprimer ou modifier ces équipements d'abord."
            )
            return redirect(self.success_url)

# =====================================================
# LIST VIEW
# =====================================================

class NiveauAttenduListView(LoginRequiredMixin, SuperuserRequiredMixin, ListView):
    model = NiveauAttendu
    template_name = "org/niveauattendu/niveauattendu_list.html"
    context_object_name = "niveaux_attendus"
    ordering = ["id"]
    paginate_by = 7

# =====================================================
# CREATE VIEW
# =====================================================

class NiveauAttenduCreateView(LoginRequiredMixin, SuperuserRequiredMixin, CreateView):
    model = NiveauAttendu
    form_class = NiveauAttenduForm
    template_name = "org/niveauattendu/niveauattendu_form.html"
    success_url = reverse_lazy("niveauattendu_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/niveauattendu/niveauattendu_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': "Le niveau attendu a été créé avec succès."
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/niveauattendu/niveauattendu_form_modal.html", {'form': form})
        return super().form_invalid(form)

# =====================================================
# UPDATE VIEW
# =====================================================
class NiveauAttenduUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, UpdateView):
    model = NiveauAttendu
    form_class = NiveauAttenduForm
    template_name = "org/niveauattendu/niveauattendu_form.html"
    success_url = reverse_lazy("niveauattendu_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/niveauattendu/niveauattendu_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({
                'success': True,
                'message': "Le niveau attendu a été mis à jour avec succès."
            })
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return render(self.request, "org/niveauattendu/niveauattendu_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)

# =====================================================
# DELETE VIEW
# =====================================================

class NiveauAttenduDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, DeleteView):
    model = NiveauAttendu
    template_name = "org/niveauattendu/niveauattendu_confirm_delete.html"
    success_url = reverse_lazy("niveauattendu_list")

    def get_template_names(self):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return ["org/niveauattendu/niveauattendu_delete_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.headers.get('x-requested-with') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Niveau attendu supprimé avec succès."})
            except ProtectedError:
                error_msg = "Impossible de supprimer ce niveau car il est utilisé dans des sites ou processus existants."
                return JsonResponse({'success': False, 'message': error_msg}, status=400)
        return super().form_valid(form)
# =====================================================
# LIST VIEW
# =====================================================

class EquipementListView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, ListView):
    model = Equipement
    template_name = "org/equipement/equipement_list.html"
    context_object_name = "equipements"
    ordering = ["id"]
    paginate_by = 7
# =====================================================
# DETAIL VIEW
# =====================================================

class EquipementDetailView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, DetailView):
    model = Equipement
    template_name = "org/equipement/equipement_detail.html"
    context_object_name = "equipement"


# =====================================================
# CREATE VIEW
# =====================================================

class EquipementCreateView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, CreateView):
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

    def get_template_names(self):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return ["org/equipement/equipement_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "L'équipement a été créé avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return render(self.request, "org/equipement/equipement_form_modal.html", {'form': form})
        return super().form_invalid(form)


# =====================================================
# UPDATE VIEW
# =====================================================

class EquipementUpdateView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, UpdateView):
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

    def get_template_names(self):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return ["org/equipement/equipement_form_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            self.object = form.save()
            return JsonResponse({'success': True, 'message': "L'équipement a été mis à jour avec succès."})
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return render(self.request, "org/equipement/equipement_form_modal.html", {'form': form, 'object': self.get_object()})
        return super().form_invalid(form)


# =====================================================
# DELETE VIEW
# =====================================================

class EquipementDeleteView(LoginRequiredMixin, AuditeurOrSuperuserRequiredMixin, DeleteView):
    model = Equipement
    template_name = "org/equipement/equipement_confirm_delete.html"
    success_url = reverse_lazy("equipement_list")

    def get_template_names(self):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            return ["org/equipement/equipement_delete_modal.html"]
        return [self.template_name]

    def form_valid(self, form):
        if self.request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
            try:
                self.object = self.get_object()
                self.object.delete()
                return JsonResponse({'success': True, 'message': "Équipement supprimé avec succès."})
            except ProtectedError:
                return JsonResponse({'success': False, 'message': "Cet équipement ne peut pas être supprimé car il est lié à d'autres éléments."}, status=400)
        return super().form_valid(form)