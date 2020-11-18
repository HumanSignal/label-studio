import sys
import json
import pathlib
import logging.config
import label_studio

from colorama import Fore
try:
    from boxing import boxing
except:
    # boxing is broken for Python3.5
    boxing = lambda x, **kwargs: x
    
from label_studio.utils.misc import get_latest_version, current_version_is_outdated

_HERE = pathlib.Path(__file__).resolve()
LOG_CONFIG_PATH = _HERE.parent / "logger.json"


def create_app(*args, **kwargs):
    """ Public create application factory
    """
    from label_studio.blueprint import create_app
    return create_app(*args, **kwargs)


def setup_default_logging_config():
    """ Setup default logging for Label Studio blueprint
    """
    with LOG_CONFIG_PATH.open(encoding='utf8') as f:
        logging.config.dictConfig(json.load(f))


def check_for_the_latest_version():
    latest_version = get_latest_version()

    def update_package_message():
        update_command = Fore.CYAN + 'pip install -U ' + label_studio.package_name + Fore.RESET
        return boxing(
            'Update available {curr_version} → {latest_version}\nRun {command}'.format(
                curr_version=label_studio.__version__,
                latest_version=latest_version,
                command=update_command
            ), style='double')

    if latest_version and current_version_is_outdated(latest_version):
        print(update_package_message())


def main():
    # configure logging before importing any label_studio code
    setup_default_logging_config()

    # Check for fresh updates
    check_for_the_latest_version()

    from label_studio.blueprint import main
    return main()


if __name__ == "__main__":
    sys.exit(main())
