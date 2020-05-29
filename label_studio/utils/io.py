import os
import pkg_resources
import shutil
import glob
import io
import json

from contextlib import contextmanager
from tempfile import mkstemp, mkdtemp

from appdirs import user_config_dir, user_data_dir


def good_path(path):
    return os.path.abspath(os.path.expanduser(path))


def find_node(package_name, node_path, node_type):
    assert node_type in ('dir', 'file', 'any')
    basedir = pkg_resources.resource_filename(package_name, '')
    node_path = os.path.join(*node_path.split('/'))  # linux to windows compatibility
    search_by_path = '/' in node_path or '\\' in node_path

    for path, dirs, filenames in os.walk(basedir):
        if node_type == 'file':
            nodes = filenames
        elif node_type == 'dir':
            nodes = dirs
        else:
            nodes = filenames + dirs
        if search_by_path:
            for found_node in nodes:
                found_node = os.path.join(path, found_node)
                if found_node.endswith(node_path):
                    return found_node
        elif node_path in nodes:
            return os.path.join(path, node_path)
    else:
        raise IOError(
            'Could not find "%s" at package "%s"' % (node_path, basedir)
        )


def find_file(file):
    return find_node('label_studio', file, 'file')


def find_dir(directory):
    return find_node('label_studio', directory, 'dir')


def find_editor_files():
    """ Find editor files to include in html
    """
    editor_js_dir = find_dir('static/editor/js')
    editor_css_dir = find_dir('static/editor/css')
    editor_js = ['static/editor/js/' + f for f in os.listdir(editor_js_dir) if f.endswith('.js')]
    editor_css = ['static/editor/css/' + f for f in os.listdir(editor_css_dir) if f.endswith('.css')]
    return {'editor_css': editor_css, 'editor_js': editor_js}


@contextmanager
def get_temp_file():
    fd, path = mkstemp()
    yield path
    os.close(fd)


@contextmanager
def get_temp_dir():
    dirpath = mkdtemp()
    yield dirpath
    shutil.rmtree(dirpath)


def get_config_dir():
    config_dir = user_config_dir(appname='label-studio')
    os.makedirs(config_dir, exist_ok=True)
    return config_dir


def get_data_dir():
    data_dir = user_data_dir(appname='label-studio')
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def delete_dir_content(dirpath):
    for f in glob.glob(dirpath + '/*'):
        remove_file_or_dir(f)


def remove_file_or_dir(path):
    if os.path.isfile(path):
        os.remove(path)
    elif os.path.isdir(path):
        shutil.rmtree(path)


def iter_files(root_dir, ext):
    for root, _, files in os.walk(root_dir):
        for f in files:
            if f.lower().endswith(ext):
                yield os.path.join(root, f)


def json_load(file, int_keys=False):
    with io.open(file) as f:
        data = json.load(f)
        if int_keys:
            return {int(k): v for k, v in data.items()}
        else:
            return data
