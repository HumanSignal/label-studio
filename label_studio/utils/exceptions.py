

# exception for import tasks or config validation
class ValidationError(Exception):
    def __init__(self, detail=None, code=''):
        class SubDetail:
            def __init__(self, msg, code):
                self.msg, self.code = msg, code

            def __str__(self):
                return self.msg

            def __add__(self, other):
                return self.msg + other

        super(ValidationError, self).__init__(detail)
        if isinstance(detail, list):
            self.detail = []
            for d in detail:
                if isinstance(d, str):
                    self.detail.append(SubDetail(d, code))

        elif isinstance(detail, str):
            self.detail = [SubDetail(detail, code)]

    def msg_to_list(self):
        return [d.msg for d in self.detail]


class LabelStudioError(Exception):
    pass
