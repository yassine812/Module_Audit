import os
import sys
import django

# Add current directory to path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from django.test import RequestFactory
from audit.views import CritereUpdateView
from audit.models import Critere

def diag():
    critere = Critere.objects.first()
    if not critere:
        print("No Critere found")
        return

    print(f"Testing for Critere ID: {critere.id}")
    factory = RequestFactory()
    url = f'/audit/critere/{critere.id}/update/'
    request = factory.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
    
    # Mock user
    from django.contrib.auth.models import User
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        user = User(username='testdiag', is_superuser=True)
    request.user = user

    try:
        import time
        start_time = time.time()
        view = CritereUpdateView.as_view()
        response = view(request, pk=critere.id)
        if hasattr(response, 'render'):
            response.render()
        end_time = time.time()
        
        print(f"Status: {response.status_code}")
        print(f"Render Time: {end_time - start_time:.4f}s")
        print(f"Content Length: {len(response.content)}")
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diag()
