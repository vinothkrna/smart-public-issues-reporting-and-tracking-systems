import unittest
import json
from app import create_app
from config import TestConfig
from models import db
from models.user import User
from models.issue import Issue
from models.notification import Notification
from seed_data import seed_database

class AIRoutingPipelineTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        seed_database()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_01_pothole_ai_routing_to_roads_department(self):
        """Verify citizen grievance with pothole text is classified and routed to Roads & Highways Admin."""
        res = self.client.post('/api/issues', json={
            'title': 'Dangerous road crater at junction',
            'description': 'Large pothole on tarmac asphalt causing vehicular accidents',
            'location': 'Ward 10 Main Street, Erode',
            'latitude': 11.3410,
            'longitude': 77.7172,
            'user_id': 2
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data['success'])
        issue = data['issue']

        # Verify AI classification
        self.assertEqual(issue['category'], 'Pothole')
        self.assertEqual(issue['department'], 'Roads & Highways Department')
        self.assertGreater(issue['ai_confidence'], 0.7)
        self.assertIn(issue['priority'], ['Medium', 'High', 'Urgent'])

        # Verify Admin dashboard API can retrieve it for Roads Department
        admin_res = self.client.get('/api/issues?department=Roads')
        self.assertEqual(admin_res.status_code, 200)
        admin_data = admin_res.get_json()
        self.assertTrue(any(i['issue_id'] == issue['issue_id'] for i in admin_data['issues']))

    def test_02_water_leakage_ai_routing_to_water_supply(self):
        """Verify water leakage report is classified and routed to Water Supply Department."""
        res = self.client.post('/api/issues', json={
            'title': 'Severe drinking water pipe burst',
            'description': 'Water pipeline burst near bus terminal gushing clean drinking water',
            'location': 'Gandhiji Road, Erode',
            'latitude': 11.3420,
            'longitude': 77.7180,
            'user_id': 2
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        issue = data['issue']

        self.assertEqual(issue['category'], 'Water Leakage')
        self.assertEqual(issue['department'], 'Water Supply Department')

        # Verify Water Supply department admin sees it
        admin_res = self.client.get('/api/issues?department=Water')
        self.assertEqual(admin_res.status_code, 200)
        admin_data = admin_res.get_json()
        self.assertTrue(any(i['issue_id'] == issue['issue_id'] for i in admin_data['issues']))

    def test_03_garbage_dump_ai_routing_to_sanitation(self):
        """Verify garbage report is classified and routed to Sanitation Department."""
        res = self.client.post('/api/issues', json={
            'title': 'Massive uncollected garbage dump',
            'description': 'Overflowing trash bin with rotten waste and plastic debris smell',
            'location': 'Market Ward 4',
            'latitude': 11.3450,
            'longitude': 77.7190,
            'user_id': 2
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        issue = data['issue']

        self.assertEqual(issue['category'], 'Garbage Dump')
        self.assertEqual(issue['department'], 'Sanitation Department')

        # Verify Sanitation department admin sees it
        admin_res = self.client.get('/api/issues?department=Sanitation')
        self.assertEqual(admin_res.status_code, 200)
        admin_data = admin_res.get_json()
        self.assertTrue(any(i['issue_id'] == issue['issue_id'] for i in admin_data['issues']))

    def test_04_critical_incident_alert_generation(self):
        """Verify emergency issues generate CRITICAL incident alerts for Commissioner & Department."""
        res = self.client.post('/api/issues', json={
            'title': 'Live electric wire spark emergency',
            'description': 'Dangerous broken wire with spark in public street risking electric shock to children',
            'location': 'School Zone Ward 3',
            'latitude': 11.3460,
            'longitude': 77.7195,
            'user_id': 2
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        issue = data['issue']

        self.assertEqual(issue['department'], 'Electricity Department')
        self.assertEqual(issue['priority_level'], 'CRITICAL')

if __name__ == '__main__':
    unittest.main()
