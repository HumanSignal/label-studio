from django.shortcuts import render
from django.http import HttpResponse
import requests

def landingpage(request):
    return render(request, 'landingpage.html')
