import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from django.template.loader import get_template
try:
    tmpl = get_template('audit/listeaudit/liste_audit_form.html')
    print("RESOLVED PATH:", tmpl.origin.name)
except Exception as e:
    print("ERROR:", e)
