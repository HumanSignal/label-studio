"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import sys
import logging
import socket
import pathlib
import os
import io
import json
import getpass

from colorama import init, Fore
if sys.platform == 'win32':
    init(convert=True)

# on windows there will be problems with sqlite and json1 support, so fix it
from label_studio.core.utils.windows_sqlite_fix import windows_dll_fix
windows_dll_fix()

from django.core.management import call_command
from django.db import IntegrityError
from django.core.wsgi import get_wsgi_application
from django.db.migrations.executor import MigrationExecutor
from django.db import connections, DEFAULT_DB_ALIAS

from label_studio.core.argparser import parse_input_args
from label_studio.core.utils.params import get_env

logger = logging.getLogger(__name__)


LS_PATH = str(pathlib.Path(__file__).parent.absolute())


def _setup_env():
    sys.path.insert(0, LS_PATH)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "label_studio.core.settings.label_studio")
    application = get_wsgi_application()


def _app_run(host, port):
    http_socket = '{}:{}'.format(host, port)
    call_command('runserver', '--noreload', http_socket)


def is_database_synchronized(database):
    connection = connections[database]
    connection.prepare_database()
    executor = MigrationExecutor(connection)
    targets = executor.loader.graph.leaf_nodes()
    return not executor.migration_plan(targets)


def _apply_database_migrations():
    if not is_database_synchronized(DEFAULT_DB_ALIAS):
        print('Initializing database..')
        call_command('migrate', '--no-color', verbosity=0)


def _get_config(config_path):
    with io.open(os.path.abspath(config_path), encoding='utf-8') as c:
        config = json.load(c)
    return config


def _create_project(title, user, label_config=None, sampling=None, description=None):
    from projects.models import Project
    from organizations.models import Organization

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

    project.save()
    return project


def _create_user(input_args, config):
    from users.models import User
    from organizations.models import Organization

    DEFAULT_USERNAME = 'default_user@localhost'

    username = input_args.username or config.get('username')
    password = input_args.password or config.get('password')

    if not username:
        user = User.objects.filter(email=DEFAULT_USERNAME).first()
        if user is not None:
            if password and not user.check_password(password):
                user.set_password(password)
                user.save()
                print('User password changed')
            return user
        print('Please enter default user email, or press Enter to use "default_user@localhost"')
        username = input('Email: ')
        if not username:
            username = DEFAULT_USERNAME
    if not password:
        password = getpass.getpass('Default user password: ')

    try:
        user = User.objects.create_user(email=username, password=password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
    except IntegrityError:
        print('User {} already exists'.format(username))

    user = User.objects.get(email=username)
    if not Organization.objects.exists():
        Organization.create_organization(created_by=user, title='Label Studio')

    return user


def _init(input_args, config):
    if not _project_exists(input_args.project_name):
        from projects.models import Project
        sampling_map = {'sequential': Project.SEQUENCE, 'uniform': Project.UNIFORM,
                        'prediction-score-min': Project.UNCERTAINTY}
        user = _create_user(input_args, config)
        _create_project(
            title=input_args.project_name,
            user=user,
            label_config=input_args.label_config,
            description=input_args.project_desc,
            sampling=sampling_map.get(input_args.sampling, 'sequential')
        )
    else:
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
    input_args = parse_input_args()

    # setup logging level
    if input_args.log_level:
        os.environ.setdefault("LOG_LEVEL", input_args.log_level)

    if input_args.database:
        database_path = pathlib.Path(input_args.database)
        os.environ.setdefault("DATABASE_NAME", str(database_path.absolute()))

    if input_args.data_dir:
        data_dir_path = pathlib.Path(input_args.data_dir)
        os.environ.setdefault("LABEL_STUDIO_BASE_DATA_DIR", str(data_dir_path.absolute()))

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

    # print version
    if input_args.command == 'version':
        from label_studio import __version__
        print('\nLabel Studio version:', __version__, '\n')
        print(json.dumps(versions, indent=4))

    # init
    elif input_args.command == 'init' or getattr(input_args, 'init', None):
        _init(input_args, config)

        print('')
        print('Label Studio has been successfully initialized.')
        if input_args.command != 'start':
            print('Start the server: label-studio start ' + input_args.project_name)
            return

    # start with migrations from old projects, '.' project_name means 'label-studio start' without project name
    elif input_args.command == 'start' and input_args.project_name != '.':
        from label_studio.core.old_ls_migration import migrate_existing_project
        from projects.models import Project
        sampling_map = {'sequential': Project.SEQUENCE, 'uniform': Project.UNIFORM,
                        'prediction-score-min': Project.UNCERTAINTY}

        if not _project_exists(input_args.project_name):
            migrated = False
            project_path = pathlib.Path(input_args.project_name)
            if project_path.exists():
                print('Project directory from previous verion of label-studio found')
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
                    Fore.LIGHTYELLOW_EX +
                    '\n*** WARNING! ***\n'
                    + f'Project {input_args.project_name} migrated to Label Studio Database\n'
                    + "YOU DON'T NEED THIS FOLDER ANYMORE"
                    + '\n****************\n' +
                    Fore.WHITE
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

        # ssl not supported from now
        cert_file = input_args.cert_file or config.get('cert')
        key_file = input_args.key_file or config.get('key')
        if cert_file or key_file:
            logger.error("Label Studio doesn't support SSL web server with cert and key.\n"
                         'Use nginx or other servers for it.')
            return

        # internal port and internal host for server start
        internal_host = input_args.internal_host or config.get('internal_host', '0.0.0.0')
        internal_port = get_env('PORT') or input_args.port or config.get('port', 8080)
        internal_port = int(internal_port)
        internal_port = _get_free_port(internal_port, input_args.debug)

        # browser
        url = ('http://localhost:' + str(internal_port)) if not host else host
        start_browser(url, input_args.no_browser)

        _app_run(host=internal_host, port=internal_port)


if __name__ == "__main__":
    sys.exit(main())
