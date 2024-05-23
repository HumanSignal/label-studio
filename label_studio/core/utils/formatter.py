from pythonjsonlogger import jsonlogger

from label_studio.core.current_request import get_current_request


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        request_id = None
        request = get_current_request()
        if request and 'X-Request-ID' in request.headers:
            request_id = request.headers['X-Request-ID']
        log_record['request_id'] = request_id
