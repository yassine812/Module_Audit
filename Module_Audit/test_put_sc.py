import urllib.request
import json

data = json.dumps({
    "critere": 1,
    "content": "TEST CONTENT",
    "reaction": "TEST REACTION",
    "type_cotation": 1
}).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8000/audit/api/sous-criteres/1/', 
    data=data, 
    method='PUT',
    headers={'Content-Type': 'application/json'}
)

try:
    res = urllib.request.urlopen(req)
    print(res.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
