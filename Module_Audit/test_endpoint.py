import urllib.request
import json

try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/audit/api/formulaire-audit/')
    res = req.read().decode('utf-8')
    print(res[:500])
except Exception as e:
    print("Error:", e)
