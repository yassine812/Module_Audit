import os
import sys
import django

# Set up Django environment using the correct settings module
sys.path.insert(0, r"c:\Users\Yassine\Module_Audit-main-main\Module_Audit")
os.environ["DJANGO_SETTINGS_MODULE"] = "Module_Audit.settings"
django.setup()

from django.template import loader
from Organisation.models import Section
from audit.models import ResultatAudit

# Fetch all sections and resultats
sections = Section.objects.all()
resultats = ResultatAudit.objects.all()

print("Sections in DB:", [s.name for s in sections])
print("Resultats in DB:", [r.sujet for r in resultats])

# Render template
context = {
    'sections': sections,
    'resultats': resultats,
    'sort': 'id',
    'order': 'asc',
}

try:
    rendered = loader.render_to_string("audit/resultataudit/resultat_list.html", context)
    print("\nTemplate rendered successfully!")
    
    # Let's extract the select options and data-section attributes
    import re
    options = re.findall(r'<option[^>]*>.*?</option>', rendered)
    print("\nSelect Options:")
    for opt in options:
        print(" ", opt)
        
    data_sections = re.findall(r'data-section="([^"]*)"', rendered)
    print("\nRow Data Sections:")
    for ds in set(data_sections):
        print(" ", repr(ds))
except Exception as e:
    import traceback
    traceback.print_exc()
