#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('c:\\Users\\Yassine\\Audit\\Module_Audit')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Module_Audit.settings')
django.setup()

from audit.models import TypeAudit, Section

print('=== TypeAudit objects ===')
for t in TypeAudit.objects.all():
    sections = [s.name for s in t.section.all()]
    print(f'{t.name}: sections={sections}')

print('\n=== Section objects ===')  
for s in Section.objects.all():
    print(f'{s.name}')

print('\n=== Creating test sections if needed ===')
sections_to_create = ['Sécurité', 'Maintenance', 'Qualité', 'Processus', 'Environnement']
for sec_name in sections_to_create:
    section, created = Section.objects.get_or_create(name=sec_name)
    if created:
        print(f'Created section: {sec_name}')

print('\n=== Linking sections to TypeAudit ===')
for audit_type in TypeAudit.objects.all():
    if audit_type.name == 'Audit interne':
        # Add Qualité and Processus
        audit_type.section.add(Section.objects.get(name='Qualité'))
        audit_type.section.add(Section.objects.get(name='Processus'))
        print(f'Added sections to {audit_type.name}')
    elif audit_type.name == 'Audit équipement':
        # Add Sécurité and Maintenance
        audit_type.section.add(Section.objects.get(name='Sécurité'))
        audit_type.section.add(Section.objects.get(name='Maintenance'))
        print(f'Added sections to {audit_type.name}')
    elif audit_type.name == 'Audit de poste':
        # Add Environnement
        audit_type.section.add(Section.objects.get(name='Environnement'))
        print(f'Added sections to {audit_type.name}')
