# from projects.models import Project
from projects.api import ProjectListAPI
from projects.cache import cached_projects_set, cached_projects_get

# XXX this is never reached
def cache_projects_list(user, request):
    response = cached_projects_get(user.id)
    if not response:
        response = ProjectListAPI.get(self, request, [], {})
        cached_projects_set(user.id, response.data)
