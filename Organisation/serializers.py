from rest_framework import serializers
from .models import (Section,NiveauAttendu,Site,Processus,ProcessusDoc,TypeEquipement,Equipement,
)
# =========================================================
# SECTION
# =========================================================

class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ["id", "name"]


# =========================================================
# NIVEAU ATTENDU
# =========================================================

class NiveauAttenduSerializer(serializers.ModelSerializer):
    class Meta:
        model = NiveauAttendu
        fields = ["id", "name", "pourcentage", "commentaire"]


# =========================================================
# SITE
# =========================================================

class SiteWriteSerializer(serializers.ModelSerializer):
    """
    Used for POST / PUT / PATCH
    Expects section as ID
    """
    class Meta:
        model = Site
        fields = ["id", "section", "name", "niveau_evaluation"]


class SiteReadSerializer(serializers.ModelSerializer):
    """
    Used for GET
    Returns nested Section
    """
    section = SectionSerializer(read_only=True)

    class Meta:
        model = Site
        fields = ["id", "section", "name", "niveau_evaluation"]


# =========================================================
# PROCESSUS
# =========================================================

class ProcessusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Processus
        fields = ["id", "name"]


# =========================================================
# PROCESSUS DOCUMENT
# =========================================================

class ProcessusDocWriteSerializer(serializers.ModelSerializer):
    """
    Used for POST / PUT
    Expects document_processus as list of IDs
    """
    class Meta:
        model = ProcessusDoc
        fields = ["id", "name", "content", "document_processus"]


class ProcessusDocReadSerializer(serializers.ModelSerializer):
    """
    Used for GET
    Returns nested Processus list
    """
    document_processus = ProcessusSerializer(many=True, read_only=True)

    class Meta:
        model = ProcessusDoc
        fields = ["id", "name", "content", "document_processus"]


# =========================================================
# TYPE EQUIPEMENT
# =========================================================

class TypeEquipementSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeEquipement
        fields = ["id", "name"]


# =========================================================
# EQUIPEMENT
# =========================================================

class EquipementWriteSerializer(serializers.ModelSerializer):
    """
    Used for POST / PUT / PATCH
    Expects:
        - type_equipement as ID
        - site as ID
    """
    class Meta:
        model = Equipement
        fields = [
            "id",
            "type_equipement",
            "site",
            "name",
            "serial_number",
            "commentaire",
        ]


class EquipementReadSerializer(serializers.ModelSerializer):
    """
    Used for GET
    Returns nested type_equipement and site
    """
    type_equipement = TypeEquipementSerializer(read_only=True)
    site = SiteReadSerializer(read_only=True)

    class Meta:
        model = Equipement
        fields = [
            "id",
            "type_equipement",
            "site",
            "name",
            "serial_number",
            "commentaire",
        ]