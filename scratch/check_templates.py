import os
import django
from django.template import Template, Context
from django.template.loader import get_template

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

template_paths = [
    'audit/listeaudit/liste_audit_list.html',
]

for path in template_paths:
    print(f"Trying to get template: {path}")
    try:
        t = get_template(path)
        print(f"Successfully loaded and compiled: {t.origin.name}")
    except Exception as e:
        print(f"Error loading {path}: {type(e).__name__}: {e}")
