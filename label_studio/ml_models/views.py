from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from rules.contrib.views import permission_required


@login_required
def model_interfaces_view(request):
    return render(request, 'ml_models/list.html', {}) 

