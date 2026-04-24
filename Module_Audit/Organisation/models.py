from django.db import models
class Section(models.Model):
    name = models.CharField(max_length=120)
    def __str__(self):
        return self.name

class NiveauAttendu(models.Model):
    commentaire = models.TextField()
    valeur = models.DecimalField(max_digits=15, decimal_places=2)

    def __str__(self):
        return f"Niveau Attendu: {self.valeur} % - {self.commentaire[:50]}"

class Site(models.Model):
    name = models.CharField(max_length=150)
    niveau_evaluation = models.ManyToManyField(NiveauAttendu, related_name='niveau_evaluation')
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True)

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
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    name = models.CharField(max_length=150)
    serial_number = models.CharField(max_length=120, blank=True)
    commentaire = models.TextField(blank=True)
    def __str__(self):
        return self.name

