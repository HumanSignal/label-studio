"""Rules for `task.data` column names that the Data Manager can query.

Filters, ordering and column selectors turn a column name into a Django ORM path and query
alias. Django refuses aliases containing quotation marks, brackets, whitespace, control
characters, semicolons, hashes or SQL comments, so a column named that way cannot be queried
at all and raises `ValueError` mid-request instead of returning tasks (UTC-1221).
"""

import re

# Mirrors django.db.models.sql.query.FORBIDDEN_ALIAS_PATTERN (private, so it is not imported).
UNQUERYABLE_COLUMN_NAME_PATTERN = re.compile(r"""['`"\]\[;\s\x00-\x1f\x7f-\x9f]|#|--|/\*|\*/""")

UNQUERYABLE_COLUMN_NAME_CHARACTERS = (
    'whitespace, quotation marks, brackets, semicolons, hashes, control characters, or SQL comments'
)


def is_queryable_column_name(name: str) -> bool:
    """Whether `name` can be used as a Data Manager filter, ordering or column selector target."""
    return not UNQUERYABLE_COLUMN_NAME_PATTERN.search(name)
