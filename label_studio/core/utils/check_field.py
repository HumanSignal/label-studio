from django.db import models
from django.core.exceptions import FieldDoesNotExist


def check_model_field_exist(model: models.Model, fieldname: str) -> bool:
    """
    Checking for model field existing.
    if you use hasattr(), model field and property return same result.
    This function help to feel the difference.
    :param model: class of model for checking
    :param fieldname: name of filed for checking
    :return: True if filed exist
    """
    try:
        model._meta.get_field(fieldname)
        return True
    except FieldDoesNotExist:
        return False


def is_field_property(model: models.Model, fieldname: str) -> bool:
    """
    Checking is callable parameter a property
    :param model: class of model for checking
    :param fieldname: name of filed for checking
    :return: True if parameter is property
    """
    if hasattr(model, fieldname):
        return not check_model_field_exist(model, fieldname)
    else:
        raise FieldDoesNotExist
