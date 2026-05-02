import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect(('127.0.0.1', 8000))
    print("PORT_OPEN")
except Exception as e:
    print(f"PORT_CLOSED: {e}")
finally:
    s.close()
