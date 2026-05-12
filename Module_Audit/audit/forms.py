from django import forms
from django.forms import inlineformset_factory, modelformset_factory
from .models import (
    FormulaireAudit, Critere, SousCritere, ResultatAudit,
    ChapitreNorme, TypeAudit, TypeCotation, PreuveAttendu,
    TypePreuve, ListeAudit
)

class ChapitreNormeForm(forms.ModelForm):
    class Meta:
        model = ChapitreNorme
        fields = ['name', 'text_ref', 'page']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'custom-input', 'placeholder': 'Nom du chapitre...'}),
            'text_ref': forms.Select(attrs={'class': 'custom-input form-select'}),
            'page': forms.NumberInput(attrs={'class': 'custom-input'}),
        }

class TypeAuditForm(forms.ModelForm):
    class Meta:
        model = TypeAudit
        fields = ['name', 'section']
        widgets = {
            'name': forms.Select(attrs={'class': 'form-control border-0 py-2'}),
            'section': forms.SelectMultiple(attrs={'class': 'form-control border-0 py-2 select2-modal'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from Organisation.models import Section
        self.fields['section'].queryset = Section.objects.all()
        self.fields['section'].required = False

class TypeCotationForm(forms.ModelForm):
    class Meta:
        model = TypeCotation
        fields = ['name']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'custom-input', 'placeholder': 'Ex: Conforme, Non-Conforme...'}),
        }

class FormulaireAuditForm(forms.ModelForm):
    class Meta:
        model = FormulaireAudit
        fields = ['name', 'processus', 'type_audit', 'type_equipement', 'section']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'custom-input', 'placeholder': 'Nom du formulaire...'}),
            'processus': forms.Select(attrs={'class': 'custom-input form-select'}),
            'type_audit': forms.Select(attrs={'class': 'custom-input form-select'}),
            'type_equipement': forms.Select(attrs={'class': 'custom-input form-select'}),
            'section': forms.SelectMultiple(attrs={'class': 'custom-input form-select select2-inline', 'data-placeholder': 'Sélectionner les sections...', 'size': '1', 'style': 'height: 45px; min-height: unset;'}),
        }

class CritereForm(forms.ModelForm):
    class Meta:
        model = Critere
        fields = ['name', 'chapitre_norme', 'formulaire', 'type_audit']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'custom-input', 'placeholder': 'Nom du critère...'}),
            'chapitre_norme': forms.Select(attrs={'class': 'custom-input form-select'}),
            'formulaire': forms.Select(attrs={'class': 'custom-input form-select'}),
            'type_audit': forms.SelectMultiple(attrs={'class': 'custom-input select2-modal', 'multiple': 'multiple'}),
        }

class SousCritereForm(forms.ModelForm):
    class Meta:
        model = SousCritere
        fields = ['content', 'critere', 'type_cotation', 'reaction', 'type_audit', 'preuve_attendu']
        widgets = {
            'content': forms.Textarea(attrs={'class': 'custom-input', 'rows': 3, 'placeholder': 'Contenu du sous-critère...'}),
            'critere': forms.Select(attrs={'class': 'custom-input form-select'}),
            'type_cotation': forms.Select(attrs={'class': 'custom-input form-select'}),
            'reaction': forms.Textarea(attrs={'class': 'custom-input', 'rows': 2}),
            'type_audit': forms.SelectMultiple(attrs={'class': 'custom-input select2-modal', 'multiple': 'multiple'}),
            'preuve_attendu': forms.SelectMultiple(attrs={'class': 'custom-input select2-modal', 'multiple': 'multiple'}),
        }

class SousCritereStandaloneForm(forms.ModelForm):
    class Meta:
        model = SousCritere
        fields = ['content', 'critere', 'type_cotation', 'reaction', 'type_audit', 'preuve_attendu']
        widgets = {
            'content': forms.Textarea(attrs={'class': 'custom-input', 'rows': 3}),
            'reaction': forms.Textarea(attrs={'class': 'custom-input', 'rows': 2}),
            'type_audit': forms.SelectMultiple(attrs={'class': 'custom-input form-select select2-inline'}),
            'preuve_attendu': forms.SelectMultiple(attrs={'class': 'custom-input form-select select2-inline'}),
        }

class ResultatAuditForm(forms.ModelForm):
    class Meta:
        model = ResultatAudit
        fields = ['audit', 'score_audit', 'site', 'auditeur']
        widgets = {
            'audit': forms.Select(attrs={'class': 'custom-input form-select'}),
            'site': forms.Select(attrs={'class': 'custom-input form-select'}),
            'auditeur': forms.Select(attrs={'class': 'custom-input form-select'}),
        }

class TypePreuveForm(forms.ModelForm):
    class Meta:
        model = TypePreuve
        fields = ['name']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'custom-input', 'placeholder': 'Ex: Documentation, Photo...'}),
        }

class PreuveAttenduForm(forms.ModelForm):
    class Meta:
        model = PreuveAttendu
        fields = ['name', 'code', 'type_preuve']
        widgets = {
            'name': forms.Textarea(attrs={'class': 'custom-input', 'rows': 2, 'placeholder': 'Désignation de la preuve attendue...'}),
            'code': forms.Select(attrs={'class': 'custom-input form-select'}),
            'type_preuve': forms.Select(attrs={'class': 'custom-input form-select'}),
        }

class ListeAuditForm(forms.ModelForm):
    participants_externes = forms.MultipleChoiceField(
        required=False,
        widget=forms.SelectMultiple(attrs={
            'class': 'custom-input form-select select2-tags', 
            'data-placeholder': 'Tapez un nom et appuyez sur Entrée...'
        }),
        choices=[]
    )

    class Meta:
        model = ListeAudit
        fields = [
            "desc", "status", "site", "section", "type_audit", "formulaire_audit", 
            "date", "affectation", "participants", "participants_externes"
        ]
        widgets = {
            'desc': forms.TextInput(attrs={'class': 'custom-input', 'placeholder': 'Description de l\'audit...'}),
            'status': forms.CheckboxInput(attrs={'class': 'switch-input'}),
            'site': forms.Select(attrs={'class': 'custom-input form-select'}),
            'section': forms.Select(attrs={'class': 'custom-input form-select'}),
            'type_audit': forms.Select(attrs={'class': 'custom-input form-select'}),
            'formulaire_audit': forms.Select(attrs={'class': 'custom-input form-select'}),
            'date': forms.DateTimeInput(attrs={'class': 'custom-input', 'type': 'datetime-local'}),
            'affectation': forms.SelectMultiple(attrs={'class': 'custom-input form-select select2-inline', 'data-placeholder': 'Assigner des auditeurs...'}),
            'participants': forms.SelectMultiple(attrs={'class': 'custom-input form-select select2-inline', 'data-placeholder': 'Ajouter des participants...'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Handle participants_externes tags
        if self.instance and self.instance.participants_externes:
            current_tags = [tag.strip() for tag in self.instance.participants_externes.split(',') if tag.strip()]
            self.fields['participants_externes'].choices = [(tag, tag) for tag in current_tags]
            self.initial['participants_externes'] = current_tags
        else:
            self.fields['participants_externes'].choices = []
            
        # Handle date formatting
        if self.instance and self.instance.date:
            self.initial['date'] = self.instance.date.strftime('%Y-%m-%dT%H:%M')

    def clean_participants_externes(self):
        data = self.cleaned_data.get('participants_externes')
        if isinstance(data, list):
            return ", ".join(data)
        return data

# FormSets
SousCritereFormSet = inlineformset_factory(
    Critere, SousCritere, form=SousCritereForm, extra=0, can_delete=True
)

CritereFormSet = modelformset_factory(
    Critere, form=CritereForm, extra=0
)
