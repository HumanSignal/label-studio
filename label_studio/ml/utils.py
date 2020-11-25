import importlib
import importlib.util
import inspect
import os
import sys
import urllib
import hashlib
import requests
import logging
import io

from urllib.parse import urlparse
from PIL import Image

from .model import LabelStudioMLBase
from label_studio.utils.io import get_cache_dir


logger = logging.getLogger(__name__)


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


def get_single_tag_keys(parsed_label_config, control_type, object_type):
    """
    Gets parsed label config, and returns data keys related to the single control tag and the single object tag schema
    (e.g. one "Choices" with one "Text")
    :param parsed_label_config: parsed label config returned by "label_studio.misc.parse_config" function
    :param control_type: control tag str as it written in label config (e.g. 'Choices')
    :param object_type: object tag str as it written in label config (e.g. 'Text')
    :return: 3 string keys and 1 array of string labels: (from_name, to_name, value, labels)
    """
    assert len(parsed_label_config) == 1
    from_name, info = list(parsed_label_config.items())[0]
    assert info['type'] == control_type, 'Label config has control tag "<' + info['type'] + '>" but "<' + control_type + '>" is expected for this model.'  # noqa

    assert len(info['to_name']) == 1
    assert len(info['inputs']) == 1
    assert info['inputs'][0]['type'] == object_type
    to_name = info['to_name'][0]
    value = info['inputs'][0]['value']
    return from_name, to_name, value, info['labels']


def is_skipped(completion):
    if len(completion['completions']) != 1:
        return False
    completion = completion['completions'][0]
    return completion.get('skipped', False) or completion.get('was_cancelled', False)


def get_choice(completion):
    return completion['completions'][0]['result'][0]['value']['choices'][0]


def get_image_local_path(url, image_cache_dir=None, project_dir=None):
    is_local_file = url.startswith('/data/') and '?d=' in url
    is_uploaded_file = url.startswith('/data/upload')

    # File reference created with --allow-serving-local-files option
    if is_local_file:
        filename, dir_path = url.split('/data/')[1].split('?d=')
        dir_path = str(urllib.parse.unquote(dir_path))
        filepath = os.path.join(dir_path, filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(filepath)

    # File uploaded via import UI
    elif is_uploaded_file:
        if not project_dir or not os.path.exists(project_dir):
            raise FileNotFoundError(
                "Can't find uploaded file by URL {url}: you need to pass a valid project_dir".format(url=url))
        filepath = os.path.join(project_dir, 'upload', os.path.basename(url))

    # File specified by remote URL - download and cache it
    else:
        image_cache_dir = image_cache_dir or get_cache_dir()
        parsed_url = urlparse(url)
        url_filename = os.path.basename(parsed_url.path)
        url_hash = hashlib.md5(url.encode()).hexdigest()[:6]
        filepath = os.path.join(image_cache_dir, url_hash + '__' + url_filename)
        if not os.path.exists(filepath):
            logger.info('Download {url} to {filepath}'.format(url=url, filepath=filepath))
            r = requests.get(url, stream=True)
            r.raise_for_status()
            with io.open(filepath, mode='wb') as fout:
                fout.write(r.content)
    return filepath


def get_image_size(filepath):
    return Image.open(filepath).size
