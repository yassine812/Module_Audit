import re

with open(r'C:\Users\Yassine\Module_Audit-main-main\Module_Audit\Module_Audit\audit\templates\audit\formulaire\formulaire_form.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract script blocks
script_pattern = re.compile(r'<script>(.*?)</script>', re.DOTALL)
scripts = script_pattern.findall(content)

for idx, script in enumerate(scripts):
    print(f"Script block {idx+1} length: {len(script)}")
    # Count braces
    open_braces = script.count('{')
    close_braces = script.count('}')
    open_brackets = script.count('[')
    close_brackets = script.count(']')
    open_parens = script.count('(')
    close_parens = script.count(')')
    print(f"Braces: {{: {open_braces}, }}: {close_braces}")
    print(f"Brackets: [: {open_brackets}, ]: {close_brackets}")
    print(f"Parens: (: {open_parens}, ): {close_parens}")
