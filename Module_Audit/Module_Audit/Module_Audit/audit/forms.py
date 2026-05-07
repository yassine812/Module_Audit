from django import forms
from django.forms import inlineformset_factory
from .models import FormulaireAudit, Critere, SousCritere, TypeAudit, TypePreuve, PreuveAttendu
from Organisation.models import Section

class FormulaireAuditForm(forms.ModelForm):
    # Use ModelChoiceField for a single-select experience on a M2M field
    section = forms.ModelChoiceField(
        queryset=Section.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'custom-input form-select'})
    )

    class Meta:
        model = FormulaireAudit
        fields = ["name", "type_audit", "processus", "type_equipement", "section"]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'custom-input'}),
            'type_audit': forms.Select(attrs={'class': 'custom-input form-select'}),
            'processus': forms.Select(attrs={'class': 'custom-input form-select'}),
            'type_equipement': forms.Select(attrs={'class': 'custom-input form-select'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # If editing, pre-select the first section if any exists
        if self.instance.pk:
            initial_section = self.instance.section.first()
            if initial_section:
                self.initial['section'] = initial_section

    def save(self, commit=True):
        instance = super().save(commit=False)
        section = self.cleaned_data.get('section')
        if commit:
            instance.save()
            if section:
                instance.section.set([section])
            else:
                instance.section.clear()
        return instance

class CritereForm(forms.ModelForm):
    class Meta:
        model = Critere
        fields = ['name', 'chapitre_norme', 'formulaire', 'type_audit']
        widgets = {
            'type_audit': forms.SelectMultiple(attrs={'class': 'form-control select2-multiple', 'data-placeholder': 'Sélectionner les types d\'audit...'}),
        }

class SousCritereForm(forms.ModelForm):
    class Meta:
        model = SousCritere
        fields = ['content', 'type_cotation', 'reaction', 'preuve_attendu', 'type_audit']
        widgets = {
            'content': forms.Textarea(attrs={'class': 'form-control form-control-sm border-0 bg-light', 'rows': 1}),
            'type_cotation': forms.Select(attrs={'class': 'form-control bg-light border-0 custom-select-compact'}),
            'reaction': forms.Textarea(attrs={'class': 'form-control form-control-sm border-0 bg-light', 'rows': 1}),
            'preuve_attendu': forms.SelectMultiple(attrs={'class': 'form-control form-control-sm border-0 bg-light select2-inline'}),
            'type_audit': forms.SelectMultiple(attrs={'class': 'form-control form-control-sm border-0 bg-light select2-inline'}),
        }

class SousCritereStandaloneForm(forms.ModelForm):
    class Meta:
        model = SousCritere
        fields = '__all__'
        widgets = {
            'critere': forms.Select(attrs={'class': 'form-control form-control-modern'}),
            'type_cotation': forms.Select(attrs={'class': 'form-control form-control-modern'}),
            'content': forms.Textarea(attrs={'class': 'form-control form-control-modern', 'rows': 3}),
            'reaction': forms.Textarea(attrs={'class': 'form-control form-control-modern', 'rows': 3}),
            'type_audit': forms.SelectMultiple(attrs={'class': 'form-control select2-multiple'}),
            'preuve_attendu': forms.SelectMultiple(attrs={'class': 'form-control select2-multiple'}),
        }
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['preuve_attendu'].required = False
        self.fields['type_audit'].required = False
        self.fields['reaction'].required = False

CritereFormSet = inlineformset_factory(
    FormulaireAudit,
    Critere,
    form=CritereForm,
    extra=0,
    can_delete=True
)

SousCritereFormSet = inlineformset_factory(
    Critere,
    SousCritere,
    form=SousCritereForm,
    extra=0,
    can_delete=True
)


class TypeAuditForm(forms.ModelForm):
    class Meta:
        model = TypeAudit
        fields = ["name", "section"]
        widgets = {
            'name': forms.Select(attrs={'class': 'custom-input form-select'}),
            'section': forms.SelectMultiple(attrs={'class': 'custom-input form-select select2-modal'}),
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
        fields = ['name', 'type_preuve']
        widgets = {
            'name': forms.Textarea(attrs={'class': 'custom-input', 'rows': 2, 'placeholder': 'Désignation de la preuve attendue...'}),
            'type_preuve': forms.Select(attrs={'class': 'custom-input form-select'}),
        }
