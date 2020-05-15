import os
import logging
import argparse
import shutil

from label_studio.utils.io import find_dir
from label_studio.ml.utils import get_all_classes_inherited_LabelStudioMLBase


logger = logging.getLogger(__name__)


def get_args():
    root_parser = argparse.ArgumentParser(add_help=False)

    root_parser.add_argument(
        '--root-dir', dest='root_dir', default='.',
        help='Projects root directory')

    parser = argparse.ArgumentParser(description='Label studio')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    subparsers.required = True

    # init sub-command parser
    parser_init = subparsers.add_parser('init', help='Initialize Label Studio', parents=[root_parser])
    parser_init.add_argument(
        'project_name',
        help='Path to directory where project state will be initialized')
    parser_init.add_argument(
        '--script', dest='script',
        help='Machine learning script of the following format: /my/script/path:ModelClass')
    parser_init.add_argument(
        '--force', dest='force', action='store_true',
        help='Force recreating the project if exists')

    # start sub-command parser
    parser_start = subparsers.add_parser('start', help='Initialize Label Studio', parents=[root_parser])
    parser_start.add_argument(
        'project_name',
        help='Path to directory where project state will be initialized')

    args, subargs = parser.parse_known_args()
    return args, subargs


def create_dir(args):
    output_dir = os.path.join(args.root_dir, args.project_name)
    if os.path.exists(output_dir) and args.force:
        shutil.rmtree(output_dir)
    elif os.path.exists(output_dir):
        raise FileExistsError('Model directory already exists. Please remove it or use --force option.')

    default_configs_dir = find_dir('default_configs')
    shutil.copytree(default_configs_dir, output_dir, ignore=shutil.ignore_patterns('*.tmpl'))

    # extract script name and model class
    if not args.script:
        logger.warning('You don\'t specify script path: by default, "./model.py" is used')
        script_path = 'model.py'
    else:
        script_path = args.script

    if not os.path.exists(script_path):
        raise FileNotFoundError(script_path)

    if ':' not in script_path:
        model_classes = get_all_classes_inherited_LabelStudioMLBase(script_path)
        if len(model_classes) > 1:
            raise ValueError(
                'You don\'t specify target model class, and we\'ve found {num} possible candidates within {script}. '
                'Please specify explicitly which one should be used using the following format:\n '
                '{script}:{model_class}'.format(num=len(model_classes), script=script_path, model_class=model_classes[0]))
        model_class = model_classes[0]
    else:
        script_path, model_class = args.script.split(':')

    script_base_name = os.path.basename(script_path)
    local_script_path = os.path.join(output_dir, os.path.basename(script_path))
    shutil.copy2(script_path, local_script_path)

    wsgi_script_file = os.path.join(default_configs_dir, '_wsgi.py.tmpl')
    with open(wsgi_script_file) as f:
        wsgi_script = f.read()
    wsgi_script = wsgi_script.format(
        script=os.path.splitext(script_base_name)[0],
        model_class=model_class
    )
    wsgi_name = os.path.basename(wsgi_script_file).split('.tmpl', 1)[0]
    with open(os.path.join(output_dir, wsgi_name), mode='w') as fout:
        fout.write(wsgi_script)


def start_server(args, subprocess_params):
    project_dir = os.path.join(args.root_dir, args.project_name)
    wsgi = os.path.join(project_dir, '_wsgi.py')
    os.system('python ' + wsgi + ' ' + ' '.join(subprocess_params))


def main():
    args, subargs = get_args()

    if args.command == 'init':
        create_dir(args)
    elif args.command == 'start':
        start_server(args, subargs)