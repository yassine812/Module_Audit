from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.views import View


class LoginView(View):
    def get(self, request):
        return render(request, 'audit/login.html')
    
    def post(self, request):
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('typeaudit_list')
        else:
            return render(request, 'audit/login.html', {'error': 'Invalid credentials'})


class LogoutView(View):
    def get(self, request):
        logout(request)
        return redirect('login')
