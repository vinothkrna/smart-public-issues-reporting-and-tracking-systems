import unittest
import json
import uuid
from app import create_app
from models import db
from models.user import User
from models.issue import Issue
from models.email_verification import EmailVerification
from models.notification import Notification
from services.jwt_service import JWTService

class PlatformComprehensiveTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_citizen_registration_flow(self):
        """Test full citizen registration, OTP generation, and email verification."""
        test_email = f"citizen_{uuid.uuid4().hex[:8]}@example.com"

        # 1. Registration
        res = self.client.post('/api/auth/register', json={
            'name': 'Test Citizen',
            'email': test_email,
            'phone': '+91 9999988888',
            'password': 'password123',
            'confirm_password': 'password123'
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('token', data)
        self.assertIn('demo_otp', data)
        otp = data['demo_otp']
        token = data['token']

        # Verify user is in pending_verification status
        user = User.query.filter_by(email=test_email).first()
        self.assertIsNotNone(user)
        self.assertEqual(user.status, 'pending_verification')
        self.assertFalse(user.is_verified)

        # 2. Email Verification OTP
        v_res = self.client.post('/api/auth/verify-email', json={
            'token': token,
            'otp': otp,
            'email': test_email
        })
        self.assertEqual(v_res.status_code, 200)
        v_data = v_res.get_json()
        self.assertTrue(v_data.get('success'))
        self.assertIn('token', v_data)

        # Verify user is now active & verified
        user = User.query.filter_by(email=test_email).first()
        self.assertEqual(user.status, 'active')
        self.assertTrue(user.is_verified)

    def test_02_login_and_jwt_authentication(self):
        """Test Citizen and Department Admin login with JWT claims."""
        # 1. Citizen Login
        c_res = self.client.post('/api/auth/login', json={
            'email': 'vinoth@gmail.com',
            'password': '123456'
        })
        self.assertEqual(c_res.status_code, 200)
        c_data = c_res.get_json()
        self.assertIn('token', c_data)
        self.assertEqual(c_data['user']['role'], 'citizen')

        # Decode JWT token
        payload, err = JWTService.decode_token(c_data['token'])
        self.assertIsNone(err)
        self.assertEqual(payload['email'], 'vinoth@gmail.com')
        self.assertEqual(payload['role'], 'citizen')

        # 2. Department Admin Login (Roads Department)
        a_res = self.client.post('/api/auth/login', json={
            'email': 'roads.admin@smartcity.gov',
            'password': 'admin123',
            'department': 'Roads & Highways Department'
        })
        self.assertEqual(a_res.status_code, 200)
        a_data = a_res.get_json()
        self.assertEqual(a_data['user']['department'], 'Roads & Highways Department')

        # 3. Department Admin Login with mismatched department
        bad_res = self.client.post('/api/auth/login', json={
            'email': 'roads.admin@smartcity.gov',
            'password': 'admin123',
            'department': 'Sanitation Department'
        })
        self.assertEqual(bad_res.status_code, 403)

    def test_03_issue_filing_and_duplicate_detection(self):
        """Test filing a complaint and 150m duplicate detection."""
        # 1. File issue 1
        res1 = self.client.post('/api/issues', json={
            'title': 'Dangerous road crater at junction',
            'description': 'Deep road cavity causing hazards for two wheelers',
            'category': 'Pothole',
            'location': 'Ward 10 Main Street',
            'latitude': 11.3412,
            'longitude': 77.7175,
            'user_id': 2
        })
        self.assertEqual(res1.status_code, 201)
        data1 = res1.get_json()
        self.assertTrue(data1.get('success'))
        issue1 = data1['issue']
        self.assertEqual(issue1['department'], 'Roads & Highways Department')

        # 2. File very nearby duplicate within 150m (diff ~ 0.0001 deg)
        res2 = self.client.post('/api/issues', json={
            'title': 'Road crater nearby',
            'description': 'Large pothole on the same road',
            'category': 'Pothole',
            'location': 'Ward 10 Main Street 20m away',
            'latitude': 11.34125,
            'longitude': 77.71755,
            'user_id': 3
        })
        self.assertEqual(res2.status_code, 201)
        data2 = res2.get_json()
        self.assertTrue(data2.get('potential_duplicate'))
        self.assertIsNotNone(data2.get('duplicate_of_id'))

    def test_04_status_update_and_two_way_chat(self):
        """Test status transitions, official updates, and 2-way messaging dialogue."""
        issue = Issue.query.first()
        self.assertIsNotNone(issue)

        # 1. Update Status to In Progress
        u_res = self.client.put(f'/api/issues/{issue.issue_id}', json={
            'status': 'In Progress',
            'assigned_admin': 'Eng. K. Rajesh',
            'admin_id': 1
        })
        self.assertEqual(u_res.status_code, 200)

        # 2. Post a 2-way chat message
        msg_res = self.client.post(f'/api/issues/{issue.issue_id}/messages', json={
            'sender_id': 2,
            'sender_type': 'User',
            'message': 'Has the inspection crew arrived on site?'
        })
        self.assertEqual(msg_res.status_code, 201)
        msg_data = msg_res.get_json()
        self.assertTrue(msg_data.get('success'))

        # Check messages list
        list_res = self.client.get(f'/api/issues/{issue.issue_id}/messages')
        self.assertEqual(list_res.status_code, 200)
        messages = list_res.get_json()
        self.assertTrue(len(messages) > 0)

if __name__ == '__main__':
    unittest.main()
