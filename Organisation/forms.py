from django import forms
from django.forms import inlineformset_factory, formset_factory
from .models import Site, NiveauAttendu, Section, Processus, TypeEquipement, ProcessusDoc
from audit.models import TypeAudit

class NiveauAttenduForm(forms.ModelForm):
    class Meta:
        model = NiveauAttendu
        fields = ['commentaire', 'valeur']
        widgets = {
            'commentaire': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Description du niveau (ex: Faible, Moyen, Bon)'
            }),
            'valeur': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ex: 50',
                'inputmode': 'decimal'
            }),
        }

    def clean_valeur(self):
        valeur = self.cleaned_data.get('valeur')
        if valeur is not None:
            if valeur < 0 or valeur > 100:
                raise forms.ValidationError('La valeur doit être entre 0 et 100.')
        return valeur


class SiteForm(forms.ModelForm):
    niveau_evaluation = forms.ModelMultipleChoiceField(
        queryset=NiveauAttendu.objects.all(),
        widget=forms.CheckboxSelectMultiple(),
        required=False,
        label="Niveaux d'évaluation attendus"
    )

    class Meta:
        model = Site
        fields = ['name', 'section', 'niveau_evaluation']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nom du site'
            }),
            'section': forms.Select(attrs={
                'class': 'form-control'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Personnalisation de l'affichage avec un séparateur pour le template
        self.fields['niveau_evaluation'].label_from_instance = lambda obj: f"{int(obj.valeur)}|{obj.commentaire}"

class SectionForm(forms.ModelForm):
    # These fields are added for UI consistency with the Audit Form
    processus = forms.ModelMultipleChoiceField(
        queryset=Processus.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'custom-input form-select'})
    )
    type_audit = forms.ModelChoiceField(
        queryset=TypeAudit.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'custom-input form-select'})
    )
    type_equipement = forms.ModelChoiceField(
        queryset=TypeEquipement.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'custom-input form-select'})
    )
    # This field is for the "Section concernée" label in the template
    section = forms.ModelChoiceField(
        queryset=Section.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'custom-input form-select'})
    )
    
    class Meta:
        model = Section
        fields = ['name']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'custom-input form-control',
                'placeholder': 'Nom du Formulaire'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialization logic if needed

class ProcessusDocForm(forms.ModelForm):
    class Meta:
        model = ProcessusDoc
        fields = ['name', 'content', 'document_processus']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nom du document (ex: Manuel Qualité)'}),
            'content': forms.FileInput(attrs={'class': 'form-control'}),
            'document_processus': forms.SelectMultiple(attrs={'class': 'form-control select2-modal'}),
        }
