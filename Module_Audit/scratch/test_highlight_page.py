import os
import django
from django.test import RequestFactory
from django.contrib.auth import get_user_model

# Setup Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.views import ListeAuditListView
from audit.models import ListeAudit

User = get_user_model()

# Create request factory
rf = RequestFactory()

# Find a user with some audits
users = User.objects.all()
test_user = None
test_audit = None

for u in users:
    # Filter audits assigned to the user
    from django.db.models import Q
    user_audits = ListeAudit.objects.filter(Q(affectation=u) | Q(participants=u))
    if user_audits.count() > 1:
        test_user = u
        test_audit = user_audits.last()  # Choose the last one to check if pagination selects the correct page
        break

if not test_user:
    # Fallback to any user and audit if no user has multiple audits
    test_user = User.objects.first()
    test_audit = ListeAudit.objects.first()

if test_user and test_audit:
    print(f"Testing with User: {test_user.username}, Target Audit ID: {test_audit.id} ({test_audit.desc})")
    
    # Create request with highlight parameter
    request = rf.get(f'/audit/liste-audit/?highlight={test_audit.id}')
    request.user = test_user
    
    # Setup view
    view = ListeAuditListView()
    view.request = request
    view.args = []
    view.kwargs = {}
    
    # Trigger get method
    response = view.get(request)
    
    print("Resolved page in kwargs:", view.kwargs.get('page'))
    print("Response status code:", response.status_code)
else:
    print("No test data found.")
