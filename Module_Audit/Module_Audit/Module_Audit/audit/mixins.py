from django.contrib.auth.mixins import UserPassesTestMixin


from django.contrib.admin.models import LogEntry, ADDITION, CHANGE
from django.contrib.contenttypes.models import ContentType
from django.views.generic import CreateView

class SuperuserRequiredMixin(UserPassesTestMixin):
    """Mixin that requires the user to be a superuser."""
    
    def test_func(self):
        return self.request.user.is_superuser


class AuditeurOrSuperuserRequiredMixin(UserPassesTestMixin):
    """Mixin that requires the user to be a superuser or in the 'Auditeur' group."""
    
    def test_func(self):
        user = self.request.user
        if not user.is_authenticated:
            return False
        
        # Check for superuser or groups
        if user.is_superuser:
            return True
            
        return user.groups.filter(name__in=['Auditeur', 'Participant']).exists()

class ActivityLogMixin:
    """Mixin to automatically create LogEntry records for Create/Update views."""
    def form_valid(self, form):
        is_new = isinstance(self, CreateView)
        response = super().form_valid(form)
        
        # self.object is set by super().form_valid(form)
        LogEntry.objects.log_action(
            user_id=self.request.user.pk,
            content_type_id=ContentType.objects.get_for_model(self.object).pk,
            object_id=self.object.pk,
            object_repr=str(self.object),
            action_flag=ADDITION if is_new else CHANGE,
            change_message="Créé via interface graphique" if is_new else "Modifié via interface graphique"
        )
        return response
