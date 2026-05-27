import pytest
from data_export.models import Export

STORED_BASENAME = 'project-198575-at-2026-01-23-16-16-48a6bac9.json'
STORED_PATH = f'198575/{STORED_BASENAME}'


@pytest.mark.parametrize(
    ('title', 'file_name', 'expected'),
    [
        # User-provided title with spaces is slugified and the md5 suffix is preserved.
        (
            'Alec is cool',
            STORED_PATH,
            'alec-is-cool-48a6bac9.json',
        ),
        # Special characters and slashes are removed by slugify.
        (
            'Q4 Analysis / Customer #1',
            STORED_PATH,
            'q4-analysis-customer-1-48a6bac9.json',
        ),
        # Empty title (legacy row) falls back to the stored basename.
        (
            '',
            STORED_PATH,
            STORED_BASENAME,
        ),
        # All-special-character title slugifies to empty string -> fallback.
        (
            '!!!',
            STORED_PATH,
            STORED_BASENAME,
        ),
        # CSV extension is preserved from the served file.
        (
            'My Export',
            '198575/project-198575-at-2026-01-23-16-16-48a6bac9.csv',
            'my-export-48a6bac9.csv',
        ),
        # TSV extension is preserved.
        (
            'My Export',
            '198575/project-198575-at-2026-01-23-16-16-48a6bac9.tsv',
            'my-export-48a6bac9.tsv',
        ),
        # ZIP archives (e.g. COCO) keep their extension too.
        (
            'My Export',
            '198575/project-198575-at-2026-01-23-16-16-48a6bac9.zip',
            'my-export-48a6bac9.zip',
        ),
        # Storage basename without an extension is handled gracefully.
        (
            'My Export',
            '198575/project-198575-at-2026-01-23-16-16-48a6bac9',
            'my-export-48a6bac9',
        ),
        # Storage basename without any '-' separator -> no md5 suffix is appended.
        (
            'My Export',
            'somefile.json',
            'my-export.json',
        ),
        # None title (defensive) falls back to the stored basename.
        (
            None,
            STORED_PATH,
            STORED_BASENAME,
        ),
    ],
)
def test_get_download_filename(title, file_name, expected):
    export = Export(title=title)
    assert export.get_download_filename(file_name) == expected


def test_get_download_filename_truncates_long_titles_without_trailing_dash():
    export = Export(title='a' * 500)
    result = export.get_download_filename(STORED_PATH)

    assert result.endswith('-48a6bac9.json')
    slug_part = result[: -len('-48a6bac9.json')]
    # Slug is capped at 120 chars and any trailing '-' is stripped.
    assert len(slug_part) <= 120
    assert not slug_part.endswith('-')


def test_get_download_filename_strips_path_components():
    """Title containing path-like separators must not leak directories into the
    response filename."""
    export = Export(title='../etc/passwd')
    result = export.get_download_filename(STORED_PATH)

    assert '/' not in result
    assert '\\' not in result
    assert '..' not in result
