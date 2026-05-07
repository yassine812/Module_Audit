import os
import django

# Setup Django before ANY other imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from django.conf import settings
from django.test import RequestFactory
from audit.views import CritereCreateView
from django.contrib.auth.models import User

def test_view():
    factory = RequestFactory()
    # Create a superuser for the request
    user, _ = User.objects.get_or_create(username='admin', is_superuser=True)
    
    url = '/audit/critere/create/'
    request = factory.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
    request.user = user
    
    view = CritereCreateView.as_view()
    try:
        response = view(request)
        print(f"Status: {response.status_code}")
        if hasattr(response, 'render'):
            response.render()
        print(f"Content length: {len(response.content)}")
        # Print first 500 chars of content
        print(response.content.decode()[:500])
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_view()
