from django.contrib import admin
from .models import (
    TextRef,ChapitreNorme,Critere,
    TypeCotation,TypePreuve,PreuveAttendu,
    SousCritere,FormulaireAudit,TypeAudit,ListeAudit,
    Cotation,FormulaireSousCritere,ResultatAudit,
    SousCritereTypeAudit,DetailResultatAudit
)

admin.site.register(TextRef)
admin.site.register(ChapitreNorme)
admin.site.register(Critere)
admin.site.register(TypeCotation)
admin.site.register(TypePreuve)
admin.site.register(PreuveAttendu)
admin.site.register(SousCritere)
admin.site.register(FormulaireAudit)
admin.site.register(TypeAudit)
admin.site.register(ListeAudit)
admin.site.register(Cotation)
admin.site.register(FormulaireSousCritere)
admin.site.register(ResultatAudit)
admin.site.register(SousCritereTypeAudit)
admin.site.register(DetailResultatAudit)
