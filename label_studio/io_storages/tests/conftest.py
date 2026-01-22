"""
Expose the shared fixture implementations from ``label_studio.tests`` so IO Storage tests
can run in isolation (pytest only auto-loads fixtures that live in parent directories).
"""

from label_studio.tests.conftest import business_client as _business_client  # noqa: F401
from label_studio.tests.utils import project_id as _project_id  # noqa: F401

# Re-export fixtures so pytest treats them as part of this subtree.
business_client = _business_client
project_id = _project_id
