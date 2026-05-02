class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            from django.http import HttpResponse
            response = HttpResponse()
        else:
            response = self.get_response(request)
        
        # When using withCredentials: true, the origin cannot be "*"
        # It must be the specific origin from the request
        origin = request.headers.get('Origin')
        if origin:
            response["Access-Control-Allow-Origin"] = origin
        else:
            response["Access-Control-Allow-Origin"] = "*"
            
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Bypass-Tunnel-Reminder"
        response["Access-Control-Allow-Credentials"] = "true"
        
        if request.method == "OPTIONS":
            response.status_code = 200
            
        return response
