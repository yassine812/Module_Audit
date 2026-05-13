import os, sys, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'Module_Audit.settings'
sys.stdout.reconfigure(encoding='utf-8')
django.setup()

import re
from audit.models import ResultatAudit, Critere
from Organisation.models import ProcessusDoc

def norm(s):
    return re.sub(r'[^a-zA-Z0-9]', '', str(s)).lower() if s else ''

r = ResultatAudit.objects.get(pk=47)
details = list(r.detailresultataudit_set.all().order_by('id'))

# Build chain map from strict Critere -> ChapitreNorme -> TextRef -> ProcessusDoc
chain_map = {}
for c in Critere.objects.select_related(
    'chapitre_norme', 'chapitre_norme__text_ref', 'chapitre_norme__text_ref__text_ref'
).all():
    url = ''
    tr = c.chapitre_norme.text_ref if c.chapitre_norme else None
    if tr and tr.text_ref and tr.text_ref.content:
        url = tr.text_ref.content.url
    chain_map[norm(c.name)] = {
        'url': url,
        'page': c.chapitre_norme.page if c.chapitre_norme else 1,
        'has_strict_chain': bool(url),
        'chapitre_norme': c.chapitre_norme.name if c.chapitre_norme else None,
        'text_ref': tr.norme if tr else None,
        'processus_doc': (tr.text_ref.name if tr and tr.text_ref else None),
    }

# Build fuzzy fallback library
all_docs = {}
for d in ProcessusDoc.objects.exclude(content=""):
    if d.content:
        all_docs[norm(d.name)] = d.content.url
        filename = d.content.name.split('/')[-1].split('.')[0]
        all_docs[norm(filename)] = d.content.url

print("Step | Critere | ChapitreNorme | TextRef | ProcessusDoc | HasStrictChain | Page | FinalURL")
print("-" * 120)
for i, d in enumerate(details):
    c_key = norm(d.critere)
    info = chain_map.get(c_key, {})
    url = info.get('url', '')
    source = 'STRICT'

    if not url and d.norme:
        n_k = norm(d.norme)
        for dk, du in all_docs.items():
            if n_k in dk or dk in n_k:
                url = du
                source = f'FUZZY_NORME({dk})'
                break

    if not url and d.chapitre_norme:
        ch_k = norm(d.chapitre_norme)
        for dk, du in all_docs.items():
            if ch_k in dk or dk in ch_k:
                url = du
                source = f'FUZZY_CHAP({dk})'
                break

    if not url:
        source = 'NO_URL'

    print(f"Step {i+1:2d}: {d.critere[:25]:<25} | chap={info.get('chapitre_norme','?')[:20]:<20} | tr={info.get('text_ref','?')[:15]:<15} | doc={info.get('processus_doc','?')!s:<20} | strict={info.get('has_strict_chain',False)!s:<5} | page={info.get('page',1):<3} | src={source} | url=...{url[-35:] if url else 'EMPTY'}")
