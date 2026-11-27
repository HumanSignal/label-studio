from core.utils.static_serve import static_file_content_type_and_encoding


class TestStaticFileContentType:
    def test_mjs_defaults_to_javascript_when_guess_type_unknown(self, monkeypatch):
        """Linux/Python builds may not map .mjs; PDF.js workers must not get octet-stream."""
        monkeypatch.setattr(
            'core.utils.static_serve.mimetypes.guess_type',
            lambda _path: (None, None),
        )

        content_type, encoding = static_file_content_type_and_encoding('/dist/pdf.worker-n-abc.mjs')

        assert content_type == 'text/javascript'
        assert encoding is None

    def test_known_extension_uses_mimetypes(self):
        content_type, encoding = static_file_content_type_and_encoding('/dist/main.js')

        assert content_type in {'text/javascript', 'application/javascript'}
        assert encoding is None

    def test_unknown_extension_falls_back_to_octet_stream(self, monkeypatch):
        monkeypatch.setattr(
            'core.utils.static_serve.mimetypes.guess_type',
            lambda _path: (None, None),
        )

        content_type, _encoding = static_file_content_type_and_encoding('/dist/data.bin')

        assert content_type == 'application/octet-stream'
