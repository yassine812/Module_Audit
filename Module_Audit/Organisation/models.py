from django.db import models

class Section(models.Model):
    name = models.CharField(max_length=120)
    def __str__(self):
        return self.name
class NiveauAttendu(models.Model):
    name = models.CharField(max_length=120)
    pourcentage = models.DecimalField(max_digits=5, decimal_places=2)
    commentaire = models.TextField(blank=True)
    def __str__(self):
        return self.name
class Site(models.Model):
    # Association: chaque Site appartient à UNE Section
    section = models.ForeignKey(Section, on_delete=models.PROTECT)
    name = models.CharField(max_length=150)
    # Cahier des charges: niveau_evaluation stocké en JSON au niveau du site
    niveau_evaluation = models.JSONField(blank=True, null=True)
    def __str__(self):
        return self.name
class Processus(models.Model):
    # Référentiel indépendant
    name = models.CharField(max_length=150)
    def __str__(self):
        return self.name
class ProcessusDoc(models.Model):
    name = models.CharField(max_length=50)
    content = models.FileField(upload_to='processus_docs/', blank=True, null=True)
    document_processus = models.ManyToManyField(Processus, related_name='ProcessDoc')

    def __str__(self):
        return f"{self.name} - Processus: {', '.join([p.name for p in self.document_processus.all()])}"


class TypeEquipement(models.Model):
    # Référentiel des types/familles
    name = models.CharField(max_length=120)
    def __str__(self):
        return self.name
class Equipement(models.Model):
    # Associations:
    # - chaque Equipement a UN type (TypeEquipement)
    # -chaque Equipement est localisé sur UN site (Site)
    type_equipement = models.ForeignKey(TypeEquipement, on_delete=models.PROTECT)
    site = models.ForeignKey(Site, on_delete=models.PROTECT)
    name = models.CharField(max_length=150)
    serial_number = models.CharField(max_length=120, blank=True)
    commentaire = models.TextField(blank=True)
    def __str__(self):
        return self.name

