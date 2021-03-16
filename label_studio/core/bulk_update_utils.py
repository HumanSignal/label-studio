"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
"""
Main module with the bulk_update function.
"""
import itertools

from collections import defaultdict

from django.db import connections, models
from django.db.models.sql import UpdateQuery


def _get_db_type(field, connection):
    if isinstance(field, (models.PositiveSmallIntegerField,
                          models.PositiveIntegerField)):
        return field.db_type(connection).split(' ', 1)[0]

    return field.db_type(connection)


def _as_sql(obj, field, query, compiler, connection):
    value = getattr(obj, field.attname)

    if hasattr(value, 'resolve_expression'):
        value = value.resolve_expression(query, allow_joins=False, for_save=True)
    else:
        value = field.get_db_prep_save(value, connection=connection)

    if hasattr(value, 'as_sql'):
        placeholder, value = compiler.compile(value)
        if isinstance(value, list):
            value = tuple(value)
    else:
        placeholder = '%s'

    return value, placeholder


def flatten(l, types=(list, float)):
    """
    Flat nested list of lists into a single list.
    """
    l = [item if isinstance(item, types) else [item] for item in l]
    return [item for sublist in l for item in sublist]


def grouper(iterable, size):
    # http://stackoverflow.com/a/8991553
    it = iter(iterable)
    while True:
        chunk = tuple(itertools.islice(it, size))
        if not chunk:
            return
        yield chunk


def validate_fields(meta, fields):

    fields = frozenset(fields)
    field_names = set()

    for field in meta.fields:
        if not field.primary_key:
            field_names.add(field.name)

            if field.name != field.attname:
                field_names.add(field.attname)

    non_model_fields = fields.difference(field_names)

    if non_model_fields:
        raise TypeError(
            "These fields are not present in "
            "current meta: {}".format(', '.join(non_model_fields))
        )


def get_fields(update_fields, exclude_fields, meta, obj=None):

    deferred_fields = set()

    if update_fields is not None:
        validate_fields(meta, update_fields)
    elif obj:
        deferred_fields = obj.get_deferred_fields()

    if exclude_fields is None:
        exclude_fields = set()
    else:
        exclude_fields = set(exclude_fields)
        validate_fields(meta, exclude_fields)

    exclude_fields |= deferred_fields

    fields = [
        field
        for field in meta.concrete_fields
        if (
            not field.primary_key and
            field.attname not in deferred_fields and
            field.attname not in exclude_fields and
            field.name not in exclude_fields and
            (
                update_fields is None or
                field.attname in update_fields or
                field.name in update_fields
            )
        )
    ]

    return fields


def bulk_update(objs, meta=None, update_fields=None, exclude_fields=None,
                using='default', batch_size=None, pk_field='pk'):
    assert batch_size is None or batch_size > 0

    # force to retrieve objs from the DB at the beginning,
    # to avoid multiple subsequent queries
    objs = list(objs)
    if not objs:
        return
    batch_size = batch_size or len(objs)

    if meta:
        fields = get_fields(update_fields, exclude_fields, meta)
    else:
        meta = objs[0]._meta
        if update_fields is not None:
            fields = get_fields(update_fields, exclude_fields, meta, objs[0])
        else:
            fields = None

    if fields is not None and len(fields) == 0:
        return

    if pk_field == 'pk':
        pk_field = meta.get_field(meta.pk.name)
    else:
        pk_field = meta.get_field(pk_field)

    connection = connections[using]
    query = UpdateQuery(meta.model)
    compiler = query.get_compiler(connection=connection)

    template = '"{column}" = CAST(CASE "{pk_column}" {cases}ELSE "{column}" END AS {type})'

    case_template = "WHEN %s THEN {} "

    lenpks = 0
    for objs_batch in grouper(objs, batch_size):

        pks = []
        parameters = defaultdict(list)
        placeholders = defaultdict(list)

        for obj in objs_batch:

            pk_value, _ = _as_sql(obj, pk_field, query, compiler, connection)
            pks.append(pk_value)

            loaded_fields = fields or get_fields(update_fields, exclude_fields, meta, obj)

            for field in loaded_fields:
                value, placeholder = _as_sql(obj, field, query, compiler, connection)
                parameters[field].extend(flatten([pk_value, value], types=tuple))
                placeholders[field].append(placeholder)

        values = ', '.join(
            template.format(
                column=field.column,
                pk_column=pk_field.column,
                cases=(case_template*len(placeholders[field])).format(*placeholders[field]),
                type=_get_db_type(field, connection=connection),
            )
            for field in parameters.keys()
        )

        parameters = flatten(parameters.values(), types=list)
        parameters.extend(pks)

        n_pks = len(pks)
        del pks

        dbtable = '"{}"'.format(meta.db_table)

        in_clause = '"{pk_column}" in ({pks})'.format(
            pk_column=pk_field.column,
            pks=', '.join(itertools.repeat('%s', n_pks)),
        )

        sql = 'UPDATE {dbtable} SET {values} WHERE {in_clause}'.format(
            dbtable=dbtable,
            values=values,
            in_clause=in_clause,
        )
        del values

        lenpks += n_pks

        connection.cursor().execute(sql, parameters)

    return lenpks
