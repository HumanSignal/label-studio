"""Pytest fixtures for tasks tests."""
import pytest
from core.feature_flags import flag_set as original_flag_set


@pytest.fixture(name='fflag_fix_all_fit_720_lazy_load_annotations_on')
def fflag_fix_all_fit_720_lazy_load_annotations_on(monkeypatch):
    """Enable the lazy load annotations feature flag (FIT-720).

    Uses monkeypatch to patch flag_set at the source module level,
    ensuring all imports see the patched version.
    """

    def patched_flag_set(feature_flag, *args, **kwargs):
        if feature_flag == 'fflag_fix_all_fit_720_lazy_load_annotations':
            return True
        return original_flag_set(feature_flag, *args, **kwargs)

    # Patch at the source module so all imports see it
    monkeypatch.setattr('core.feature_flags.flag_set', patched_flag_set)
    # Also patch where it's imported in tasks.api
    monkeypatch.setattr('tasks.api.flag_set', patched_flag_set)


@pytest.fixture(name='fflag_fix_all_fit_720_lazy_load_annotations_off')
def fflag_fix_all_fit_720_lazy_load_annotations_off(monkeypatch):
    """Disable the lazy load annotations feature flag (FIT-720).

    Uses monkeypatch to patch flag_set at the source module level,
    ensuring all imports see the patched version.
    """

    def patched_flag_set(feature_flag, *args, **kwargs):
        if feature_flag == 'fflag_fix_all_fit_720_lazy_load_annotations':
            return False
        return original_flag_set(feature_flag, *args, **kwargs)

    # Patch at the source module so all imports see it
    monkeypatch.setattr('core.feature_flags.flag_set', patched_flag_set)
    # Also patch where it's imported in tasks.api
    monkeypatch.setattr('tasks.api.flag_set', patched_flag_set)
