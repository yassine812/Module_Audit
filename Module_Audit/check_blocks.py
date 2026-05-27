import re

paths = [
    r'C:\Users\Yassine\Module_Audit-main-main\Module_Audit\Module_Audit\audit\templates\audit\formulaire\formulaire_form.html',
    r'C:\Users\Yassine\Module_Audit-main-main\Module_Audit\audit\templates\audit\formulaire\formulaire_form.html',
]

for p in paths:
    print("Path:", p)
    try:
        with open(p, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for idx, line in enumerate(lines):
            if '{% endblock %}' in line or '{% endblock' in line:
                print(f"  Line {idx+1}: {line.strip()}")
    except Exception as e:
        print("  Error:", e)
