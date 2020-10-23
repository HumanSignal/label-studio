import os
import json

from label_studio.utils.io import find_dir
from label_studio.utils.misc import iter_config_templates


def parse_input_args():
    """ Combine args with json config

    :return: config dict
    """
    import sys
    import argparse
    from label_studio.project import Project

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
        '--version', dest='version', action='store_true',
        help='Show Label Studio version')
    root_parser.add_argument(
        '-b', '--no-browser', dest='no_browser', action='store_true',
        help='Do not open browser at label studio start')
    root_parser.add_argument(
        '-d', '--debug', dest='debug', action='store_true',
        help='Debug mode for Flask', default=None)
    root_parser.add_argument(
        '--force', dest='force', action='store_true',
        help='Force overwrite existing files')
    root_parser.add_argument(
        '--root-dir', dest='root_dir', default='.',
        help='Project root directory')
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
        help='Input path for task file or directory with tasks')
    root_parser.add_argument(
        '-s', '--source', dest='source', choices=Project.get_available_source_storages(),
        help='Source data storage type')
    root_parser.add_argument(
        '--source-path', dest='source_path',
        help='Source bucket name')
    root_parser.add_argument(
        '--source-params', dest='source_params', type=json.loads, default={},
        help='JSON string representing source parameters')
    root_parser.add_argument(
        '-t', '--target', dest='target', choices=Project.get_available_target_storages(),
        help='Target data storage type')
    root_parser.add_argument(
        '--target-path', dest='target_path',
        help='Target bucket name')
    root_parser.add_argument(
        '--target-params', dest='target_params', type=json.loads, default={},
        help='JSON string representing target parameters')
    root_parser.add_argument(
        '--input-format', dest='input_format',
        choices=('json', 'json-dir', 'text', 'text-dir', 'image-dir', 'audio-dir'), default='json',
        help='Input tasks format. Unless you are using "json" or "json-dir" format, --label-config option is required')
    root_parser.add_argument(
        '-o', '--output-dir', dest='output_dir', type=valid_filepath,
        help='Output directory for completions (unless cloud storage is used)')
    root_parser.add_argument(
        '--ml-backends', dest='ml_backends', nargs='+',
        help='Machine learning backends URLs')
    root_parser.add_argument(
        '--sampling', dest='sampling', choices=['sequential', 'uniform'], default='sequential',
        help='Sampling type that defines tasks order'
    )
    root_parser.add_argument(
        '--log-level', dest='log_level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], default=None,
        help='Logging level'
    )
    root_parser.add_argument(
        '--host', dest='host', type=str,
        help='Server hostname for LS internal usage like import task urls generation, sample task urls, etc. '
             'If you need to start server on localhost instead of 0.0.0.0, just make it "localhost". '
             'Otherwise web-server host will be 0.0.0.0 always independent of this parameter.')
    root_parser.add_argument(
        '--protocol', dest='protocol', type=str,
        help='Web protocol http:// or https://')
    root_parser.add_argument(
        '-p', '--port', dest='port', type=int,
        help='Server port')
    root_parser.add_argument(
        '--cert', dest='cert_file', type=valid_filepath,
        help='Certificate file for HTTPS (in PEM format)'
    )
    root_parser.add_argument(
        '--key', dest='key_file', type=valid_filepath,
        help='Private key file for HTTPS (in PEM format)'
    )
    root_parser.add_argument(
        '--allow-serving-local-files', dest='allow_serving_local_files', action='store_true',
        help='Allow serving local files (Warning! use this option only for your local runs)')
    root_parser.add_argument(
        '--use-gevent', dest='use_gevent', action='store_true',
        help='Use gevent for better concurrency', default=False)
    root_parser.add_argument(
        '--initial-project-description', dest='project_desc',
        help='Project description to identify project')

    parser = argparse.ArgumentParser(description='Label studio')

    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    subparsers.required = True

    # init sub-command parser

    parser_version = subparsers.add_parser('version', help='Print version info', parents=[root_parser])

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
    parser_start.add_argument(
        '--password', dest='password', default='',
        help='Password for web access')
    parser_start.add_argument(
        '--username', dest='username', default='',
        help='Username for web access')

    # start-multi-session sub-command parser

    parser_start_ms = subparsers.add_parser(
        'start-multi-session', help='Start Label Studio server', parents=[root_parser])

    args = parser.parse_args()

    # print version
    if args.version or args.command == 'version':
        from label_studio import __version__
        print('\nLabel Studio version:', __version__, '\n')

    if args.output_dir is not None:
        raise RuntimeError('"--output-dir" option is deprecated and has no effect.\n'
                           'All output results are saved to project_name/completions directory')

    label_config_explicitly_specified = hasattr(args, 'label_config') and args.label_config
    if args.template and not label_config_explicitly_specified:
        args.label_config = os.path.join(find_dir('examples'), args.template, 'config.xml')
    if not hasattr(args, 'label_config'):
        args.label_config = None
    return args
