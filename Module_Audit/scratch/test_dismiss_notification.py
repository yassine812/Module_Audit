import os
import django
from django.test import RequestFactory
from django.contrib.auth import get_user_model

# Setup Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.views import dismiss_notification, clear_all_notifications

User = get_user_model()
user = User.objects.first()

rf = RequestFactory()

# Mock session middleware
from django.contrib.sessions.middleware import SessionMiddleware
def get_response(req):
    return None
middleware = SessionMiddleware(get_response)

print("1. Testing dismiss_notification...")
request_dismiss = rf.post('/audit/notifications/dismiss/su-late-999/')
request_dismiss.user = user
middleware.process_request(request_dismiss)
request_dismiss.session.save()

response_dismiss = dismiss_notification(request_dismiss, 'su-late-999')
print("Dismiss Response Status:", response_dismiss.status_code)
print("Dismiss Response Content:", response_dismiss.content.decode('utf-8'))
print("Session Dismissed Notifications:", request_dismiss.session.get('dismissed_notifications'))

print("\n2. Testing clear_all_notifications...")
request_clear = rf.post('/audit/notifications/clear-all/')
request_clear.user = user
middleware.process_request(request_clear)
request_clear.session.save()

response_clear = clear_all_notifications(request_clear)
print("Clear All Response Status:", response_clear.status_code)
print("Clear All Response Content:", response_clear.content.decode('utf-8'))
print("Session Dismissed Notifications after Clear All:", request_clear.session.get('dismissed_notifications'))
