import re

paths = [
    r'C:\Users\Yassine\Module_Audit-main-main\Module_Audit\Module_Audit\audit\templates\audit\formulaire\formulaire_form.html',
    r'C:\Users\Yassine\Module_Audit-main-main\Module_Audit\audit\templates\audit\formulaire\formulaire_form.html',
]

for p in paths:
    print("Checking path:", p)
    try:
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read()
        print("  Length:", len(content))
        print("  Contains 'addCritereStaticModal':", 'addCritereStaticModal' in content)
        print("  Contains 'openAddCritereModal':", 'openAddCritereModal' in content)
        print("  Occurrences of openAddCritereModal:", content.count('openAddCritereModal'))
    except Exception as e:
        print("  Error:", e)
