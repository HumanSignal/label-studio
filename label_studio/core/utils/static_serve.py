"""
Views and functions for serving static files. These are only to be used
during development, and SHOULD NOT be used in a production setting.
"""
import mimetypes
import posixpath
from pathlib import Path

from django.http import (
    FileResponse, Http404, HttpResponseNotModified,
)
from ranged_fileresponse import RangedFileResponse

from django.utils._os import safe_join
from django.utils.http import http_date
from django.utils.translation import gettext as _
from django.views.static import was_modified_since


def serve(request, path, document_root=None, show_indexes=False):
    """
    Serve static files below a given point in the directory structure.

    To use, put a URL pattern such as::

        from django.views.static import serve

        path('<path:path>', serve, {'document_root': '/path/to/my/files/'})

    in your URLconf. You must provide the ``document_root`` param. You may
    also set ``show_indexes`` to ``True`` if you'd like to serve a basic index
    of the directory.  This index view will use the template hardcoded below,
    but if you'd like to override it, you can create a template called
    ``static/directory_index.html``.
    """
    path = posixpath.normpath(path).lstrip('/')
    fullpath = Path(safe_join(document_root, path))
    if fullpath.is_dir():
        raise Http404(_("Directory indexes are not allowed here."))
    if not fullpath.exists():
        raise Http404(_('“%(path)s” does not exist') % {'path': fullpath})
    # Respect the If-Modified-Since header.
    statobj = fullpath.stat()
    if not was_modified_since(request.META.get('HTTP_IF_MODIFIED_SINCE'),
                              statobj.st_mtime, statobj.st_size):
        return HttpResponseNotModified()
    content_type, encoding = mimetypes.guess_type(str(fullpath))
    content_type = content_type or 'application/octet-stream'

    response = RangedFileResponse(request, fullpath.open('rb'), content_type=content_type)
    response["Last-Modified"] = http_date(statobj.st_mtime)
    if encoding:
        response["Content-Encoding"] = encoding
    return response
