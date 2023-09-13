"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from .settings.base import EXPORT_DIR
from .utils.io import find_file


def parse_input_args(input_args):
    """Combine args with json config

    :return: config dict
    """
    import argparse

    def valid_filepath(filepath):
        path = os.path.abspath(os.path.expanduser(filepath))
        if os.path.exists(path):
            return path
        raise FileNotFoundError(filepath)

    def project_name(raw_name):
        """Remove trailing / and leading ./ from project name"""
        return os.path.normpath(raw_name)

    root_parser = argparse.ArgumentParser(add_help=False)
    root_parser.add_argument('--version', dest='version', action='store_true', help='Show Label Studio version')
    root_parser.add_argument(
        '-b',
        '--no-browser',
        dest='no_browser',
        action='store_true',
        help='Do not open browser when starting Label Studio',
    )
    root_parser.add_argument(
        '-db', '--database', dest='database', help='Database file path for storing tasks and annotations'
    )
    root_parser.add_argument('--data-dir', dest='data_dir', help='Directory for storing all application related data')
    root_parser.add_argument('-d', '--debug', dest='debug', action='store_true', help='Debug mode', default=False)
    default_config_path = find_file('default_config.json')
    root_parser.add_argument(
        '-c', '--config', dest='config_path', type=valid_filepath, default=default_config_path, help='Server config'
    )
    root_parser.add_argument(
        '-l', '--label-config', dest='label_config', type=valid_filepath, help='Label config file path'
    )
    root_parser.add_argument(
        '--skip-long-migrations',
        dest='skip_long_migrations',
        action='store_true',
        help='Skip long migrations on start',
    )
    root_parser.add_argument('--ml-backends', dest='ml_backends', nargs='+', help='Machine learning backends URLs')
    root_parser.add_argument(
        '--sampling',
        dest='sampling',
        choices=['sequential', 'uniform', 'prediction-score-min'],
        default='sequential',
        help='Sampling type that defines order for labeling tasks',
    )
    root_parser.add_argument(
        '--log-level',
        dest='log_level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='WARNING',
        help='Logging level',
    )
    root_parser.add_argument(
        '--internal-host',
        dest='internal_host',
        type=str,
        default='0.0.0.0',  # nosec
        help='Web server internal host, e.g.: "localhost" or "0.0.0.0"',
    )
    root_parser.add_argument('-p', '--port', dest='port', type=int, help='Web server port')
    root_parser.add_argument(
        '--host',
        dest='host',
        type=str,
        default='',
        help='Label Studio full hostname for generating imported task urls, sample task urls, static loading, etc.\n'
        "Leave it empty to make all paths relative to the domain root, it's preferable for work for most cases."
        'Examples: "https://77.42.77.42:1234", "http://ls.domain.com/subdomain/"',
    )
    root_parser.add_argument(
        '--cert', dest='cert_file', type=valid_filepath, help='Certificate file for HTTPS (in PEM format)'
    )
    root_parser.add_argument(
        '--key', dest='key_file', type=valid_filepath, help='Private key file for HTTPS (in PEM format)'
    )
    root_parser.add_argument(
        '--initial-project-description', dest='project_desc', help='Project description to identify project'
    )
    root_parser.add_argument('--password', dest='password', default='', help='Password for default user')
    root_parser.add_argument('--username', dest='username', default='', help='Username for default user')
    root_parser.add_argument('--user-token', dest='user_token', default='', help='User token for API access')
    root_parser.add_argument(
        '--agree-fix-sqlite',
        dest='agree_fix_sqlite',
        action='store_true',
        help='Agree to fix SQLite issues on python 3.6-3.8 on Windows automatically',
    )

    parser = argparse.ArgumentParser(description='Label studio', parents=[root_parser])

    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    subparsers.required = False

    # init sub-command parser

    subparsers.add_parser('version', help='Print version info', parents=[root_parser])

    subparsers.add_parser('user', help='Print user info', parents=[root_parser])

    parser_init = subparsers.add_parser('init', help='Initialize Label Studio', parents=[root_parser])
    parser_init.add_argument(
        'project_name', help='Path to directory where project state will be initialized', type=project_name, nargs='?'
    )
    parser_init.add_argument(
        '-q',
        '--quiet',
        dest='quiet_mode',
        action='store_true',
        help='Quiet (silence) mode for init when it does not ask about username and password',
        default=False,
    )

    # start sub-command parser

    parser_start = subparsers.add_parser('start', help='Start Label Studio server', parents=[root_parser])
    parser_start.add_argument('project_name', help='Project name', type=project_name, default='', nargs='?')
    parser_start.add_argument(
        '--init', dest='init', action='store_true', help='Initialize if project is not initialized yet'
    )

    # reset_password sub-command parser

    subparsers.add_parser('reset_password', help='Reset password for a specific username', parents=[root_parser])

    subparsers.add_parser('shell', help='Run django shell', parents=[root_parser])

    calculate_stats_all_orgs = subparsers.add_parser(
        'calculate_stats_all_orgs', help='Calculate task counters and statistics', parents=[root_parser]
    )
    calculate_stats_all_orgs.add_argument(
        '--from-scratch', dest='from_scratch', default=False, action='store_true', help='Recalculate from scratch'
    )

    # export_project sub-command parser
    export_project = subparsers.add_parser('export', help='Export project in a specific format', parents=[root_parser])
    export_project.add_argument('project_id', help='Project ID')
    export_project.add_argument('export_format', help='Export format (JSON, JSON_MIN, CSV, etc)')
    export_project.add_argument('--export-path', help='Export file path or directory', default=EXPORT_DIR)
    default_params = '{"annotations__completed_by": {"only_id": null}, "interpolate_key_frames": true}'
    export_project.add_argument(
        '--export-serializer-context',
        help=f"Export serializer context, default value: '{default_params}'",
        default=default_params,
    )

    subparsers.add_parser(
        'annotations_fill_updated_by', help='Fill the updated_by field for Annotations', parents=[root_parser]
    )

    args = parser.parse_args(input_args)

    if not hasattr(args, 'label_config'):
        args.label_config = None
    return args
