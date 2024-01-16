"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import importlib.metadata

# Package name
package_name = 'label-studio'

# Package version
__version__ = importlib.metadata.metadata(package_name).get('version')

# pypi info
__latest_version__ = None
__current_version_is_outdated__ = False
__latest_version_upload_time__ = None
__latest_version_check_time__ = None
