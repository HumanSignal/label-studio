"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import django

from django.urls import get_resolver
from django.shortcuts import reverse
from tasks.models import Annotation
from tasks.models import Task


owner_statuses = {
    '/tasks/1000/label': {'get': 200, 'post': 200, 'put': 405, 'patch': 405, 'delete': 405},
    '/tasks/1000/delete': {'get': 302, 'post': 404, 'put': 405, 'patch': 405, 'delete': 405},
    '/tasks/1000/explore': {'get': 200, 'post': 200, 'put': 405, 'patch': 405, 'delete': 405},
    '/api/tasks/1000/cancel': {'get': 405, 'post': 200, 'put': 405, 'patch': 405, 'delete': 405},
    '/api/tasks/1000/annotations/': {'get': 200, 'post': 201, 'put': 405, 'patch': 405, 'delete': 405},
    '/api/tasks/1000/annotations/1000/': {'get': 200, 'post': 405, 'put': 200, 'patch': 200, 'delete': 204},
    '/api/tasks/1000/': {'get': 200, 'post': 405, 'put': 400, 'patch': 400, 'delete': 204},
    '/api/projects/1000/annotations/': {'get': 405, 'post': 405, 'put': 405, 'patch': 405, 'delete': 204},
    '/api/projects/1000/results/': {'get': 200, 'post': 405, 'put': 405, 'patch': 405, 'delete': 405},
    '/api/projects/1000/tasks/bulk/': {'get': 405, 'post': 400, 'put': 405, 'patch': 405, 'delete': 405},
    '/api/projects/1000/tasks/': {'get': 200, 'post': 415, 'put': 405, 'patch': 405, 'delete': 204},
    '/annotator/invites/1000': {'get': 403, 'post': 403, 'put': 403, 'patch': 403, 'delete': 403},
    '/annotator/projects/1000/editor': {'get': 403, 'post': 403, 'put': 403, 'patch': 403, 'delete': 403},
    '/annotator/projects/': {'get': 403, 'post': 403, 'put': 403, 'patch': 403, 'delete': 403},
    '/annotator/account/': {'get': 403, 'post': 403, 'put': 403, 'patch': 403, 'delete': 403},
    '/annotator/signup/': {'get': 403, 'post': 403, 'put': 403, 'patch': 403, 'delete': 403},
    '/annotator/login/': {'get': 403, 'post': 403, 'put': 403, 'patch': 403, 'delete': 403},
    '/logout': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/api/': {'get': 200, 'post': 405, 'put': 405, 'patch': 405, 'delete': 405},
    '/api/projects/validate': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/template': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/1000/backends': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/1000/backends/connections': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/backends': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/1000/predict': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/1000/onboarding/1000': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/1000/next': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/1000/expert_instruction': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/1000/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/api/projects/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/upload-example/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/ml': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/plots': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/experts': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/delete': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/duplicate': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/upload-example/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/data': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/settings/edit-config': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/settings': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/1000/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/render': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/template/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/create/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/projects/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/business/not-approved': {'get': 200, 'post': 200, 'put': 200, 'patch': 200, 'delete': 200},
    '/business/stats': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/business/experts/list': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/user/account/': {'get': 401, 'post': 401, 'put': 401, 'patch': 401, 'delete': 401},
    '/user/signup/': {'get': 200, 'post': 200, 'put': 200, 'patch': 200, 'delete': 200},
    '/user/login/': {'get': 200, 'post': 200, 'put': 200, 'patch': 200, 'delete': 200},
    '/django-rq/queues/1000/1000/enqueue/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/requeue/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/actions/1000/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/delete/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/requeue-all/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/empty/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/deferred/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/started/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/finished/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/workers/1000/1000/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/workers/1000/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/queues/1000/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302},
    '/django-rq/stats.json/': {'get': 200, 'post': 200, 'put': 200, 'patch': 200, 'delete': 200},
    '/django-rq/': {'get': 302, 'post': 302, 'put': 302, 'patch': 302, 'delete': 302}}


other_business_statuses = {
    '/tasks/1000/label': {'get': 403, 'post': 403, 'put': 405, 'delete': 405},
    '/tasks/1000/delete': {'get': 403, 'post': 403, 'put': 405, 'delete': 405},
    '/tasks/1000/explore': {'get': 403, 'post': 403, 'put': 405, 'delete': 405},
    '/api/tasks/1000/cancel': {'get': 405, 'post': 403, 'put': 405, 'delete': 405},
    '/api/tasks/1000/annotations/': {'get': 403, 'post': 403, 'put': 405, 'delete': 405},
    '/api/tasks/1000/annotations/1000/': {'get': 403, 'post': 405, 'put': 403, 'delete': 403},
    '/api/tasks/1000/': {'get': 403, 'post': 405, 'put': 403, 'delete': 403},
    '/api/projects/1000/tasks/delete': {'get': 405, 'post': 405, 'put': 405, 'delete': 403},
    '/api/projects/1000/annotations/delete': {'get': 405, 'post': 405, 'put': 405, 'delete': 403},
    '/api/projects/1000/results/': {'get': 403, 'post': 405, 'put': 405, 'delete': 405},
    '/api/projects/1000/tasks/bulk/': {'get': 405, 'post': 403, 'put': 405, 'delete': 405},
    '/api/projects/1000/tasks/': {'get': 403, 'post': 415, 'put': 405, 'delete': 405},
    '/annotator/invites/1000': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/projects/1000/editor': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/projects/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/account/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/signup/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/login/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/logout': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/api/': {'get': 200, 'post': 405, 'put': 405, 'delete': 405},
    '/api/projects/validate': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/template': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/backends': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/predict': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/onboarding/1000': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/next': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/expert_instruction': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/upload-example/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/ml': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/plots': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/experts': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/delete': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/duplicate': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/upload-example/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/data/upload': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/data': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/settings/edit-config': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/settings': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/render': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/template/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/create/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/business/not-approved': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/business/stats': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/business/experts/list': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/user/account/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/user/signup/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/user/login/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/django-rq/queues/1000/1000/enqueue/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/requeue/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/actions/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/delete/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/requeue-all/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/empty/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/deferred/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/started/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/finished/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/workers/1000/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/workers/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/stats.json/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/django-rq/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302}}


other_annotator_statuses = {
    '/tasks/1000/label': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/tasks/1000/delete': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/tasks/1000/explore': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/tasks/1000/cancel': {'get': 405, 'post': 403, 'put': 405, 'delete': 405},
    '/api/tasks/1000/annotations/': {'get': 403, 'post': 403, 'put': 405, 'delete': 405},
    '/api/tasks/1000/annotations/1000/': {'get': 403, 'post': 405, 'put': 403, 'delete': 403},
    '/api/tasks/1000/': {'get': 403, 'post': 405, 'put': 403, 'delete': 403},
    '/api/projects/1000/tasks/delete': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/projects/1000/annotations/delete': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/projects/1000/results/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/projects/1000/tasks/bulk/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/projects/1000/tasks/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/invites/1000': {'get': 404, 'post': 404, 'put': 404, 'delete': 404},
    '/annotator/projects/1000/editor': {'get': 403, 'post': 403, 'put': 405, 'delete': 405},
    '/annotator/projects/': {'get': 200, 'post': 200, 'put': 405, 'delete': 405},
    '/annotator/account/': {'get': 200, 'post': 302, 'put': 405, 'delete': 405},
    '/annotator/signup/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/login/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/logout': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/api/': {'get': 200, 'post': 405, 'put': 405, 'delete': 405},
    '/api/projects/validate': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/template': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/backends': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/predict': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/onboarding/1000': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/next': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/expert_instruction': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/upload-example/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/ml': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/plots': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/experts': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/delete': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/duplicate': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/upload-example/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/data/upload': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/data': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/settings/edit-config': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/settings': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/render': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/template/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/create/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/business/not-approved': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/business/stats': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/business/experts/list': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/user/account/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/user/signup/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/user/login/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/django-rq/queues/1000/1000/enqueue/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/requeue/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/actions/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/delete/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/requeue-all/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/empty/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/deferred/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/started/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/finished/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/workers/1000/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/workers/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/stats.json/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/django-rq/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302}}


group_annotator_statuses = {
    '/tasks/1000/label': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/tasks/1000/delete': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/tasks/1000/explore': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/tasks/1000/cancel': {'get': 405, 'post': 403, 'put': 405, 'delete': 405},
    '/api/tasks/1000/annotations/': {'get': 403, 'post': 403, 'put': 405, 'delete': 405},
    '/api/tasks/1000/annotations/1000/': {'get': 403, 'post': 405, 'put': 403, 'delete': 403},
    '/api/tasks/1000/': {'get': 403, 'post': 405, 'put': 403, 'delete': 403},
    '/api/projects/1000/tasks/delete': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/projects/1000/annotations/delete': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/projects/1000/results/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/projects/1000/tasks/bulk/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/api/projects/1000/tasks/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/invites/1000': {'get': 404, 'post': 404, 'put': 404, 'delete': 404},
    '/annotator/projects/1000/editor': {'get': 403, 'post': 403, 'put': 405, 'delete': 405},
    '/annotator/projects/': {'get': 200, 'post': 200, 'put': 405, 'delete': 405},
    '/annotator/account/': {'get': 200, 'post': 302, 'put': 405, 'delete': 405},
    '/annotator/signup/': {'get': 403, 'post': 403, 'put': 403, 'delete': 403},
    '/annotator/login/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/logout': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/api/': {'get': 200, 'post': 405, 'put': 405, 'delete': 405},
    '/api/projects/validate': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/template': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/backends': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/predict': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/onboarding/1000': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/next': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/expert_instruction': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/api/projects/1000/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/upload-example/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/ml': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/plots': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/experts': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/delete': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/duplicate': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/upload-example/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/data/upload': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/data': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/settings/edit-config': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/settings': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/1000/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/render': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/template/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/create/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/projects/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/business/not-approved': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/business/stats': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/business/experts/list': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/user/account/': {'get': 401, 'post': 401, 'put': 401, 'delete': 401},
    '/user/signup/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/user/login/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/django-rq/queues/1000/1000/enqueue/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/requeue/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/actions/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/delete/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/requeue-all/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/empty/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/deferred/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/started/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/finished/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/workers/1000/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/workers/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/queues/1000/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302},
    '/django-rq/stats.json/': {'get': 200, 'post': 200, 'put': 200, 'delete': 200},
    '/django-rq/': {'get': 302, 'post': 302, 'put': 302, 'delete': 302}}


def build_urls(project_id, task_id, annotation_id):
    """ Get all the ulrs from django
    """
    urls = []
    exclude_urls = {'schema-json', 'schema-swagger-ui', 'schema-redoc'}
    resolver = get_resolver(None).reverse_dict
    for url_name in resolver:
        if isinstance(url_name, str) and url_name not in exclude_urls:
            keys = resolver[url_name][0][0][1]
            kwargs = {}
            for key in keys:
                if 'pk' in key:
                    kwargs[key] = 1000  # for example user_pk or project_pk will be 1000

                if key in ['pk', 'step_pk', 'job_id', 'queue_index']:
                    kwargs[key] = 1000
                elif key in ['token', 'uidb64']:
                    kwargs[key] = 1000
                elif key in ['key']:
                    kwargs[key] = '1000'

                # we need to use really existing project/task/annotation ids from fixture
                if key == 'project_id' or key == 'project_pk':
                    kwargs[key] = project_id
                elif key == 'task_id':
                    kwargs[key] = task_id
                elif key == 'annotation_id':
                    kwargs[key] = annotation_id
                elif 'id' in key:
                    kwargs[key] = 1

                if url_name == 'password_reset_confirm':
                    kwargs['token'] = '1000-1000'
                    kwargs['uidb64'] = '1000'
            try:
                url = reverse(url_name, kwargs=kwargs)
            except django.urls.exceptions.NoReverseMatch as e:
                print(f'\n\n ---> Could not find "{url_name}" with django reverse and kwargs "{kwargs}".\n'
                      f'Probably some kwarg is absent\n\n')
                raise e

            exclude = ['/password-reset/complete/', '/password-reset/']
            add = True
            for exc in exclude:
                if url.startswith(exc):
                    add = False

            if add:
                urls.append(url)

    return urls


def restore_objects(project):
    """ Create task and annotation for URL tests
    """
    # task_db, annotation_db = None, None

    if project.pk != 1000:
        project.pk = 1000
        project.title += '2'
        project.save()
    try:
        task_db = Task.objects.get(pk=1000)
    except Task.DoesNotExist:
        task_db = Task()
        task_db.data = {"data": {"image": "kittens.jpg"}}
        task_db.project = project
        task_db.id = 1000  # we need to use id 1000 to avoid db last start
        task_db.save()

    try:
        annotation_db = Annotation.objects.get(pk=1000)
    except Annotation.DoesNotExist:
        task_db = Task.objects.get(pk=1000)
        annotation_db = Annotation()
        annotation = [{"from_name": "some", "to_name": "x", "type": "none", "value": {"none": ["Opossum"]}}]
        annotation_db.result = annotation
        annotation_db.id = 1000  # we need to use id 1000 to avoid db last start
        annotation_db.task = task_db
        annotation_db.save()

    return task_db, annotation_db


def check_urls(urls, runner, match_statuses, project):
    statuses = {}
    for url in urls:
        print('-->', url)
        status = {}
        restore_objects(project)

        r = runner.get(url)
        status['get'] = r.status_code

        r = runner.post(url)
        status['post'] = r.status_code

        r = runner.put(url)
        status['put'] = r.status_code

        r = runner.patch(url)
        status['patch'] = r.status_code

        r = runner.delete(url)
        status['delete'] = r.status_code


        #assert url in match_statuses, '\nNew URL found, please check statuses and add \n\n' \
        #                              + url + ': ' + str(status) + \
        #                              '\n\nto dict \n\n' + runner.statuses_name + '\n'

        statuses[url] = status
        #assert match_statuses[url] == status, f'Expected statuses mismatch: "{url}"'

    # print(statuses)  # use this to collect urls -> statuses dict


def run(owner, runner):
    """ Get all urls from Django and GET/POST/PUT/DELETE them
    """
    owner.task_db, owner.annotation_db = restore_objects(owner.project)
    urls = build_urls(owner.project.id, owner.task_db.id, owner.annotation_db.id)

    check_urls(urls, runner, runner.statuses, owner.project)


@pytest.mark.django_db
def test_all_urls_owner(setup_project_choices):
    runner = owner = setup_project_choices
    runner.statuses = owner_statuses
    runner.statuses_name = 'owner_statuses'
    run(owner, runner)


@pytest.mark.django_db
def test_all_urls_other_business(setup_project_choices, business_client):
    business_client.statuses = other_business_statuses
    business_client.statuses_name = 'other_business_statuses'
    run(setup_project_choices, business_client)
