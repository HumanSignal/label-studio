from django.urls import path, include
from rest_framework.views import APIView


class VersionedAPIView(APIView):
    versions = {}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.version_instance = None

    def dispatch(self, request, *args, **kwargs):
        version = request.version

        if version not in self.versions:
            return HttpResponseNotFound()

        view_class = self.versions[version]
        self.version_instance = view_class()
        self.version_instance.version = version
        view = self.version_instance.as_view()

        # Set attributes from the version_instance to the VersionedAPIView
        for attr_name in dir(self.version_instance):
            attr_value = getattr(self.version_instance, attr_name)
            if not callable(attr_value) and not attr_name.startswith('_'):
                setattr(self, attr_name, attr_value)

        return super().dispatch(request, *args, **kwargs)

    # def dispatch(self, request, *args, **kwargs):
    #     version = request.version

    #     if version not in self.versions:
    #         return HttpResponseNotFound()

    #     view_class = self.versions[version]
    #     view = view_class.as_view()
    #     return view(request, *args, **kwargs)
