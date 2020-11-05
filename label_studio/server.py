import sys
import json
import pathlib
import logging.config

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


def main():
    # configure logging before importing any label_studio code
    setup_default_logging_config()

    from label_studio.blueprint import main
    return main()


if __name__ == "__main__":
    sys.exit(main())
