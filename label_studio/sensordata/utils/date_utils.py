import datetime as dt
import pytz


def naive_to_utc(naive_dt: dt.datetime, timezone) -> dt.datetime:
    """
    Transforms datetimes that do not have a timezone specified to UTC
    by giving them a timezone, and then converting it to UTC by adjusting the datetime's value.

    If `naive_dt` already has the attribute `tzinfo`, i.e. it is NOT naive, it is forwarded to `local_to_utc()`.

    :param naive_dt: the datetime object that needs to be converted to UTC.
    :param timezone: the timezone that the `naive_dt` was captured in.
    :return: A datetime object that reflects the same moment as `naive_dt`, converted to UTC.
    """

    if naive_dt.tzinfo is None:
        return timezone.localize(naive_dt, is_dst=None).astimezone(pytz.UTC).replace(tzinfo=None)
    else:
        return local_to_utc(naive_dt)


def utc_to_local(utc_dt: dt.datetime, local_timezone: pytz.timezone) -> dt.datetime:
    """
    Transforms a datetime that is in UTC to the same moment in the specified timezone.
    :param utc_dt: the datetime object that has UTC as timezone.
    :param local_timezone: the timezone that `utc_dt` should be converted to.
    :return: A datetime object that reflects the same moment as `utc_dt`, converted to the specified timezone.
    """

    local_dt = utc_dt.replace(tzinfo=pytz.utc).astimezone(local_timezone)
    return local_timezone.normalize(local_dt)


def local_to_utc(local_dt: dt.datetime) -> dt.datetime:
    """
    Transforms a datetime with a specified timezone to UTC.
    :param local_dt: the datetime object that should be transformed to UTC.
    :return: A datetime object that reflects the same moment, converted to UTC.
    """

    return local_dt.astimezone(pytz.utc).replace(tzinfo=None)
