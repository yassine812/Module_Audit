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
    ProcessusDocCreateView,
    ProcessusDocUpdateView,
    ProcessusDocDeleteView,
    processusdoc_open,

    # TypeEquipement
    TypeEquipementListView,
    TypeEquipementDetailView,
    TypeEquipementCreateView,
    TypeEquipementUpdateView,
    TypeEquipementDeleteView,

    # NiveauAttendu
    NiveauAttenduListView,
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
from .api_views import (
    SectionListAPIView, SectionDetailAPIView, 
    SiteListAPIView, SiteDetailAPIView,
    ProcessusListAPIView, ProcessusDetailAPIView,
    TypeEquipementListAPIView, TypeEquipementDetailAPIView,
    EquipementListAPIView, EquipementDetailAPIView,
    NiveauAttenduListAPIView, NiveauAttenduDetailAPIView,
    ProcessusDocListAPIView
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
    path("processus-docs/create/", ProcessusDocCreateView.as_view(), name="processusdoc_create"),
    path("processus-docs/<int:pk>/update/", ProcessusDocUpdateView.as_view(), name="processusdoc_update"),
    path("processus-docs/<int:pk>/delete/", ProcessusDocDeleteView.as_view(), name="processusdoc_delete"),
    path("processus-docs/<int:pk>/open/", processusdoc_open, name="processusdoc_open"),

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
    path("niveau-attendu/", NiveauAttenduListView.as_view(), name="niveauattendu_list"),
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

    # =====================================================
    # API ENDPOINTS
    # =====================================================
    path("api/sections/", SectionListAPIView.as_view(), name="api_section_list"),
    path("api/sections/<int:pk>/", SectionDetailAPIView.as_view(), name="api_section_detail"),
    
    path("api/sites/", SiteListAPIView.as_view(), name="api_site_list"),
    path("api/sites/<int:pk>/", SiteDetailAPIView.as_view(), name="api_site_detail"),
    
    path("api/processus/", ProcessusListAPIView.as_view(), name="api_processus_list"),
    path("api/processus/<int:pk>/", ProcessusDetailAPIView.as_view(), name="api_processus_detail"),
    
    path("api/types-equipements/", TypeEquipementListAPIView.as_view(), name="api_type_equipement_list"),
    path("api/types-equipements/<int:pk>/", TypeEquipementDetailAPIView.as_view(), name="api_type_equipement_detail"),
    
    path("api/equipements/", EquipementListAPIView.as_view(), name="api_equipement_list"),
    path("api/equipements/<int:pk>/", EquipementDetailAPIView.as_view(), name="api_equipement_detail"),
    
    path("api/niveau-attendu/", NiveauAttenduListAPIView.as_view(), name="api_niveau_attendu_list"),
    path("api/niveau-attendu/<int:pk>/", NiveauAttenduDetailAPIView.as_view(), name="api_niveau_attendu_detail"),
    
    path("api/processus-docs/", ProcessusDocListAPIView.as_view(), name="api_processus_doc_list"),
]