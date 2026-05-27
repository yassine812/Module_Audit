target = r'c:\Users\Yassine\Module_Audit-main-main\Module_Audit\audit\templates\audit\resultataudit\etape_audit.html'
content = open(r'c:\Users\Yassine\Module_Audit-main-main\etape_source.txt', encoding='utf-8').read()
open(target, 'w', encoding='utf-8').write(content)
import re
eb = len(re.findall(r'\{%[-\s]*(end)?block', content))
print('DONE, block tags:', eb, 'lines:', content.count('\n'))
