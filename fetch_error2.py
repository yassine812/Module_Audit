import urllib.request
try:
    req = urllib.request.Request('http://127.0.0.1:8000/audit/get-formulaire-structure/?formulaire_id=1', headers={'X-Requested-With': 'XMLHttpRequest'})
    res = urllib.request.urlopen(req)
    print(res.status)
except Exception as e:
    with open("error.html", "wb") as f:
        f.write(e.read())
    print("Error saved to error.html")
