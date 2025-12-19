# This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.

from django.urls import path

from . import views

app_name = 'billing'

urlpatterns = [
    path('status/', views.billing_status, name='billing-status'),
    path('checkout/', views.create_checkout, name='create-checkout'),
    path('portal/', views.create_portal_session, name='create-portal'),
]
