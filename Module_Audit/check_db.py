import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("PRAGMA table_info(audit_resultataudit)")
    columns = [row[1] for row in cursor.fetchall()]

print("Columns in audit_resultataudit table:")
for col in columns:
    print(f"- {col}")
