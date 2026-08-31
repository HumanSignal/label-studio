"""Read-only post-upgrade schema drift check for on-prem upgrade verification.

Reports three conditions that ``show_async_migrations`` cannot see:

1. Missing columns — Django model fields vs ``information_schema.columns``.
2. Non-terminal ``AsyncMigrationStatus`` rows (SCHEDULED / STARTED / IN PROGRESS / ERROR).
3. Silently lost async migrations — ``django_migrations`` records whose module
   defers DDL but have no ``AsyncMigrationStatus`` row.

This command never applies DDL and never mutates ``AsyncMigrationStatus``.
For a listing of status rows only, see ``show_async_migrations``.
"""

from __future__ import annotations

import ast
import importlib
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from core.models import AsyncMigrationStatus
from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

NON_TERMINAL_STATUSES = (
    AsyncMigrationStatus.STATUS_SCHEDULED,
    AsyncMigrationStatus.STATUS_STARTED,
    AsyncMigrationStatus.STATUS_IN_PROGRESS,
    AsyncMigrationStatus.STATUS_ERROR,
)

DEFERRAL_CALL_NAMES = frozenset(
    {
        'make_sql_migration',
        'start_migration_job',
        'start_job_async_or_sync',
    }
)


@dataclass(frozen=True)
class ExpectedColumn:
    table: str
    column: str
    model: str


@dataclass(frozen=True)
class LostAsyncMigration:
    app: str
    name: str
    module: str


def _call_func_name(node: ast.AST) -> str | None:
    if not isinstance(node, ast.Call):
        return None
    func = node.func
    if isinstance(func, ast.Name):
        return func.id
    if isinstance(func, ast.Attribute):
        return func.attr
    return None


def migration_module_defers_ddl(source: str) -> bool:
    """True if the migration source enqueues deferred DDL (AST marker scan).

    Markers match the G-4 bandit approach (``make_sql_migration``,
    ``start_job_async_or_sync``) plus ``start_migration_job``. Implemented
    locally so this check does not depend on FIT-2680 / G-4 landing.
    """
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return False
    for node in ast.walk(tree):
        if _call_func_name(node) in DEFERRAL_CALL_NAMES:
            return True
    return False


def _constant_str(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def extract_migration_status_names(source: str, *, module_name: str, app: str, name: str) -> set[str]:
    """Collect possible AsyncMigrationStatus.name values used by this module."""
    names = {
        name,
        module_name,
        f'{app}.migrations.{name}',
        f'{app}:{name}',
    }
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return names

    def _resolve(node: ast.AST) -> str | None:
        constant = _constant_str(node)
        if constant is not None:
            return constant
        if isinstance(node, ast.Name) and node.id == '__name__':
            return module_name
        return None

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'migration_name':
                    resolved = _resolve(node.value)
                    if resolved:
                        names.add(resolved)
        elif isinstance(node, ast.Call):
            for kw in node.keywords:
                if kw.arg == 'migration_name':
                    resolved = _resolve(kw.value)
                    if resolved:
                        names.add(resolved)
    return names


def iter_expected_columns() -> Iterable[ExpectedColumn]:
    """Concrete, non-M2M fields on managed (non-proxy) models, keyed by table+column."""
    for model in apps.get_models():
        meta = model._meta
        if meta.proxy or not meta.managed:
            continue
        model_label = f'{meta.app_label}.{model.__name__}'
        for field in meta.local_concrete_fields:
            if not field.column:
                continue
            yield ExpectedColumn(table=meta.db_table, column=field.column, model=model_label)


def fetch_actual_columns() -> set[tuple[str, str]]:
    """Read-only snapshot of (table_name, column_name) from information_schema."""
    sql = 'SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()'
    with connection.cursor() as cursor:
        cursor.execute(sql)
        return {(row[0], row[1]) for row in cursor.fetchall()}


def _fold(value: str) -> str:
    return value.casefold()


def find_missing_columns(
    expected: Iterable[ExpectedColumn],
    actual: set[tuple[str, str]],
) -> list[ExpectedColumn]:
    actual_folded = {(_fold(table), _fold(column)) for table, column in actual}
    missing = [row for row in expected if (_fold(row.table), _fold(row.column)) not in actual_folded]
    missing.sort(key=lambda row: (row.table, row.column, row.model))
    return missing


def find_non_terminal_async_migrations() -> list[AsyncMigrationStatus]:
    return list(AsyncMigrationStatus.objects.filter(status__in=NON_TERMINAL_STATUSES).order_by('name', 'id'))


def _load_migration_source(app: str, name: str) -> tuple[str, str] | None:
    module_name = f'{app}.migrations.{name}'
    try:
        module = importlib.import_module(module_name)
    except ImportError:
        return None
    path = getattr(module, '__file__', None)
    if not path:
        return None
    try:
        source = Path(path).read_text(encoding='utf-8')
    except (OSError, UnicodeDecodeError):
        return None
    return module_name, source


def find_lost_async_migrations() -> list[LostAsyncMigration]:
    """Applied django_migrations rows that defer DDL but have no status row."""
    status_names = set(AsyncMigrationStatus.objects.values_list('name', flat=True))
    recorder = MigrationRecorder(connection)
    lost: list[LostAsyncMigration] = []
    for app, name in sorted(recorder.applied_migrations()):
        loaded = _load_migration_source(app, name)
        if loaded is None:
            continue
        module_name, source = loaded
        if not migration_module_defers_ddl(source):
            continue
        candidates = extract_migration_status_names(source, module_name=module_name, app=app, name=name)
        if status_names.intersection(candidates):
            continue
        lost.append(LostAsyncMigration(app=app, name=name, module=module_name))
    return lost


def _meta_error_text(meta) -> str:
    if not isinstance(meta, dict):
        return ''
    error = meta.get('error')
    if error is None:
        return ''
    return str(error)


class Command(BaseCommand):
    help = (
        'Read-only post-upgrade check: missing columns vs Django models, '
        'non-terminal AsyncMigrationStatus rows (SCHEDULED/STARTED/IN PROGRESS/ERROR), and '
        'applied deferred migrations with no AsyncMigrationStatus row. Never '
        'applies DDL. For a listing of status rows only, see show_async_migrations.'
    )

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            self.stdout.write(
                f'Schema drift check requires PostgreSQL (information_schema). '
                f"Current database vendor is '{connection.vendor}'; skipping."
            )
            return

        expected = list(iter_expected_columns())
        actual = fetch_actual_columns()
        missing = find_missing_columns(expected, actual)
        non_terminal = find_non_terminal_async_migrations()
        lost = find_lost_async_migrations()

        self.stdout.write('=== Schema drift check ===')
        self.stdout.write(
            '(read-only; does not apply DDL or mutate AsyncMigrationStatus. '
            'For status-row listing only, see show_async_migrations.)'
        )
        self.stdout.write('')

        has_drift = bool(missing or non_terminal or lost)

        if missing:
            self.stdout.write(
                self.style.ERROR(f'Missing columns ({len(missing)}) — Django model fields not in information_schema:')
            )
            for row in missing:
                self.stdout.write(f'  table={row.table}  column={row.column}  model={row.model}')
        else:
            self.stdout.write(self.style.SUCCESS('No missing columns.'))

        self.stdout.write('')
        if non_terminal:
            self.stdout.write(
                self.style.ERROR(
                    f'Non-terminal async migrations ({len(non_terminal)}) (SCHEDULED / STARTED / IN PROGRESS / ERROR):'
                )
            )
            for row in non_terminal:
                error = _meta_error_text(row.meta)
                self.stdout.write(f'  name={row.name}  status={row.status}  error={error}')
        else:
            self.stdout.write(self.style.SUCCESS('No non-terminal async migrations.'))

        self.stdout.write('')
        if lost:
            self.stdout.write(
                self.style.ERROR(
                    f'Silently lost async migrations ({len(lost)}) — recorded in '
                    f'django_migrations, defers DDL, but has no AsyncMigrationStatus row '
                    f'(potentially lost before the job started):'
                )
            )
            for row in lost:
                self.stdout.write(f'  app={row.app}  name={row.name}  module={row.module}')
        else:
            self.stdout.write(self.style.SUCCESS('No silently lost async migrations.'))

        self.stdout.write('')
        if has_drift:
            self.stdout.write(self.style.ERROR('RESULT: DRIFT DETECTED'))
            raise CommandError('Schema drift detected. See output above.')

        self.stdout.write(self.style.SUCCESS('RESULT: OK — no drift'))
