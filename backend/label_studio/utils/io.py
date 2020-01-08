import os
import pkg_resources


def find_node(package_name, node_path, node_type):
    assert node_type in ('dir', 'file', 'any')
    basedir = pkg_resources.resource_filename(package_name, '')
    search_by_path = '/' in node_path

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


def find_dir(dir):
    return find_node('label_studio', dir, 'dir')
