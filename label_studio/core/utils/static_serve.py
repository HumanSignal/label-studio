"""
Views and functions for serving static files. These are only to be used
during development, and SHOULD NOT be used in a production setting.
"""

import mimetypes
import posixpath
from pathlib import Path

from core.utils.manifest_assets import get_manifest_asset
from django.http import (
    Http404,
    HttpResponseNotModified,
)
from django.utils._os import safe_join
from django.utils.http import http_date
from django.utils.translation import gettext as _
from django.views.static import was_modified_since
from ranged_fileresponse import RangedFileResponse


def serve(request, path, document_root=None, show_indexes=False, manifest_asset_prefix=None):
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

    If manifest_asset_prefix is provided, we will try to serve the file from the manifest.json
    if the file is not found in the document_root.

    Example:
        path = "main.js"
        document_root = "/dist/apps/labelstudio/"
        manifest_asset_prefix = "react-app"
        manifest_json = {"main.js": "/react-app/main.123456.js"}
        fullpath = Path(safe_join(document_root, "main.123456.js"))
    """
    path = posixpath.normpath(path).lstrip('/')
    fullpath = Path(safe_join(document_root, path))
    if fullpath.is_dir():
        raise Http404(_('Directory indexes are not allowed here.'))
    if manifest_asset_prefix and not fullpath.exists():
        possible_asset = get_manifest_asset(path)
        manifest_asset_prefix = (
            f'/{manifest_asset_prefix}' if not manifest_asset_prefix.startswith('/') else manifest_asset_prefix
        )
        possible_asset = possible_asset.removeprefix(manifest_asset_prefix)
        fullpath = Path(safe_join(document_root, possible_asset))
    if not fullpath.exists():
        raise Http404(_('“%(path)s” does not exist') % {'path': fullpath})
    # Respect the If-Modified-Since header.
    statobj = fullpath.stat()
    if not was_modified_since(request.META.get('HTTP_IF_MODIFIED_SINCE'), statobj.st_mtime):
        return HttpResponseNotModified()
    content_type, encoding = mimetypes.guess_type(str(fullpath))
    content_type = content_type or 'application/octet-stream'

    response = RangedFileResponse(request, fullpath.open('rb'), content_type=content_type)
    response['Last-Modified'] = http_date(statobj.st_mtime)
    if encoding:
        response['Content-Encoding'] = encoding
    return response
