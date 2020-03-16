import os

from label_studio.utils.io import find_dir
from label_studio.utils.misc import iter_config_templates


def parse_input_args():
    """ Combine args with json config

    :return: config dict
    """
    import sys
    import argparse

    if len(sys.argv) == 1:
        print('\nQuick start usage: label-studio start my_project --init\n')

    available_templates = [os.path.basename(os.path.dirname(f)) for f in iter_config_templates()]

    def valid_filepath(filepath):
        path = os.path.abspath(os.path.expanduser(filepath))
        if os.path.exists(path):
            return path
        raise FileNotFoundError(filepath)

    root_parser = argparse.ArgumentParser(add_help=False)
    root_parser.add_argument(
        '-b', '--no-browser', dest='no_browser', action='store_true',
        help='Do not open browser at label studio start')
    root_parser.add_argument(
        '-d', '--debug', dest='debug', action='store_true',
        help='Debug mode for Flask', default=None)
    root_parser.add_argument(
        '--force', dest='force', action='store_true',
        help='Force creation new resources if exist')
    root_parser.add_argument(
        '--root-dir', dest='root_dir', default='.',
        help='Projects root directory')
    root_parser.add_argument(
        '-v', '--verbose', dest='verbose', action='store_true',
        help='Increase output verbosity')
    root_parser.add_argument(
        '--template', dest='template', choices=available_templates,
        help='Choose from predefined project templates')
    root_parser.add_argument(
        '-c', '--config', dest='config_path', type=valid_filepath,
        help='Server config')
    root_parser.add_argument(
        '-l', '--label-config', dest='label_config', type=valid_filepath,
        help='Label config path')
    root_parser.add_argument(
        '-i', '--input-path', dest='input_path', type=valid_filepath,
        help='Input path to task file or directory with tasks')
    root_parser.add_argument(
        '--input-format', dest='input_format',
        choices=('json', 'json-dir', 'text', 'text-dir', 'image-dir', 'audio-dir'), default='json',
        help='Input tasks format. Unless you are using "json" or "json-dir" format, --label-config option is required')
    root_parser.add_argument(
        '-o', '--output-dir', dest='output_dir', type=valid_filepath,
        help='Output directory for completions')
    root_parser.add_argument(
        '--ml-backend-url', dest='ml_backend_url',
        help='Machine learning backend URL')
    root_parser.add_argument(
        '--ml-backend-name', dest='ml_backend_name',
        help='Machine learning backend name')
    root_parser.add_argument(
        '-p', '--port', dest='port', default=8200, type=int,
        help='Server port')
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

    # start sub-command parser

    parser_start = subparsers.add_parser('start', help='Start Label Studio server', parents=[root_parser])
    parser_start.add_argument(
        'project_name',
        help='Path to directory where project state has been initialized')
    parser_start.add_argument(
        '--init', dest='init', action='store_true',
        help='Initialize if project is not initialized yet')

    # start-multi-session sub-command parser

    parser_start_ms = subparsers.add_parser(
        'start-multi-session', help='Start Label Studio server', parents=[root_parser])

    args = parser.parse_args()
    if args.output_dir is not None:
        raise RuntimeError('"--output-dir" option is deprecated and has no effect.\n'
                           'All output results are saved to project_name/completions directory')

    label_config_explicitly_specified = hasattr(args, 'label_config') and args.label_config
    if args.template and not label_config_explicitly_specified:
        args.label_config = os.path.join(find_dir('examples'), args.template, 'config.xml')
    if not hasattr(args, 'label_config'):
        args.label_config = None
    return args
