from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User

class UsernameOrEmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        print(f"DEBUG: Trying to authenticate with: {username}")
        
        # Check if input looks like an email
        if '@' in username:
            print(f"DEBUG: Detected email input")
            users = User.objects.filter(email=username)
            print(f"DEBUG: Found {users.count()} users with email {username}")
            
            if users.exists():
                user = users.first()
                print(f"DEBUG: Using user: {user.username}, email: {user.email}")
                username = user.username
            else:
                print(f"DEBUG: No users found with email {username}")
        
        print(f"DEBUG: Final username for authentication: {username}")
        result = super().authenticate(request, username=username, password=password)
        print(f"DEBUG: Authentication result: {result}")
        
        return result
