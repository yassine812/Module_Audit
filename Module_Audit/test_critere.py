import urllib.request
import json

try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/audit/api/criteres/')
    res = req.read().decode('utf-8')
    data = json.loads(res)['data']
    print(json.dumps(data[:3], indent=2))
except Exception as e:
    print("Error:", e)
