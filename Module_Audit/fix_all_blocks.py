import os
import re

paths = [
    r'C:\Users\Yassine\Module_Audit-main-main\Module_Audit\Module_Audit\Module_Audit\audit\templates\audit\formulaire\formulaire_form.html',
    r'C:\Users\Yassine\Module_Audit-main-main\Module_Audit\Module_Audit\audit\templates\audit\formulaire\formulaire_form.html',
    r'C:\Users\Yassine\Module_Audit-main-main\Module_Audit\audit\templates\audit\formulaire\formulaire_form.html',
    r'C:\Users\Yassine\Module_Audit-main-main\audit\templates\audit\formulaire\formulaire_form.html',
]

for p in paths:
    if not os.path.exists(p):
        print("Path does not exist:", p)
        continue
    print("Fixing path:", p)
    with open(p, 'rb') as f:
        raw = f.read()
    # Try with different encodings
    for enc in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
        try:
            content = raw.decode(enc)
            break
        except:
            content = None
    
    if content is None:
        print("  Could not decode file!")
        continue
    
    # Try with a more flexible pattern that handles Windows line endings
    matches = list(re.finditer(r'\{%\s*endblock\s*%\}', content))
    if not matches:
        print("  No endblock matches! Length:", len(content))
        print("  First 200 chars:", repr(content[:200]))
        continue
        
    print(f"  Found {len(matches)} endblocks at positions:", [m.start() for m in matches])
    
    if len(matches) >= 2:
        last_match = matches[-1]
        last_pos = last_match.start()
        
        if "addCritereStaticModal" in content[last_pos:]:
            print("  Detecting endblock BEFORE addCritereStaticModal. Fixing...")
            new_content = content[:last_pos] + content[last_match.end():]
            new_content = new_content.strip() + "\n\n{% endblock %}\n"
            
            with open(p, 'w', encoding=enc) as f:
                f.write(new_content)
            print("  Fixed successfully!")
        else:
            print("  Endblock is already at the end (after static modal). No fix needed.")
    elif len(matches) == 1:
        last_match = matches[0]
        last_pos = last_match.start()
        if "addCritereStaticModal" in content[last_pos:]:
            print("  Modal is after endblock. Moving endblock to end.")
            new_content = content[:last_pos] + content[last_match.end():]
            new_content = new_content.strip() + "\n\n{% endblock %}\n"
            with open(p, 'w', encoding=enc) as f:
                f.write(new_content)
            print("  Fixed successfully!")
        else:
            print("  Endblock is at end already. No fix needed.")
