from .v1.api import *
from .v2.api import *
from core.api_versioning import VersionedAPIView


class ExportListAPIVersioned(VersionedAPIView):
    versions = {
        'v1': ExportListAPI,
        'v2': ExportListAPIV2
    }
