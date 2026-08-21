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

from config import Config
from seed_data import seed_database

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    SECRET_KEY = 'test-secret-key-platform'

class PlatformComprehensiveTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        seed_database()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
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
        """Test Citizen and Department Admin login with explicit role verification and JWT claims."""
        # 1. Citizen Login with expected_role='citizen'
        c_res = self.client.post('/api/auth/login', json={
            'email': 'vinoth@gmail.com',
            'password': '123456',
            'role': 'citizen'
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

        # 2. Block Citizen from logging in under Admin tab
        c_as_admin_res = self.client.post('/api/auth/login', json={
            'email': 'vinoth@gmail.com',
            'password': '123456',
            'role': 'admin',
            'department': 'Roads & Highways Department'
        })
        self.assertEqual(c_as_admin_res.status_code, 403)
        c_as_admin_data = c_as_admin_res.get_json()
        self.assertEqual(c_as_admin_data.get('code'), 'ROLE_MISMATCH_CITIZEN')

        # 3. Block Admin from logging in under Citizen tab
        admin_as_citizen_res = self.client.post('/api/auth/login', json={
            'email': 'roads.admin@smartcity.gov',
            'password': 'admin123',
            'role': 'citizen'
        })
        self.assertEqual(admin_as_citizen_res.status_code, 403)
        admin_as_citizen_data = admin_as_citizen_res.get_json()
        self.assertEqual(admin_as_citizen_data.get('code'), 'ROLE_MISMATCH_ADMIN')

        # 4. Department Admin Login (Roads Department)
        a_res = self.client.post('/api/auth/login', json={
            'email': 'roads.admin@smartcity.gov',
            'password': 'admin123',
            'role': 'admin',
            'department': 'Roads & Highways Department'
        })
        self.assertEqual(a_res.status_code, 200)
        a_data = a_res.get_json()
        self.assertEqual(a_data['user']['department'], 'Roads & Highways Department')

        # 5. Department Admin Login with mismatched department
        bad_res = self.client.post('/api/auth/login', json={
            'email': 'roads.admin@smartcity.gov',
            'password': 'admin123',
            'role': 'admin',
            'department': 'Sanitation Department'
        })
        self.assertEqual(bad_res.status_code, 403)
        bad_data = bad_res.get_json()
        self.assertEqual(bad_data.get('code'), 'DEPT_MISMATCH')

        # 6. Admin Login without department
        no_dept_res = self.client.post('/api/auth/login', json={
            'email': 'roads.admin@smartcity.gov',
            'password': 'admin123',
            'role': 'admin'
        })
        self.assertEqual(no_dept_res.status_code, 400)

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
        issue = Issue(
            user_id=2,
            title='Perundurai Road Pothole Hazard',
            description='Deep pothole near school gate',
            category='Pothole',
            department='Roads & Highways Department',
            location='Ward 10 Main Road',
            status='Submitted'
        )
        db.session.add(issue)
        db.session.commit()

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

    def test_05_google_auth_citizen_and_admin(self):
        """Test Continue with Google authentication for Citizens and Admins."""
        # 1. Citizen Google Sign In (existing user)
        res1 = self.client.post('/api/auth/google', json={
            'email': 'vinoth@gmail.com',
            'name': 'Vinoth Krishna',
            'role': 'citizen',
            'expected_role': 'citizen'
        })
        self.assertEqual(res1.status_code, 200)
        data1 = res1.get_json()
        self.assertEqual(data1['user']['email'], 'vinoth@gmail.com')
        self.assertEqual(data1['user']['role'], 'citizen')
        self.assertIsNotNone(data1.get('token'))

        # 2. Admin Google Sign In (existing admin)
        res2 = self.client.post('/api/auth/google', json={
            'email': 'admin@smartcity.gov',
            'name': 'City Admin Officer',
            'role': 'admin',
            'expected_role': 'admin',
            'department': 'Super Admin'
        })
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertIn(data2['user']['role'], ['admin', 'superadmin', 'officer'])

        # 3. Role Mismatch protection: Admin attempting Google login under Citizen tab
        res3 = self.client.post('/api/auth/google', json={
            'email': 'admin@smartcity.gov',
            'role': 'citizen',
            'expected_role': 'citizen'
        })
        self.assertEqual(res3.status_code, 403)
        self.assertEqual(res3.get_json().get('code'), 'ROLE_MISMATCH_ADMIN')

        # 4. Role Mismatch protection: Citizen attempting Google login under Admin tab
        res4 = self.client.post('/api/auth/google', json={
            'email': 'vinoth@gmail.com',
            'role': 'admin',
            'expected_role': 'admin',
            'department': 'Roads & Highways Department'
        })
        self.assertEqual(res4.status_code, 403)
        self.assertEqual(res4.get_json().get('code'), 'ROLE_MISMATCH_CITIZEN')

        # 5. New Citizen Auto-provisioning via Google
        new_email = f"new_google_{uuid.uuid4().hex[:6]}@gmail.com"
        res5 = self.client.post('/api/auth/google', json={
            'email': new_email,
            'name': 'Google Citizen',
            'role': 'citizen',
            'expected_role': 'citizen'
        })
        self.assertEqual(res5.status_code, 200)
        data5 = res5.get_json()
        self.assertEqual(data5['user']['email'], new_email)
        self.assertEqual(data5['user']['role'], 'citizen')

if __name__ == '__main__':
    unittest.main()
