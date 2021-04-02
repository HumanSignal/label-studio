import os
import sys
import colorama
import logging


logger = logging.getLogger('main')


def start_fix():
    import zipfile
    import platform

    print(f'Copying sqlite3.dll to the current directory: {os.getcwd()} ... ', end='')

    work_dir = os.path.dirname(os.path.abspath(__file__))
    filename = 'sqlite-dll-win64-x64-3350000.zip' if platform.architecture()[0] == '64bit' \
        else 'sqlite-dll-win32-x86-3350100.zip'

    src = os.path.join(work_dir, filename)
    with zipfile.ZipFile(src, 'r') as zip_ref:
        zip_ref.extractall('.')

    print('finished')
    print(colorama.Fore.LIGHTRED_EX + '\nPlease restart Label Studio to load the updated sqlite.dll\n')
    print(colorama.Fore.WHITE)
    exit()


def windows_dll_fix():
    """ Copy sqlite.dll to the current directory and use it """

    # check if it is not on windows
    if sys.platform != 'win32':
        return

    # set env
    import ctypes
    path_to_dll = os.path.abspath('.')
    os.environ['PATH'] = path_to_dll + os.pathsep + os.environ['PATH']
    try:
        ctypes.CDLL(os.path.join(path_to_dll, 'sqlite3.dll'))
        logger.debug('Add current directory to PATH for DLL search: ' + path_to_dll)
    except OSError:
        logger.debug("Can't load sqlite3.dll from current directory")

    # check sqlite version
    import sqlite3
    v = sqlite3.sqlite_version_info
    if v[0] >= 3 and v[1] >= 35:
        return

    # check python version and warn
    if sys.version_info.major == 3 and sys.version_info.minor in [6, 7, 8]:
        print('\n' + colorama.Fore.LIGHTYELLOW_EX +
              'You are on ' +
              colorama.Fore.LIGHTRED_EX +
              f'Windows Python {sys.version_info.major}.{sys.version_info.minor}.\n' +
              colorama.Fore.LIGHTYELLOW_EX +
              f"This Python version uses SQLite "
              f"{colorama.Fore.LIGHTRED_EX}{v[0]}.{v[1]}.{v[2]} " +
              colorama.Fore.LIGHTYELLOW_EX +
              f"which doesn't support JSON1.\n" +
              'Read more about this issue: ' +
              colorama.Fore.LIGHTWHITE_EX  +
              'https://code.djangoproject.com/wiki/JSON1Extension [Windows section]\n')

        auto_agree = any([a == '--agree-fix-sqlite' for a in sys.argv])
        agree = 'n'
        if not auto_agree:
            print(colorama.Fore.WHITE +
                  'Label Studio can try to resolve this issue by adding the correct sqlite.dll in the current directory, '
                  'do you want to proceed? \n [y/n] > ', end='')
            agree = input()

        if agree == 'y' or auto_agree:
            start_fix()

    print(colorama.Fore.WHITE)