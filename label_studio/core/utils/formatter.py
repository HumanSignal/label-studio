from typing import TYPE_CHECKING
from pythonjsonlogger import jsonlogger  # type: ignore[import]

if TYPE_CHECKING:
    from core.current_request import get_current_request
else:
    from label_studio.core.current_request import get_current_request


class CustomJsonFormatter(jsonlogger.JsonFormatter):  # type: ignore[misc]
    def add_fields(self, log_record, record, message_dict):  # type: ignore[no-untyped-def]
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        request_id = None
        request = get_current_request()  # type: ignore[no-untyped-call]
        if request and 'X-Request-ID' in request.headers:
            request_id = request.headers['X-Request-ID']
        log_record['request_id'] = request_id
