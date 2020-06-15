# python
import os
from types import SimpleNamespace

# 3rd party
import unittest

# label_studio
from label_studio.server import app
from label_studio.project import Project


class BasicTest(unittest.TestCase):

    ############################
    #### setup and teardown ####
    ############################

    def setUp(self):
        """
            executed prior to each test
        """
        app.config['TESTING'] = True
        app.config['DEBUG'] = False

        self.app = app.test_client()

        project_name = 'my_project'
        user = 'admin'
        input_args_dict = {
            'root_dir':os.path.join(os.path.dirname(__file__), '../../')
        }
        input_args = SimpleNamespace(**input_args_dict)

        project = Project.get_or_create(project_name, input_args, context={
            'multi_session': False
        })

        # Disable sending emails during unit testing
        # mail.init_app(app)
        self.assertEqual(app.debug, False)

    # executed after each test
    def tearDown(self):
        pass
