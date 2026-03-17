from django.urls import path
from .views import (
    # Section
    SectionListView,
    SectionCreateView,
    SectionUpdateView,
    SectionDeleteView,

    # Site
    SiteListView,
    SiteCreateView,
    SiteUpdateView,
    SiteDeleteView,

    # Processus
    ProcessusListView,
    ProcessusCreateView,
    ProcessusUpdateView,
    ProcessusDeleteView,

    # ProcessusDoc
    ProcessusDocListView,

    # TypeEquipement
    TypeEquipementListView,
    TypeEquipementDetailView,
    TypeEquipementCreateView,
    TypeEquipementUpdateView,
    TypeEquipementDeleteView,

    # NiveauAttendu
    NiveauAttenduCreateView,
    NiveauAttenduUpdateView,
    NiveauAttenduDeleteView,

    # Equipement
    EquipementListView,
    EquipementDetailView,
    EquipementCreateView,
    EquipementUpdateView,
    EquipementDeleteView,
)

urlpatterns = [

    # =====================================================
    # SECTION
    # =====================================================
    path("sections/", SectionListView.as_view(), name="section_list"),
    path("sections/create/", SectionCreateView.as_view(), name="section_create"),
    path("sections/<int:pk>/update/", SectionUpdateView.as_view(), name="section_update"),
    path("sections/<int:pk>/delete/", SectionDeleteView.as_view(), name="section_delete"),

    # =====================================================
    # SITE
    # =====================================================
    path("sites/", SiteListView.as_view(), name="site_list"),
    path("sites/create/", SiteCreateView.as_view(), name="site_create"),
    path("sites/<int:pk>/update/", SiteUpdateView.as_view(), name="site_update"),
    path("sites/<int:pk>/delete/", SiteDeleteView.as_view(), name="site_delete"),

    # =====================================================
    # PROCESSUS
    # =====================================================
    path("processus/", ProcessusListView.as_view(), name="processus_list"),
    path("processus/create/", ProcessusCreateView.as_view(), name="processus_create"),
    path("processus/<int:pk>/update/", ProcessusUpdateView.as_view(), name="processus_update"),
    path("processus/<int:pk>/delete/", ProcessusDeleteView.as_view(), name="processus_delete"),

    # =====================================================
    # PROCESSUS DOCUMENT
    # =====================================================
    path("processus-docs/", ProcessusDocListView.as_view(), name="processusdoc_list"),

    # =====================================================
    # TYPE EQUIPEMENT
    # =====================================================
    path("types-equipements/", TypeEquipementListView.as_view(), name="typeequipement_list"),
    path("types-equipements/<int:pk>/", TypeEquipementDetailView.as_view(), name="typeequipement_detail"),
    path("types-equipements/create/", TypeEquipementCreateView.as_view(), name="typeequipement_create"),
    path("types-equipements/<int:pk>/update/", TypeEquipementUpdateView.as_view(), name="typeequipement_update"),
    path("types-equipements/<int:pk>/delete/", TypeEquipementDeleteView.as_view(), name="typeequipement_delete"),

    # =====================================================
    # NIVEAU ATTENDU
    # =====================================================
    path("niveau-attendu/create/", NiveauAttenduCreateView.as_view(), name="niveauattendu_create"),
    path("niveau-attendu/<int:pk>/update/", NiveauAttenduUpdateView.as_view(), name="niveauattendu_update"),
    path("niveau-attendu/<int:pk>/delete/", NiveauAttenduDeleteView.as_view(), name="niveauattendu_delete"),

    # =====================================================
    # EQUIPEMENT
    # =====================================================
    path("equipements/", EquipementListView.as_view(), name="equipement_list"),
    path("equipements/<int:pk>/", EquipementDetailView.as_view(), name="equipement_detail"),
    path("equipements/create/", EquipementCreateView.as_view(), name="equipement_create"),
    path("equipements/<int:pk>/update/", EquipementUpdateView.as_view(), name="equipement_update"),
    path("equipements/<int:pk>/delete/", EquipementDeleteView.as_view(), name="equipement_delete"),
]