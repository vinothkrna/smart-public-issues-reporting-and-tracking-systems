import unittest
import os
from app import create_app
from config import Config
from models import db
from models.user import User
from models.issue import Issue
from models.notification import Notification
from services.ai_service import AIService, calculate_haversine_distance
from services.notification_service import NotificationService

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    SECRET_KEY = 'test-secret-key'

class SmartPublicIssuesTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_user_creation_and_password_hashing(self):
        """Test User model creation and password verification."""
        user = User(name='Test Citizen', email='citizen@example.com', phone='1234567890', role='citizen')
        user.set_password('securepassword123')
        db.session.add(user)
        db.session.commit()

        retrieved = User.query.filter_by(email='citizen@example.com').first()
        self.assertIsNotNone(retrieved)
        self.assertTrue(retrieved.check_password('securepassword123'))
        self.assertFalse(retrieved.check_password('wrongpassword'))
        self.assertFalse(retrieved.is_administrator)

    def test_ai_classification_nlp(self):
        """Test AIService issue categorization across various civic keywords."""
        cat1, conf1, dept1, _ = AIService.classify_issue(
            title='Large pothole on highway',
            description='Deep crater on asphalt causing bike accidents'
        )
        self.assertEqual(cat1, 'Pothole')
        self.assertEqual(dept1, 'Roads & Highways Department')
        self.assertGreaterEqual(conf1, 0.7)

        cat2, conf2, dept2, _ = AIService.classify_issue(
            title='Streetlight broken',
            description='Dark street light pole blackout at night'
        )
        self.assertEqual(cat2, 'Streetlight Failure')
        self.assertEqual(dept2, 'Electricity Department')

        cat3, conf3, dept3, _ = AIService.classify_issue(
            title='Garbage dump pile',
            description='Overflowing trash bin and rotten food waste'
        )
        self.assertEqual(cat3, 'Garbage Dump')
        self.assertEqual(dept3, 'Sanitation Department')

    def test_ai_priority_prediction(self):
        """Test AIService priority prediction logic based on urgency triggers."""
        p_urgent = AIService.predict_priority(
            title='Emergency pipe burst flooding hospital road',
            description='Severe accident hazard live water gushing into school gate',
            category='Water Leakage'
        )
        self.assertEqual(p_urgent, 'Urgent')

        p_low = AIService.predict_priority(
            title='Small rubbish bin',
            description='Small paper litter on corner',
            category='Garbage Dump'
        )
        self.assertIn(p_low, ['Low', 'Medium'])

    def test_geospatial_distance_and_duplicate_detection(self):
        """Test Haversine distance calculation and duplicate detection."""
        # Two points ~ 100 meters apart in Erode
        lat1, lon1 = 11.3410, 77.7172
        lat2, lon2 = 11.3415, 77.7175
        dist = calculate_haversine_distance(lat1, lon1, lat2, lon2)
        self.assertLess(dist, 150.0)

        # Create dummy user & issue
        user = User(name='User1', email='u1@example.com')
        user.set_password('pass123')
        db.session.add(user)
        db.session.commit()

        orig_issue = Issue(
            user_id=user.id,
            title='Perundurai Road Pothole',
            description='Deep hole in road',
            category='Pothole',
            location='Perundurai Road',
            latitude=lat1,
            longitude=lon1,
            status='Submitted'
        )
        db.session.add(orig_issue)
        db.session.commit()

        # Check duplicate for a new report at lat2, lon2
        dup_result = AIService.check_duplicate(lat2, lon2, 'Pothole', [orig_issue])
        self.assertTrue(dup_result['duplicate_found'])
        self.assertEqual(dup_result['original_issue_id'], orig_issue.issue_id)

    def test_auth_api_flow(self):
        """Test /api/auth/register and /api/auth/login endpoints."""
        # Register
        res_reg = self.client.post('/api/auth/register', json={
            'name': 'API Citizen',
            'email': 'api_user@example.com',
            'password': 'password123',
            'confirm_password': 'password123',
            'phone': '9876543210'
        })
        self.assertEqual(res_reg.status_code, 201)
        data_reg = res_reg.get_json()
        self.assertTrue(data_reg.get('success'))

        # Verify email OTP
        otp = data_reg['demo_otp']
        token = data_reg['token']
        res_ver = self.client.post('/api/auth/verify-email', json={
            'token': token,
            'otp': otp,
            'email': 'api_user@example.com'
        })
        self.assertEqual(res_ver.status_code, 200)

        # Login
        res_login = self.client.post('/api/auth/login', json={
            'email': 'api_user@example.com',
            'password': 'password123'
        })
        self.assertEqual(res_login.status_code, 200)
        data_login = res_login.get_json()
        self.assertEqual(data_login['user']['email'], 'api_user@example.com')

    def test_issue_reporting_api(self):
        """Test /api/issues complaint creation and retrieval."""
        # Create user
        user = User(name='Reporter', email='rep@example.com')
        user.set_password('123456')
        db.session.add(user)
        db.session.commit()

        # Report issue
        res = self.client.post('/api/issues', json={
            'title': 'Blocked storm drain',
            'description': 'Sewage water backing up during heavy rain near school',
            'location': 'Ward 5 Main Road',
            'latitude': 11.3400,
            'longitude': 77.7100,
            'user_id': user.id
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data['issue']['category'], 'Drainage Blockage')
        self.assertEqual(data['issue']['department'], 'Drainage & Sewer Department')

        # Get issues
        res_get = self.client.get('/api/issues')
        self.assertEqual(res_get.status_code, 200)
        data_get = res_get.get_json()
        issues_list = data_get.get('issues', []) if isinstance(data_get, dict) else data_get
        self.assertGreaterEqual(len(issues_list), 1)
        self.assertTrue(any(i['title'] == 'Blocked storm drain' for i in issues_list))

    def test_notification_service(self):
        """Test notification generation and unread counters."""
        user = User(name='Alert User', email='alert@example.com')
        user.set_password('123456')
        db.session.add(user)
        db.session.commit()

        issue = Issue(
            user_id=user.id,
            title='Broken Water Tap',
            description='Water leaking in park',
            category='Water Leakage',
            location='Central Park',
            status='Submitted'
        )
        db.session.add(issue)
        db.session.commit()

        NotificationService.notify_status_change(issue, 'Submitted', 'Assigned', 'Assigned to Water Board')
        unread = NotificationService.get_unread_count(user.id)
        self.assertEqual(unread, 1)

        NotificationService.mark_all_as_read(user.id)
        unread_after = NotificationService.get_unread_count(user.id)
        self.assertEqual(unread_after, 0)

if __name__ == '__main__':
    unittest.main()
