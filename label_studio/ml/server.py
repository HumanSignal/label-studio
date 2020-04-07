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

    root_parser.add_argument(
        '--log-level', dest='log_level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], default=None,
        help='Logging level'
    )

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
        help='Machine learning script of the following format: /my/script/path:ModelClass'
    )
    parser_init.add_argument(
        '--model-dir', dest='model_dir', default='.',
        help='Directory where models are stored (relative to the project directory)')
    parser_init.add_argument(
        '-p', '--port', dest='port', default=9090, type=int,
        help='Server port')

    # start sub-command parser
    parser_start = subparsers.add_parser('start', help='Initialize Label Studio', parents=[root_parser])
    parser_start.add_argument(
        'project_name',
        help='Path to directory where project state will be initialized')

    args = parser.parse_args()
    # setup logging level
    if args.log_level:
        logging.root.setLevel(args.log_level)
    return args


def create_dir(args):
    output_dir = os.path.join(args.root_dir, args.project_name)

    default_configs_dir = find_dir('default_configs')
    shutil.copytree(default_configs_dir, output_dir)

    # extract script name and model class
    if not args.script:
        logger.warning('You don\'t specify script path: by default, "./model.py" is used')
        script_path = 'model.py'
    else:
        script_path = args.script

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

    wsgi_script_file = os.path.join(output_dir, '_wsgi.py.tmpl')
    with open(wsgi_script_file) as f:
        wsgi_script = f.read()

    wsgi_script = wsgi_script.format(
        script=os.path.splitext(script_base_name)[0],
        model_class=model_class,
        model_dir=args.model_dir,
        port=args.port
    )
    with open(wsgi_script_file.split('.tmpl')[0], mode='w') as fout:
        fout.write(wsgi_script)


def start_server(args):
    project_dir = os.path.join(args.root_dir, args.project_name)
    wsgi = os.path.join(project_dir, '_wsgi.py')
    os.system('python ' + wsgi)


def main():
    args = get_args()

    if args.command == 'init':
        create_dir(args)
    elif args.command == 'start':
        start_server(args)