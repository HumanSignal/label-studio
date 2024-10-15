import ssl

from django.core.mail.backends.smtp import EmailBackend
from django.utils.functional import cached_property


class NoVerificationEmailBackend(EmailBackend):
    """SMTP email backend that does not verify SSL certificates or hostname
    if no certfile or keyfile is provided. This is equivalent to the behavior
    of Django's smtp.EmailBackend prior to Django 4. If EmailBackend
    works for you, prefer that as it's more secure than this.
    """

    @cached_property
    def ssl_context(self):
        if self.ssl_certfile or self.ssl_keyfile:
            ssl_context = ssl.SSLContext(protocol=ssl.PROTOCOL_TLS_CLIENT)
            ssl_context.load_cert_chain(self.ssl_certfile, self.ssl_keyfile)
            return ssl_context
        else:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            return ssl_context
