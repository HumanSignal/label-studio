import logging
from typing import Optional

from core.utils.common import load_func
from django.conf import settings

logger = logging.getLogger(__name__)


def get_or_infer_state(entity) -> Optional[str]:
    func = load_func(settings.FSM_INFERENCE_FUNCTION)
    return func(entity)
