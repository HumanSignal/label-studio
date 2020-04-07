import importlib
import importlib.util
import inspect
import os
import sys

from .model import LabelStudioMLBase


def get_all_classes_inherited_LabelStudioMLBase(script_file):
    names = []
    abs_path = os.path.abspath(script_file)
    module_name = os.path.splitext(os.path.basename(script_file))[0]
    sys.path.append(os.path.dirname(abs_path))
    module = importlib.import_module(module_name)
    for name, obj in inspect.getmembers(module, inspect.isclass):
        if name == LabelStudioMLBase.__name__:
            continue
        if issubclass(obj, LabelStudioMLBase):
            names.append(name)
    sys.path.pop()
    return names