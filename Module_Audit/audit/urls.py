from django.urls import path
from .views import *
from .auth import LoginView, LogoutView
from .api_views import (
    LoginAPIView, LogoutAPIView, TypeAuditListAPIView, 
    TypeAuditDetailAPIView, ChapitreNormeListAPIView, CritereListAPIView, TypeCotationListAPIView, SousCritereListAPIView, FormulaireAuditListAPIView, ListeAuditListAPIView, ResultatAuditListAPIView, TypePreuveListAPIView, PreuveAttenduListAPIView, SousCritereTypeAuditListAPIView, FormulaireSousCritereListAPIView, TextRefListAPIView
)

urlpatterns = [

    # =====================================================
    # AUTHENTICATION
    # =====================================================
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    
    # =====================================================
    # DASHBOARD
    # =====================================================
    path("", DashboardView.as_view(), name="dashboard"),

    # =====================================================
    # TYPE AUDIT
    # =====================================================
    path("type-audit/", TypeAuditListView.as_view(), name="typeaudit_list"),
    path("type-audit/create/", TypeAuditCreateView.as_view(), name="typeaudit_create"),
    path("type-audit/<int:pk>/edit/", TypeAuditUpdateView.as_view(), name="typeaudit_update"),
    path("type-audit/<int:pk>/delete/", TypeAuditDeleteView.as_view(), name="typeaudit_delete"),

    # =====================================================
    # TEXT REF
    # =====================================================
    path("textref/", TextRefListView.as_view(), name="textref_list"),
    path("textref/create/", TextRefCreateView.as_view(), name="textref_create"),
    path("textref/<int:pk>/edit/", TextRefUpdateView.as_view(), name="textref_update"),
    path("textref/<int:pk>/delete/", TextRefDeleteView.as_view(), name="textref_delete"),

    # =====================================================
    # CHAPITRE NORME
    # =====================================================
    path("chapitres/", ChapitreNormeListView.as_view(), name="chapitre_list"),
    path("chapitres/create/", ChapitreNormeCreateView.as_view(), name="chapitre_create"),
    path("chapitres/<int:pk>/update/", ChapitreNormeUpdateView.as_view(), name="chapitre_update"),
    path("chapitres/<int:pk>/delete/", ChapitreNormeDeleteView.as_view(), name="chapitre_delete"),

    # =====================================================
    # CRITERE
    # =====================================================
    path("critere/", CritereListView.as_view(), name="critere_list"),
    path("critere/create/", CritereCreateView.as_view(), name="critere_create"),
    path("critere/<int:pk>/edit/", CritereUpdateView.as_view(), name="critere_update"),
    path("critere/<int:pk>/delete/", CritereDeleteView.as_view(), name="critere_delete"),

    # =====================================================
    # SOUS CRITERE
    # =====================================================
    path("sous-critere/", SousCritereListView.as_view(), name="souscritere_list"),
    path("sous-critere/create/", SousCritereCreateView.as_view(), name="souscritere_create"),
    path("sous-critere/<int:pk>/edit/", SousCritereUpdateView.as_view(), name="souscritere_update"),
    path("sous-critere/<int:pk>/delete/", SousCritereDeleteView.as_view(), name="souscritere_delete"),

    # =====================================================
    # TYPE PREUVE
    # =====================================================
    path("type-preuve/", TypePreuveListView.as_view(), name="typepreuve_list"),
    path("type-preuve/create/", TypePreuveCreateView.as_view(), name="typepreuve_create"),
    path("type-preuve/<int:pk>/edit/", TypePreuveUpdateView.as_view(), name="typepreuve_update"),
    path("type-preuve/<int:pk>/delete/", TypePreuveDeleteView.as_view(), name="typepreuve_delete"),

    # =====================================================
    # PREUVE ATTENDUE
    # =====================================================
    path("preuve-attendue/", PreuveAttenduListView.as_view(), name="preuveattendu_list"),
    path("preuve-attendue/create/", PreuveAttenduCreateView.as_view(), name="preuveattendu_create"),
    path("preuve-attendue/<int:pk>/", PreuveAttenduDetailView.as_view(), name="preuveattendu_detail"),
    path("preuve-attendue/<int:pk>/edit/", PreuveAttenduUpdateView.as_view(), name="preuveattendu_update"),
    path("preuve-attendue/<int:pk>/delete/", PreuveAttenduDeleteView.as_view(), name="preuveattendu_delete"),

    # =====================================================
    # TYPE COTATION
    # =====================================================
    path("typecotation/", TypeCotationListView.as_view(), name="typecotation_list"),
    path("typecotation/create/", TypeCotationCreateView.as_view(), name="typecotation_create"),
    path("typecotation/<int:pk>/edit/", TypeCotationUpdateView.as_view(), name="typecotation_update"),
    path("typecotation/<int:pk>/delete/", TypeCotationDeleteView.as_view(), name="typecotation_delete"),

    # =====================================================
    # COTATION
    # =====================================================
    path("cotation/", CotationListView.as_view(), name="cotation_list"),
    path("cotation/create/", CotationCreateView.as_view(), name="cotation_create"),
    path("cotation/<int:pk>/", CotationDetailView.as_view(), name="cotation_detail"),
    path("cotation/<int:pk>/edit/", CotationUpdateView.as_view(), name="cotation_update"),
    path("cotation/<int:pk>/delete/", CotationDeleteView.as_view(), name="cotation_delete"),

    # =====================================================
    # FORMULAIRE AUDIT
    # =====================================================
    path("formulaire/", FormulaireAuditListView.as_view(), name="formulaire_list"),
    path("formulaire/create/", FormulaireAuditCreateView.as_view(), name="formulaire_create"),
    path("formulaire/<int:pk>/", FormulaireAuditDetailView.as_view(), name="formulaire_detail"),
    path("formulaire/<int:pk>/edit/", FormulaireAuditUpdateView.as_view(), name="formulaire_update"),
    path("formulaire/<int:pk>/delete/", FormulaireAuditDeleteView.as_view(), name="formulaire_delete"),

    # Special Business Views
    path("formulaire/<int:pk>/sync/", FormulaireSyncView.as_view(), name="formulaire_sync"),
    path("formulaire/<int:pk>/reorder/", FormulaireReorderView.as_view(), name="formulaire_reorder"),

    # =====================================================
    # LISTE AUDIT (PLANNING)
    # =====================================================
    path("liste-audit/", ListeAuditListView.as_view(), name="liste_audit_list"),
    path("liste-audit/create/", ListeAuditCreateView.as_view(), name="liste_audit_create"),
    path("liste-audit/<int:pk>/", ListeAuditDetailView.as_view(), name="liste_audit_detail"),
    path("liste-audit/<int:pk>/edit/", ListeAuditUpdateView.as_view(), name="liste_audit_update"),
    # path("liste-audit/<int:pk>/delete/", ListeAuditDeleteView.as_view(), name="liste_audit_delete"),

    # =====================================================
    # EXECUTION ENGINE
    # =====================================================
    path("liste-audit/<int:pk>/start/", StartAuditView.as_view(), name="start_audit"),

    path("resultat/", ResultatAuditListView.as_view(), name="resultat_list"),
    path("resultat/<int:pk>/", ResultatAuditDetailView.as_view(), name="resultat_detail"),
    path("resultat/<int:pk>/update-detail/", DetailResultatAuditUpdateView.as_view(), name="detail_update"),
    path("resultat/<int:pk>/close/", CloseAuditView.as_view(), name="resultat_close"),
    path("resultat/<int:pk>/report/", ResultatAuditReportView.as_view(), name="resultat_report"),

    # =====================================================
    # API ENDPOINTS
    # =====================================================
    path("api/login/", LoginAPIView.as_view(), name="api_login"),
    path("api/logout/", LogoutAPIView.as_view(), name="api_logout"),
    path("api/type-audit/", TypeAuditListAPIView.as_view(), name="api_typeaudit_list"),
    path("api/type-audit/<int:pk>/", TypeAuditDetailAPIView.as_view(), name="api_typeaudit_detail"),
    path("api/textref/", TextRefListAPIView.as_view(), name="api_textref_list"),
    path("api/chapitre-norme/", ChapitreNormeListAPIView.as_view(), name="api_chapitre_norme_list"),
    path("api/criteres/", CritereListAPIView.as_view(), name="api_critere_list"),
    path("api/type-cotation/", TypeCotationListAPIView.as_view(), name="api_type_cotation_list"),
    path("api/sous-criteres/", SousCritereListAPIView.as_view(), name="api_sous_critere_list"),
    path("api/formulaire-audit/", FormulaireAuditListAPIView.as_view(), name="api_formulaire_audit_list"),
    path("api/liste-audit/", ListeAuditListAPIView.as_view(), name="api_liste_audit_list"),
    path("api/resultat-audit/", ResultatAuditListAPIView.as_view(), name="api_resultat_audit_list"),
    path("api/type-preuve/", TypePreuveListAPIView.as_view(), name="api_type_preuve_list"),
    path("api/preuve-attendu/", PreuveAttenduListAPIView.as_view(), name="api_preuve_attendu_list"),
    path("api/sous-critere-type-audit/", SousCritereTypeAuditListAPIView.as_view(), name="api_sous_critere_type_audit_list"),
    path("api/formulaire-sous-critere/", FormulaireSousCritereListAPIView.as_view(), name="api_formulaire_sous_critere_list"),
]