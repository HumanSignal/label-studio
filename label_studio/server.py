import json
import pathlib
import logging.config

_HERE = pathlib.Path(__file__).resolve()

LOG_CONFIG_PATH = _HERE.parent / "logger.json"


def create_app(*args, **kwargs):
    """
    public create application factory.

    for use in projects that don't want the default logging config
    """
    from .blueprint import create_app
    return create_app(*args, **kwargs)


def setup_default_logging_config():
    with LOG_CONFIG_PATH.open(encoding="utf8") as f:
        logging.config.dictConfig(json.load(f))


def main(*args, **kwargs):
    # configure log config before importing any label_studio code
    setup_default_logging_config()

    from .blueprint import main

    return main(*args, **kwargs)


if __name__ == "__main__":
    sys.exit(main())
