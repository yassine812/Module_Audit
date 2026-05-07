from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from Organisation.models import Section, Site, Processus, TypeEquipement, ProcessusDoc
class TextRef(models.Model):
    norme = models.CharField(max_length=255)
    text_ref = models.ForeignKey(ProcessusDoc, on_delete=models.SET_NULL, blank=True, null=True, related_name='text_refs')
    def __str__(self):
        return self.norme
class ChapitreNorme(models.Model):
    name = models.CharField(max_length=300)
    text_ref = models.ForeignKey(TextRef, on_delete=models.SET_NULL, null=True, blank=True)
    page = models.IntegerField(blank=True, null=True)
    def __str__(self):
        norme_name = self.text_ref.norme if self.text_ref else "N/A"
        return f"{self.name} - {norme_name} (Page: {self.page})"
class Critere(models.Model):
    name = models.CharField(max_length=255)
    formulaire = models.ForeignKey('FormulaireAudit', on_delete=models.CASCADE, related_name='criteres', null=True, blank=True)
    chapitre_norme = models.ForeignKey(ChapitreNorme, on_delete=models.SET_NULL , null=True, blank=True)
    type_audit = models.ManyToManyField('TypeAudit', blank=True, related_name='criteres')
    def __str__(self):
        res = self.name
        if self.chapitre_norme:
            res += f" - {self.chapitre_norme.name}"
            if self.chapitre_norme.text_ref:
                res += f" - {self.chapitre_norme.text_ref.norme}"
        return res
class TypeCotation(models.Model):
    name = models.CharField(max_length=50)
    def __str__(self):
        return self.name
class TypePreuve(models.Model):
    name = models.CharField(max_length=350)
    def __str__(self):
        return self.name
class PreuveAttendu(models.Model):
    name = models.TextField()
    type_preuve = models.ForeignKey(TypePreuve, on_delete=models.SET_NULL, null=True, blank=True)
    def __str__(self):
        type_name = self.type_preuve.name if self.type_preuve else "N/A"
        return f"{self.name} - {type_name}"
class SousCritere(models.Model):
    reaction = models.TextField(blank=True, null=True)
    content = models.TextField()
    type_cotation = models.ForeignKey(TypeCotation, on_delete=models.SET_NULL, null=True, blank=True)
    critere = models.ForeignKey(Critere, on_delete=models.CASCADE)
    preuve_attendu = models.ManyToManyField(PreuveAttendu, related_name='preuve_attendu_sous_critere')
    type_audit = models.ManyToManyField("TypeAudit", through="SousCritereTypeAudit" , blank=True)
    def __str__(self):
        return f"{self.critere.name} - Contenu : {self.content[:50]}"

class TypeAudit(models.Model):
    CATEGORY_CHOICES = [
        ('Audit équipement', 'Audit équipement'),
        ('Audit interne', 'Audit interne'),
        ('Audit de poste', 'Audit de poste'),
        ('Audit de Site', 'Audit de Site'),
    ]
    name = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    section = models.ManyToManyField(Section, related_name='type_audit_section', blank=True)
    date_creation = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    def __str__(self):
        return self.name

class FormulaireAudit(models.Model):
    name = models.CharField(max_length=100)
    processus = models.ForeignKey(Processus, on_delete=models.SET_NULL , null=True, blank=True)
    type_audit = models.ForeignKey(TypeAudit, on_delete=models.SET_NULL, null=True, blank=True)
    type_equipement = models.ForeignKey(TypeEquipement, on_delete=models.PROTECT , null=True, blank=True)
    section = models.ManyToManyField(Section, related_name='formulaire_audit_section', blank=True)
    liste_sous_criteres = models.ManyToManyField(SousCritere,through='FormulaireSousCritere',related_name='liste_sous_critere', blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.name
    def get_sous_criteres_ordonne(self):
        return self.formulairesouscritere_set.select_related("sous_critere").order_by("sous_critere__critere__name","ordre")
    def sync_sous_criteres_from_type_audit(self):
        """Synchronise les sous-critères du formulaire avec ceux associés au type d'audit.
        Ajoute les sous-critères obligatoires et optionnels liés au type_audit.
        """
        if not self.type_audit:
            return
        # Récupérer tous les sous-critères associés à ce type d'audit
        associations = SousCritereTypeAudit.objects.filter(type_audit=self.type_audit).select_related('sous_critere')
        # Pour chaque association, ajouter le sous-critère au formulaire s'il n'existe pas déjà
        ordre = self.formulairesouscritere_set.count()
        for assoc in associations:
            # Vérifier si ce sous-critère est déjà dans le formulaire
            existe = FormulaireSousCritere.objects.filter(formulaire=self,sous_critere=assoc.sous_critere).exists()
            if not existe:
                # Ajouter le sous-critère avec un ordre incrémental
                FormulaireSousCritere.objects.create(formulaire=self,sous_critere=assoc.sous_critere,ordre=ordre)
                ordre += 1

class ListeAudit(models.Model):
    desc = models.CharField(max_length=50)
    status = models.BooleanField(default=False)
    number_audit = models.PositiveIntegerField(default=0, editable=False)
    date = models.DateTimeField(default=timezone.now)
    affectation = models.ManyToManyField(User, related_name='liste_audit_affectation')
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True)
    formulaire_audit = models.ForeignKey(FormulaireAudit, on_delete=models.SET_NULL, null=True, blank=True)
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True)
    participants = models.ManyToManyField(User, related_name='liste_audit_participants', blank=True)
    
    def get_audit_status(self):
        """Determine the actual status of the audit based on ResultatAudit"""
        # Check if there are any ResultatAudit for this audit
        resultats = self.resultataudit_set.all()
        
        if resultats.exists():
            # Check if any are still in progress
            if resultats.filter(en_cours=True).exists():
                return 'en_cours'
            else:
                return 'termine'
        else:
            # No ResultatAudit means it's planned
            return 'planifie'
    
    def get_audit_status_display(self):
        """Get human readable status"""
        status = self.get_audit_status()
        status_map = {
            'planifie': 'Planifié',
            'en_cours': 'En cours', 
            'termine': 'Terminé'
        }
        return status_map.get(status, 'Inconnu')
    
    def save(self, *args, **kwargs):
        if not self.number_audit or self.number_audit == 0:
            last = ListeAudit.objects.order_by('-number_audit').first()
            if last:
                self.number_audit = last.number_audit + 1
            else:
                self.number_audit = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.desc} - {self.date.strftime('%Y-%m-%d %H:%M:%S')} - Status: {'Active' if self.status else 'Inactive'}"

class SousCritereTypeAudit(models.Model):
    sous_critere = models.ForeignKey(SousCritere, on_delete=models.CASCADE)
    type_audit = models.ForeignKey(TypeAudit, on_delete=models.CASCADE)
    STATUS_CHOICES = [
        ('obligatoire', 'Obligatoire'),
        ('optionnel', 'Optionnel'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='optionnel')
    class Meta:
        unique_together = ('sous_critere', 'type_audit')
    def __str__(self):
        return f"{self.sous_critere.content[:30]} - {self.type_audit.name}"
# --- COTATION ---
class Cotation(models.Model):
    valeur = models.FloatField()
    content = models.CharField(max_length=50)
    code = models.CharField(max_length=3)
    type_cotation = models.ForeignKey(TypeCotation, on_delete=models.SET_NULL, null=True, blank=True)
    def __str__(self):
        return f"{self.content} ({self.valeur})"
# --- FORMULAIRE : LISTE ORDONNÉE DES SOUS-CRITÈRES ---
class FormulaireSousCritere(models.Model):
    formulaire = models.ForeignKey("FormulaireAudit", on_delete=models.CASCADE)
    sous_critere = models.ForeignKey("SousCritere", on_delete=models.CASCADE)
    ordre = models.PositiveIntegerField(default=0)
    class Meta:
        ordering = ["ordre"]
    def __str__(self):
        return f"{self.formulaire.name} - {self.sous_critere.content[:30]} (ordre {self.ordre})"
# --- EXÉCUTION : RÉSULTAT D'AUDIT ---
class ResultatAudit(models.Model):
    ref_audit = models.PositiveIntegerField()
    audit = models.ForeignKey(ListeAudit, on_delete=models.CASCADE)
    users = models.CharField(max_length=50)
    date_audit = models.DateTimeField(auto_now_add=True)
    score_audit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    sujet = models.CharField(max_length=50)
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True)
    niveau_attendu = models.JSONField(default=list, blank=True, null=True)
    auditeur = models.ForeignKey(User, on_delete=models.PROTECT, related_name='auditeur_resultat')
    co_auditeur = models.ManyToManyField(User, related_name='auditeur', blank=True)
    audites = models.ManyToManyField(User, related_name='audites', blank=True)
    reference_gamme = models.CharField(max_length=50, blank=True, null=True)
    processus = models.CharField(max_length=50, blank=True, null=True)
    point_fort = models.TextField(blank=True, null=True)
    point_sensible = models.TextField(blank=True, null=True)
    risque = models.TextField(blank=True, null=True)
    opportunite = models.TextField(blank=True, null=True)
    commentaire = models.TextField(blank=True, null=True)
    en_cours = models.BooleanField(default=True)
    def __str__(self):
        return f"Audit {self.audit.desc} - {self.date_audit.strftime('%Y-%m-%d %H:%M:%S')} - Score: {self.score_audit}"
    
    def recalculate_score(self):
        details = self.detailresultataudit_set.all()
        # Group by criteria name (snapshot)
        groups = {}
        for d in details:
            if d.value < 0 or not d.cotation: # Skip N/A or unanswered
                continue
            if d.critere not in groups:
                groups[d.critere] = []
            # Raw cotation value
            groups[d.critere].append(d.value)
        
        if not groups:
            self.score_audit = 0
        else:
            # Calculate average value for each criterion
            criteria_scores = []
            for crit_name, values in groups.items():
                if values:
                    avg_crit = sum(values) / len(values)
                    criteria_scores.append(avg_crit)
            
            # Global score is the average of criteria averages
            if criteria_scores:
                global_score = sum(criteria_scores) / len(criteria_scores)
                self.score_audit = round(global_score, 2)
            else:
                self.score_audit = 0
                
        self.save(update_fields=["score_audit"])
# --- EXÉCUTION : DÉTAIL PAR SOUS-CRITÈRE ---
class DetailResultatAudit(models.Model):
    resultat_audit = models.ForeignKey(ResultatAudit, on_delete=models.CASCADE)
    critere = models.CharField(max_length=50)
    norme = models.CharField(max_length=50, blank=True, null=True)
    sous_critere = models.CharField(max_length=255)
    chapitre_norme = models.CharField(max_length=50, blank=True, null=True)
    text_ref_url = models.CharField(max_length=255, blank=True, null=True)
    element_preuve = models.TextField(blank=True, null=True)
    justificatif = models.ImageField(upload_to='evidence/', blank=True, null=True)
    justificatif_bis = models.ImageField(upload_to='evidence/', blank=True, null=True)
    commentaire = models.TextField(blank=True, null=True)
    cotation_option = models.JSONField(default=list, blank=True, null=True)
    cotation = models.CharField(max_length=50)
    code = models.CharField(max_length=3, blank=True, null=True)
    value = models.FloatField(default=0)
    value_max = models.FloatField(default=1)
    def __str__(self):
        return f"Detail {self.critere} - {self.norme}"
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.resultat_audit.recalculate_score()