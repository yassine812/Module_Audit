from rest_framework import serializers
from django.contrib.auth.models import User
from Organisation.models import Section, Site, Processus, TypeEquipement
from .models import (
    TextRef,
    ChapitreNorme,
    Critere,
    TypeCotation,
    TypePreuve,
    PreuveAttendu,
    SousCritere,
    TypeAudit,
    FormulaireAudit,
    FormulaireSousCritere,
    ListeAudit,
    SousCritereTypeAudit,
    Cotation,
    ResultatAudit,
    DetailResultatAudit,
)

# =====================================================
# USER
# =====================================================

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


# =====================================================
# REFERENTIAL
# =====================================================

class TextRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = TextRef
        fields = "__all__"


class ChapitreNormeSerializer(serializers.ModelSerializer):
    text_ref = TextRefSerializer(read_only=True)
    text_ref_id = serializers.PrimaryKeyRelatedField(
        queryset=TextRef.objects.all(),
        source="text_ref",
        write_only=True,
        required=False
    )

    class Meta:
        model = ChapitreNorme
        fields = "__all__"


class CritereSerializer(serializers.ModelSerializer):
    chapitre_norme = ChapitreNormeSerializer(read_only=True)
    chapitre_norme_id = serializers.PrimaryKeyRelatedField(
        queryset=ChapitreNorme.objects.all(),
        source="chapitre_norme",
        write_only=True,
        required=False
    )

    class Meta:
        model = Critere
        fields = "__all__"


# =====================================================
# TYPES & PREUVE
# =====================================================

class TypeCotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeCotation
        fields = "__all__"


class TypePreuveSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypePreuve
        fields = "__all__"


class PreuveAttenduSerializer(serializers.ModelSerializer):
    type_preuve = TypePreuveSerializer(read_only=True)
    type_preuve_id = serializers.PrimaryKeyRelatedField(
        queryset=TypePreuve.objects.all(),
        source="type_preuve",
        write_only=True,
        required=False
    )

    class Meta:
        model = PreuveAttendu
        fields = "__all__"


# =====================================================
# SOUS CRITERE
# =====================================================

class SousCritereSerializer(serializers.ModelSerializer):
    critere = CritereSerializer(read_only=True)
    critere_id = serializers.PrimaryKeyRelatedField(
        queryset=Critere.objects.all(),
        source="critere",
        write_only=True
    )

    type_cotation = TypeCotationSerializer(read_only=True)
    type_cotation_id = serializers.PrimaryKeyRelatedField(
        queryset=TypeCotation.objects.all(),
        source="type_cotation",
        write_only=True,
        required=False
    )

    preuve_attendu = PreuveAttenduSerializer(many=True, read_only=True)
    preuve_attendu_ids = serializers.PrimaryKeyRelatedField(
        queryset=PreuveAttendu.objects.all(),
        many=True,
        write_only=True,
        source="preuve_attendu"
    )

    class Meta:
        model = SousCritere
        fields = "__all__"


# =====================================================
# TYPE AUDIT + THROUGH
# =====================================================

class SousCritereTypeAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = SousCritereTypeAudit
        fields = "__all__"


class TypeAuditSerializer(serializers.ModelSerializer):
    section = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        many=True
    )

    class Meta:
        model = TypeAudit
        fields = "__all__"


# =====================================================
# FORMULAIRE
# =====================================================

class FormulaireSousCritereSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormulaireSousCritere
        fields = "__all__"


class FormulaireAuditSerializer(serializers.ModelSerializer):

    section = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        many=True
    )

    type_audit_id = serializers.PrimaryKeyRelatedField(
        queryset=TypeAudit.objects.all(),
        source="type_audit",
        required=False
    )

    processus_id = serializers.PrimaryKeyRelatedField(
        queryset=Processus.objects.all(),
        source="processus",
        required=False
    )

    type_equipement_id = serializers.PrimaryKeyRelatedField(
        queryset=TypeEquipement.objects.all(),
        source="type_equipement",
        required=False
    )

    sous_criteres = FormulaireSousCritereSerializer(
        source="formulairesouscritere_set",
        many=True,
        read_only=True
    )

    class Meta:
        model = FormulaireAudit
        fields = "__all__"


# =====================================================
# LISTE AUDIT (PLANNING)
# =====================================================

class ListeAuditSerializer(serializers.ModelSerializer):

    affectation = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True
    )

    formulaire_audit_id = serializers.PrimaryKeyRelatedField(
        queryset=FormulaireAudit.objects.all(),
        source="formulaire_audit",
        required=False
    )

    class Meta:
        model = ListeAudit
        fields = "__all__"


# =====================================================
# COTATION
# =====================================================

class CotationSerializer(serializers.ModelSerializer):
    type_cotation = TypeCotationSerializer(read_only=True)
    type_cotation_id = serializers.PrimaryKeyRelatedField(
        queryset=TypeCotation.objects.all(),
        source="type_cotation",
        write_only=True,
        required=False
    )

    class Meta:
        model = Cotation
        fields = "__all__"


# =====================================================
# EXECUTION ENGINE
# =====================================================

class DetailResultatAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetailResultatAudit
        fields = "__all__"


class ResultatAuditSerializer(serializers.ModelSerializer):

    audit_id = serializers.PrimaryKeyRelatedField(
        queryset=ListeAudit.objects.all(),
        source="audit"
    )

    site_id = serializers.PrimaryKeyRelatedField(
        queryset=Site.objects.all(),
        source="site",
        required=False
    )

    auditeur_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="auditeur"
    )

    co_auditeur = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        required=False
    )

    audites = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        required=False
    )

    details = DetailResultatAuditSerializer(
        source="detailresultataudit_set",
        many=True,
        read_only=True
    )

    class Meta:
        model = ResultatAudit
        fields = "__all__"