import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from audit.models import SousCritere

User = get_user_model()
user = User.objects.filter(is_superuser=True).first()

c = Client(SERVER_NAME='127.0.0.1')
c.force_login(user)
response = c.get('/audit/sous-critere/create/', HTTP_X_REQUESTED_WITH='XMLHttpRequest')
print("Status Code:", response.status_code)
if response.status_code == 500:
    print("Error:")
    print(response.content.decode('utf-8'))
