import json
from pathlib import Path

from django.conf import settings

# Load manifest.json once at module scope
_MANIFEST = {}
try:
    # If HMR is enabled, we don't need to read the manifest as it's not used
    # All assets are served from the webpack dev server in that case
    if not settings.FRONTEND_HMR:
        manifest_path = Path(settings.STATIC_ROOT) / 'js/manifest.json'
        if manifest_path.exists():
            with open(manifest_path, 'r') as f:
                _MANIFEST = json.load(f)
except Exception:
    # If there's any error reading the manifest, we'll use the default mapping
    pass


def get_manifest_asset(path: str) -> str:
    """Maps a path to its hashed filename using manifest.json, or falls back to /react-app/ prefix

    Usage in template:
    {% manifest_asset 'main.js' %}
    """
    if path in _MANIFEST:
        return f'{settings.FRONTEND_HOSTNAME}{_MANIFEST[path]}'
    # HMR: load modules from the Vite dev origin. Paths must match each edition's Vite root + index.html,
    # not Django's dist tree (same-origin would 404).
    # LSO: root = apps/labelstudio/src, script /main.tsx → /react-app/main.tsx.
    # LSE: root = apps/labelstudio, script ./src/main.tsx → /react-app/src/main.tsx.
    if settings.FRONTEND_HMR:
        if path == 'main.js':
            if getattr(settings, 'VERSION_EDITION', 'Community') == 'Enterprise':
                return f'{settings.FRONTEND_HOSTNAME}/react-app/src/main.tsx'
            return f'{settings.FRONTEND_HOSTNAME}/react-app/main.tsx'
        if path == 'embed.js':
            return f'{settings.FRONTEND_HOSTNAME}/react-app/src/embed.tsx'
        if path == 'embed-v2.js':
            return f'{settings.FRONTEND_HOSTNAME}/react-app/src/embed-v2.tsx'
        return f'{settings.FRONTEND_HOSTNAME}/react-app/{path}'
    return f'{settings.FRONTEND_HOSTNAME}/react-app/{path}'
