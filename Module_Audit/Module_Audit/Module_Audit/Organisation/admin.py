from django.contrib import admin
from .models import (Section, Site, Processus, TypeEquipement,NiveauAttendu,Equipement,ProcessusDoc)
admin.site.register(Section)
admin.site.register(Site)
admin.site.register(Processus)
admin.site.register(TypeEquipement)
admin.site.register(NiveauAttendu)
admin.site.register(Equipement)
admin.site.register(ProcessusDoc)

