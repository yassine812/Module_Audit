from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.contenttypes.models import ContentType
from .middleware import get_current_user

# List of models we want to track for the Activity Feed
MODELS_TO_TRACK = [
    'audit.TypeAudit',
    'audit.FormulaireAudit',
    'Organisation.Processus',
    'Organisation.ProcessusDoc',
    'Organisation.Site',
    'Organisation.Section',
    'Organisation.Equipement',
    'Organisation.TypeEquipement',
]

def get_model_log_entry(instance, flag, message=""):
    user = get_current_user()
    if not user or not user.is_authenticated:
        return None
    
    ct = ContentType.objects.get_for_model(instance)
    # Use create() instead of log_action() for better compatibility
    LogEntry.objects.create(
        user_id=user.pk,
        content_type_id=ct.pk,
        object_id=str(instance.pk)[:200], # LogEntry uses TextField but some DBs have limits
        object_repr=str(instance)[:200],
        action_flag=flag,
        change_message=message or ("Créé" if flag == ADDITION else "Modifié" if flag == CHANGE else "Supprimé")
    )

@receiver(post_save)
def auto_log_save(sender, instance, created, **kwargs):
    model_name = f"{sender._meta.app_label}.{sender._meta.object_name}"
    if model_name in MODELS_TO_TRACK:
        flag = ADDITION if created else CHANGE
        get_model_log_entry(instance, flag)

@receiver(post_delete)
def auto_log_delete(sender, instance, **kwargs):
    model_name = f"{sender._meta.app_label}.{sender._meta.object_name}"
    if model_name in MODELS_TO_TRACK:
        get_model_log_entry(instance, DELETION)
