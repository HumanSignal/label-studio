# label_studio
from label_studio.tests.base import BasicTest


class WelcomeTest(BasicTest):
    """
        welcome page tests
    """

    def test_welcome_get(self):
        response = self.app.get('/welcome')
        self.assertEqual(response.status_code, 200)


    def test_welcome_no_post(self):
        response = self.app.post('/welcome')
        self.assertEqual(response.status_code, 405)
