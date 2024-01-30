from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def model_interfaces_view(request):
    return render(request, 'ml_models/list.html', {})
