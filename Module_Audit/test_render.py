import os
import sys

# Set up Django environment manually
sys.path.append(r"c:\Users\Yassine\Audit\Module_Audit")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Module_Audit.settings")

import django
django.setup()

from audit.views import SousCritereCreateView
from audit.models import SousCritere
from django.template.loader import render_to_string
from django.test.client import RequestFactory

# Create a dummy request
rf = RequestFactory()
request = rf.get('/audit/sous-critere/create/', HTTP_X_REQUESTED_WITH='XMLHttpRequest')
request.user = None

# Initialize the view
view = SousCritereCreateView()
view.request = request
view.kwargs = {}

# Get form
form_class = view.get_form_class()
form = form_class()
print("Form initialized successfully. Fields:", form.fields.keys())

# Render the modal template
try:
    rendered = render_to_string('audit/souscritere/souscritere_form_modal.html', {'form': form})
    print("Template rendered successfully.")
except Exception as e:
    print(f"Exception during rendering: {type(e).__name__} - {e}")
