from django.contrib.auth.mixins import UserPassesTestMixin


class SuperuserRequiredMixin(UserPassesTestMixin):
    """Mixin that requires the user to be a superuser."""
    
    def test_func(self):
        return self.request.user.is_superuser
