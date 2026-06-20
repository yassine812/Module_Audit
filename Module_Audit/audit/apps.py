from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit'

    def ready(self):
        import audit.signals
        
        import re
        from django.contrib.auth.models import User
        username_field = User._meta.get_field('username')
        for validator in username_field.validators:
            if hasattr(validator, 'regex'):
                validator.regex = re.compile(r'^[\w.@+\- ]+\Z')
                validator.message = "Saisissez un nom d'utilisateur valide. Cette valeur ne peut contenir que des lettres, des chiffres, des espaces et les caractères @/./+/-/_."
        username_field.help_text = "Requis. 150 caractères ou moins. Lettres, chiffres, espaces et @/./+/-/_ uniquement."
