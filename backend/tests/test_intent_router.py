import unittest
from app.chatbot.intent_router import Intent, IntentRouter


class TestIntentRouter(unittest.TestCase):
    def setUp(self):
        self.router = IntentRouter()

    def test_hi(self):
        self.assertEqual(self.router.detect("hi"), Intent.GREETING)

    def test_hello(self):
        self.assertEqual(self.router.detect("hello"), Intent.GREETING)

    def test_hey(self):
        self.assertEqual(self.router.detect("hey"), Intent.GREETING)

    def test_good_morning(self):
        self.assertEqual(self.router.detect("good morning"), Intent.GREETING)

    def test_non_greeting_long_sentence(self):
        result = self.router.detect("hello how do I file a complaint about road damage")
        self.assertNotEqual(result, Intent.GREETING)

    def test_status_keyword(self):
        self.assertEqual(self.router.detect("what is the status of my complaint"), Intent.COMPLAINT_STATUS)

    def test_track_keyword(self):
        self.assertEqual(self.router.detect("how do I track my complaint"), Intent.COMPLAINT_STATUS)

    def test_progress_keyword(self):
        self.assertEqual(self.router.detect("what is the progress of complaint number 123"), Intent.COMPLAINT_STATUS)

    def test_latest_complaint(self):
        self.assertEqual(self.router.detect("what is my latest complaint update"), Intent.COMPLAINT_STATUS)

    def test_my_complaints(self):
        self.assertEqual(self.router.detect("show my complaints"), Intent.MY_COMPLAINTS)

    def test_my_grievances(self):
        self.assertEqual(self.router.detect("list my grievances"), Intent.MY_COMPLAINTS)

    def test_all_my_complaints(self):
        self.assertEqual(self.router.detect("show all my complaints"), Intent.MY_COMPLAINTS)

    def test_how_to(self):
        self.assertEqual(self.router.detect("how to file a complaint"), Intent.KNOWLEDGE)

    def test_what_is(self):
        self.assertEqual(self.router.detect("what is the grievance portal"), Intent.KNOWLEDGE)

    def test_procedure_keyword(self):
        self.assertEqual(self.router.detect("what is the procedure for submitting"), Intent.KNOWLEDGE)

    def test_department_keyword(self):
        self.assertEqual(self.router.detect("which department handles electricity issues"), Intent.KNOWLEDGE)

    def test_policy_keyword(self):
        self.assertEqual(self.router.detect("what is the policy for rejected complaints"), Intent.KNOWLEDGE)

    def test_empty_string(self):
        self.assertEqual(self.router.detect(""), Intent.UNKNOWN)

    def test_whitespace_only(self):
        self.assertEqual(self.router.detect("   "), Intent.UNKNOWN)

    def test_gibberish_defaults_to_knowledge(self):
        result = self.router.detect("qwerty asdfgh zxcvbn")
        self.assertEqual(result, Intent.KNOWLEDGE)


if __name__ == "__main__":
    unittest.main()
