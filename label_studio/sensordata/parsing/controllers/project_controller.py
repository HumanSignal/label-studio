import json
import sys
from pathlib import Path
from typing import Any
from os import getenv

from PyQt5.QtWidgets import QFileDialog

from ..constants import PROJECT_CONFIG_FILE, PREVIOUS_SENSOR_DATA_FILE, PLOT_HEIGHT_FACTOR, PROJECT_DATABASE_FILE, \
    PREVIOUS_PROJECT_DIR, PROJECTS, APP_CONFIG_FILE, PROJECT_NAME, PROJECT_DIR

from sensormodel.models import Sensor, SensorType
# from database.models import db, Label, LabelType, Camera, Video, Sensor, SensorModel, SensorDataFile, \
#     SubjectMapping, Subject, Offset


INIT_PROJECT_CONFIG = {
    'subj_map': {},
    'next_col': 0,
    'formulas': {},
    'label_opacity': 50,
    'plot_width': 20,
    'timezone': 'UTC',
    PLOT_HEIGHT_FACTOR: 1.0,
    PREVIOUS_SENSOR_DATA_FILE: ""
}

INIT_APP_CONFIG = {
    PREVIOUS_PROJECT_DIR: "",
    PROJECTS: []
}


class ProjectController:

    def __init__(self, isTestProject: bool = False):
        self.isTestProject = isTestProject
        self.project_name = None
        self.project_dir = None
        self.project_config_file = None
        self.database_file = None
        self.settings_dict = {}
        self.settings_changed = False

    def load_or_create(self, project_dir, new_project=False):
        if project_dir is not None:
            self.project_dir = project_dir
            self.project_config_file = project_dir.joinpath(PROJECT_CONFIG_FILE)
            self.database_file = project_dir.joinpath(PROJECT_DATABASE_FILE)

            self.settings_dict = {}
            self.settings_changed = False
        if new_project or not self.project_config_file.is_file():
            self.create_project_directory()
        else:
            self.load_project_config()

        self.init_db()

    # def init_db(self):
    #     db.init(self.database_file)
    #     db.connect()

    #     if 'sensorusage' in db.get_tables():
    #         migrator.rename_table(self.database_file, 'sensorusage', 'subjectmapping')

    #     db.create_tables(
    #         [Label, LabelType, Camera, Video, Sensor, SensorModel, SensorDataFile, SubjectMapping, Subject,
    #          Offset])

    # @staticmethod
    # def close_db():
    #     db.close()

    def create_new_project(self, new_project_name, new_project_dir=None):
        if new_project_name is not None:
            if new_project_dir is None:
                new_project_dir = QFileDialog.getExistingDirectory(
                    self.gui,
                    caption="Select new project directory. A folder will be created.",
                    options=QFileDialog.ShowDirsOnly
                )

            # Add project name to project directory
            new_project_dir = Path(new_project_dir).joinpath(new_project_name)

            self.load_or_create(new_project_dir, new_project=True)

            self.project_name = new_project_name
            self.project_dir = new_project_dir
            self.set_setting('project_name', self.project_name)
            self.gui.app_controller.set_setting("previous_project_dir", new_project_dir.as_posix())

            # self.project_controller.create_new_project(project_dir, project_name)

            # # Create database
            # try:
            #     conn = sqlite3.connect(project_dir.joinpath(PROJECT_DATABASE_FILE).as_posix())
            #     create_database(conn)
            # except sqlite3.Error as e:
            #     print(e)

    def open_existing_project(self, project_dir):
        self.load_or_create(Path(project_dir))
        # Set project dir as most recent project dir
        self.gui.app_controller.app_config[PREVIOUS_PROJECT_DIR] = project_dir
        self.gui.app_controller.save_app_config()

    def create_project_directory(self):
        """
        Creates a new project folder, and the necessary project files.
        """
        if not self.project_dir.is_dir():
            self.project_dir.mkdir(parents=True, exist_ok=True)

        # Create new settings_dict dictionary
        self.settings_dict = INIT_PROJECT_CONFIG
        self.save()

    def load_project_config(self):
        """Loads the saved setting dictionary back into this class from a file"""
        with self.project_config_file.open(mode='r') as f:
            self.settings_dict = json.load(f)
            # self.load_timezone()

    def save(self) -> None:
        """Saves the current settings_dict dictionary to a file"""
        with self.project_config_file.open(mode='w') as f:
            json.dump(self.settings_dict, f)
        self.settings_changed = True

    def set_setting(self, setting: str, new_value: Any) -> None:
        """
        Adds or changes a setting with the given name.

        :param setting: The project setting to change
        :param new_value: The value the setting should get
        """

        self.settings_dict[setting] = new_value
        self.save()

    def get_setting(self, setting: str) -> Any:
        """
        Returns the value of a given setting.

        :param setting: The setting to retrieve
        :return: The value of the setting, or None if the setting is unknown
        """
        return self.settings_dict.get(setting)
