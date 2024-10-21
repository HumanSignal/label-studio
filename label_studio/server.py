"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import getpass
import io
import json
import logging
import os
import pathlib
import socket
import sys

from colorama import Fore, init

if sys.platform == 'win32':
    init(convert=True)

from django.core.management import call_command
from django.core.wsgi import get_wsgi_application
from django.db import DEFAULT_DB_ALIAS, IntegrityError, connections
from django.db.backends.signals import connection_created
from django.db.migrations.executor import MigrationExecutor

from label_studio.core.argparser import parse_input_args
from label_studio.core.utils.params import get_env

logger = logging.getLogger(__name__)

LS_PATH = str(pathlib.Path(__file__).parent.absolute())
DEFAULT_USERNAME = 'default_user@localhost'


def _setup_env():
    sys.path.insert(0, LS_PATH)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'label_studio.core.settings.label_studio')
    get_wsgi_application()


def _app_run(host, port):
    http_socket = '{}:{}'.format(host, port)
    call_command('runserver', '--noreload', http_socket)


def _set_sqlite_fix_pragma(sender, connection, **kwargs):
    """Enable integrity constraint with sqlite."""
    if connection.vendor == 'sqlite' and get_env('AZURE_MOUNT_FIX'):
        cursor = connection.cursor()
        cursor.execute('PRAGMA journal_mode=wal;')


def is_database_synchronized(database):
    connection = connections[database]
    connection.prepare_database()
    executor = MigrationExecutor(connection)
    targets = executor.loader.graph.leaf_nodes()
    return not executor.migration_plan(targets)


def _apply_database_migrations():
    connection_created.connect(_set_sqlite_fix_pragma)
    if not is_database_synchronized(DEFAULT_DB_ALIAS):
        print('Initializing database..')
        call_command('migrate', '--no-color', verbosity=0)


def _get_config(config_path):
    with io.open(os.path.abspath(config_path), encoding='utf-8') as c:
        config = json.load(c)
    return config


def _create_project(title, user, label_config=None, sampling=None, description=None, ml_backends=None):
    from organizations.models import Organization
    from projects.models import Project

    project = Project.objects.filter(title=title).first()
    if project is not None:
        print('Project with title "{}" already exists'.format(title))
    else:
        org = Organization.objects.first()
        org.add_user(user)
        project = Project.objects.create(title=title, created_by=user, organization=org)
        print('Project with title "{}" successfully created'.format(title))

    if label_config is not None:
        with open(os.path.abspath(label_config)) as c:
            project.label_config = c.read()

    if sampling is not None:
        project.sampling = sampling

    if description is not None:
        project.description = description

    if ml_backends is not None:
        from ml.models import MLBackend

        # e.g.: localhost:8080,localhost:8081;localhost:8082
        for url in ml_backends:
            logger.info('Adding new ML backend %s', url)
            MLBackend.objects.create(project=project, url=url)

    project.save()
    return project


def _get_user_info(username):
    from users.models import User
    from users.serializers import UserSerializer

    if not username:
        username = DEFAULT_USERNAME

    user = User.objects.filter(email=username)
    if not user.exists():
        print({'status': 'error', 'message': f"user {username} doesn't exist"})
        return

    user = user.first()
    user_data = UserSerializer(user).data
    user_data['token'] = user.auth_token.key
    user_data['status'] = 'ok'
    print('=> User info:')
    print(user_data)
    return user_data


def _create_user(input_args, config):
    from organizations.models import Organization
    from users.models import User

    username = input_args.username or config.get('username') or get_env('USERNAME')
    password = input_args.password or config.get('password') or get_env('PASSWORD')
    token = input_args.user_token or config.get('user_token') or get_env('USER_TOKEN')

    if not username:
        user = User.objects.filter(email=DEFAULT_USERNAME).first()
        if user is not None:
            if password and not user.check_password(password):
                user.set_password(password)
                user.save()
                print(f'User {DEFAULT_USERNAME} password changed')
            return user

        if input_args.quiet_mode:
            return None

        print(f'Please enter default user email, or press Enter to use {DEFAULT_USERNAME}')
        username = input('Email: ')
        if not username:
            username = DEFAULT_USERNAME

    if not password and not input_args.quiet_mode:
        password = getpass.getpass(f'User password for {username}: ')

    try:
        user = User.objects.create_user(email=username, password=password)
        user.is_staff = True
        user.is_superuser = True
        user.save()

        if token and len(token) > 5:
            from rest_framework.authtoken.models import Token

            Token.objects.filter(key=user.auth_token.key).update(key=token)
        elif token:
            print(f'Token {token} is not applied to user {DEFAULT_USERNAME} ' f"because it's empty or len(token) < 5")

    except IntegrityError:
        print('User {} already exists'.format(username))

    user = User.objects.get(email=username)
    org = Organization.objects.first()
    if not org:
        org = Organization.create_organization(created_by=user, title='Label Studio')
    else:
        org.add_user(user)
    user.active_organization = org
    user.save(update_fields=['active_organization'])

    return user


def _init(input_args, config):
    user = _create_user(input_args, config)

    if user and input_args.project_name and not _project_exists(input_args.project_name):
        from projects.models import Project

        sampling_map = {
            'sequential': Project.SEQUENCE,
            'uniform': Project.UNIFORM,
            'prediction-score-min': Project.UNCERTAINTY,
        }
        _create_project(
            title=input_args.project_name,
            user=user,
            label_config=input_args.label_config,
            description=input_args.project_desc,
            sampling=sampling_map.get(input_args.sampling, 'sequential'),
            ml_backends=input_args.ml_backends,
        )
    elif input_args.project_name:
        print('Project "{0}" already exists'.format(input_args.project_name))


def _reset_password(input_args):
    from users.models import User

    username = input_args.username
    if not username:
        username = input('Username: ')

    user = User.objects.filter(email=username).first()
    if user is None:
        print('User with username {} not found'.format(username))
        return

    password = input_args.password
    if not password:
        password = getpass.getpass('New password:')

    if not password:
        print('Can not set empty password')
        return

    if user.check_password(password):
        print('Entered password is the same as current')
        return

    user.set_password(password)
    user.save()
    print('Password successfully changed')


def check_port_in_use(host, port):
    logger.info('Checking if host & port is available :: ' + str(host) + ':' + str(port))
    host = host.replace('https://', '').replace('http://', '')
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((host, port)) == 0


def _get_free_port(port, debug):
    # check port is busy
    if not debug:
        original_port = port
        # try up to 1000 new ports
        while check_port_in_use('localhost', port):
            old_port = port
            port = int(port) + 1
            if port - original_port >= 1000:
                raise ConnectionError(
                    '\n*** WARNING! ***\n Could not find an available port\n'
                    + ' to launch label studio. \n Last tested port was '
                    + str(port)
                    + '\n****************\n'
                )
            print(
                '\n*** WARNING! ***\n* Port '
                + str(old_port)
                + ' is in use.\n'
                + '* Trying to start at '
                + str(port)
                + '\n****************\n'
            )
    return port


def _project_exists(project_name):
    from projects.models import Project

    return Project.objects.filter(title=project_name).exists()


def main():
    input_args = parse_input_args(sys.argv[1:])

    # setup logging level
    if input_args.log_level:
        os.environ.setdefault('LOG_LEVEL', input_args.log_level)

    if input_args.database:
        database_path = pathlib.Path(input_args.database)
        os.environ.setdefault('DATABASE_NAME', str(database_path.absolute()))

    if input_args.data_dir:
        data_dir_path = pathlib.Path(input_args.data_dir)
        os.environ.setdefault('LABEL_STUDIO_BASE_DATA_DIR', str(data_dir_path.absolute()))

    config = _get_config(input_args.config_path)

    # set host name
    host = input_args.host or config.get('host', '')
    if not get_env('HOST'):
        os.environ.setdefault('HOST', host)  # it will be passed to settings.HOSTNAME as env var

    _setup_env()
    _apply_database_migrations()

    from label_studio.core.utils.common import collect_versions

    versions = collect_versions()

    if input_args.command == 'reset_password':
        _reset_password(input_args)
        return

    if input_args.command == 'shell':
        call_command('shell_plus')
        return

    if input_args.command == 'calculate_stats_all_orgs':
        from tasks.functions import calculate_stats_all_orgs

        calculate_stats_all_orgs(input_args.from_scratch, redis=True)
        return

    if input_args.command == 'export':
        from tasks.functions import export_project

        try:
            filename = export_project(
                input_args.project_id,
                input_args.export_format,
                input_args.export_path,
                serializer_context=input_args.export_serializer_context,
            )
        except Exception as e:
            logger.exception(f'Failed to export project: {e}')
        else:
            logger.info(f'Project exported successfully: {filename}')

        return

    # print version
    if input_args.command == 'version' or input_args.version:
        from label_studio import __version__

        print('\nLabel Studio version:', __version__, '\n')
        print(json.dumps(versions, indent=4))

    # init
    elif input_args.command == 'user' or getattr(input_args, 'user', None):
        _get_user_info(input_args.username)
        return

    # init
    elif input_args.command == 'init' or getattr(input_args, 'init', None):
        _init(input_args, config)

        print('')
        print('Label Studio has been successfully initialized.')
        if input_args.command != 'start' and input_args.project_name:
            print('Start the server: label-studio start ' + input_args.project_name)
            return

    # start with migrations from old projects, '.' project_name means 'label-studio start' without project name
    elif input_args.command == 'start' and input_args.project_name != '.':
        from projects.models import Project

        from label_studio.core.old_ls_migration import migrate_existing_project

        sampling_map = {
            'sequential': Project.SEQUENCE,
            'uniform': Project.UNIFORM,
            'prediction-score-min': Project.UNCERTAINTY,
        }

        if input_args.project_name and not _project_exists(input_args.project_name):
            migrated = False
            project_path = pathlib.Path(input_args.project_name)
            if project_path.exists():
                print('Project directory from previous version of label-studio found')
                print('Start migrating..')
                config_path = project_path / 'config.json'
                config = _get_config(config_path)
                user = _create_user(input_args, config)
                label_config_path = project_path / 'config.xml'
                project = _create_project(
                    title=input_args.project_name,
                    user=user,
                    label_config=label_config_path,
                    sampling=sampling_map.get(config.get('sampling', 'sequential'), Project.UNIFORM),
                    description=config.get('description', ''),
                )
                migrate_existing_project(project_path, project, config)
                migrated = True

                print(
                    Fore.LIGHTYELLOW_EX
                    + '\n*** WARNING! ***\n'
                    + f'Project {input_args.project_name} migrated to Label Studio Database\n'
                    + "YOU DON'T NEED THIS FOLDER ANYMORE"
                    + '\n****************\n'
                    + Fore.WHITE
                )
            if not migrated:
                print(
                    'Project "{project_name}" not found. '
                    'Did you miss create it first with `label-studio init {project_name}` ?'.format(
                        project_name=input_args.project_name
                    )
                )
                return

    # on `start` command, launch browser if --no-browser is not specified and start label studio server
    if input_args.command == 'start' or input_args.command is None:
        from label_studio.core.utils.common import start_browser

        if get_env('USERNAME') and get_env('PASSWORD') or input_args.username:
            _create_user(input_args, config)

        # ssl not supported from now
        cert_file = input_args.cert_file or config.get('cert')
        key_file = input_args.key_file or config.get('key')
        if cert_file or key_file:
            logger.error(
                "Label Studio doesn't support SSL web server with cert and key.\n" 'Use nginx or other servers for it.'
            )
            return

        # internal port and internal host for server start
        internal_host = input_args.internal_host or config.get('internal_host', '0.0.0.0')  # nosec
        internal_port = input_args.port or get_env('PORT') or config.get('port', 8080)
        try:
            internal_port = int(internal_port)
        except ValueError as e:
            logger.warning(f"Can't parse PORT '{internal_port}': {e}; default value 8080 will be used")
            internal_port = 8080

        internal_port = _get_free_port(internal_port, input_args.debug)

        # save selected port to global settings
        from django.conf import settings

        settings.INTERNAL_PORT = str(internal_port)

        # browser
        url = ('http://localhost:' + str(internal_port)) if not host else host
        start_browser(url, input_args.no_browser)

        _app_run(host=internal_host, port=internal_port)


if __name__ == '__main__':
    sys.exit(main())
