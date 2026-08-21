from datetime import datetime
from models import db
from models.user import User
from models.department import Department
from models.issue import Issue
from models.notification import Notification
from models.complaint_update import ComplaintUpdate
from models.complaint_message import ComplaintMessage
from models.status_history import StatusHistory

def seed_database():
    """Populates database with master departments and initial system administrator accounts without any dummy issues."""
    # 0. Seed Departments Master Registry if empty
    departments_master = [
        {
            'code': 'roads_highways',
            'name': 'Roads & Highways Department',
            'icon': 'construction',
            'color': '#e67e22',
            'description': 'Manage road maintenance, potholes, and transportation infrastructure complaints.',
            'head_officer': 'Er. R. Murugesan, Chief Engineer',
            'contact_email': 'roads.admin@smartcity.gov',
            'contact_phone': '+91 9876500001'
        },
        {
            'code': 'sanitation',
            'name': 'Sanitation Department',
            'icon': 'trash-2',
            'color': '#27ae60',
            'description': 'Oversee waste collection, garbage disposal, and public cleanliness operations.',
            'head_officer': 'Dr. K. Senthil, Sanitation Director',
            'contact_email': 'sanitation.admin@smartcity.gov',
            'contact_phone': '+91 9876500002'
        },
        {
            'code': 'water_supply',
            'name': 'Water Supply Department',
            'icon': 'droplets',
            'color': '#3498db',
            'description': 'Handle water distribution, pipeline maintenance, and supply quality issues.',
            'head_officer': 'Er. P. Raman, Water Works Executive',
            'contact_email': 'water.admin@smartcity.gov',
            'contact_phone': '+91 9876500003'
        },
        {
            'code': 'electricity',
            'name': 'Electricity Department',
            'icon': 'zap',
            'color': '#f39c12',
            'description': 'Address streetlight failures, power outages, and electrical hazard complaints.',
            'head_officer': 'Er. S. Annamalai, Power Grid Head',
            'contact_email': 'electricity.admin@smartcity.gov',
            'contact_phone': '+91 9876500005'
        },
        {
            'code': 'drainage_sewer',
            'name': 'Drainage & Sewer Department',
            'icon': 'waves',
            'color': '#8e44ad',
            'description': 'Manage stormwater drains, sewer lines, and flood prevention infrastructure.',
            'head_officer': 'Er. M. Vasanth, Stormwater Cell Lead',
            'contact_email': 'drainage.admin@smartcity.gov',
            'contact_phone': '+91 9876500004'
        },
        {
            'code': 'public_health',
            'name': 'Public Health Department',
            'icon': 'heart-pulse',
            'color': '#e74c3c',
            'description': 'Monitor public health hazards, mosquito breeding, and sanitation-related health risks.',
            'head_officer': 'Dr. V. Meenakshi, Municipal Health Officer',
            'contact_email': 'health.admin@smartcity.gov',
            'contact_phone': '+91 9876500006'
        },
        {
            'code': 'municipal_commissioner',
            'name': 'Municipal Commissioner',
            'icon': 'landmark',
            'color': '#2c3e50',
            'description': 'Central monitoring and oversight of all municipal departments and escalated complaints.',
            'head_officer': 'Dr. A. Sundaram IAS, Municipal Commissioner',
            'contact_email': 'commissioner@smartcity.gov',
            'contact_phone': '+91 9876500007'
        },
        {
            'code': 'super_admin',
            'name': 'Super Admin',
            'icon': 'shield-check',
            'color': '#1a1a2e',
            'description': 'Full system administration with access to all departments, users, and platform settings.',
            'head_officer': 'Platform Governance Controller',
            'contact_email': 'admin@smartcity.gov',
            'contact_phone': '+91 9876500000'
        }
    ]

    for d in departments_master:
        if not Department.query.filter_by(code=d['code']).first():
            dept_obj = Department(**d)
            db.session.add(dept_obj)
    db.session.commit()

    # 1. Ensure Super Admin Account
    admin = User.query.filter_by(email="admin@smartcity.gov").first()
    if not admin:
        admin = User(
            name="City Admin Officer",
            email="admin@smartcity.gov",
            phone="+91 9876500000",
            role="superadmin",
            department="Super Admin",
            status="active",
            is_verified=True
        )
        admin.set_password("admin123")
        db.session.add(admin)

    # 2. Ensure Department-Specific Admin Accounts
    dept_admins = [
        {
            'name': 'Roads & Highways Officer',
            'email': 'roads.admin@smartcity.gov',
            'phone': '+91 9876500001',
            'department': 'Roads & Highways Department'
        },
        {
            'name': 'Sanitation Officer',
            'email': 'sanitation.admin@smartcity.gov',
            'phone': '+91 9876500002',
            'department': 'Sanitation Department'
        },
        {
            'name': 'Water Supply Officer',
            'email': 'water.admin@smartcity.gov',
            'phone': '+91 9876500003',
            'department': 'Water Supply Department'
        },
        {
            'name': 'Drainage & Sewer Officer',
            'email': 'drainage.admin@smartcity.gov',
            'phone': '+91 9876500004',
            'department': 'Drainage & Sewer Department'
        },
        {
            'name': 'Electricity Officer',
            'email': 'electricity.admin@smartcity.gov',
            'phone': '+91 9876500005',
            'department': 'Electricity Department'
        },
        {
            'name': 'Public Health Officer',
            'email': 'health.admin@smartcity.gov',
            'phone': '+91 9876500006',
            'department': 'Public Health Department'
        },
        {
            'name': 'Municipal Commissioner',
            'email': 'commissioner@smartcity.gov',
            'phone': '+91 9876500007',
            'department': 'Municipal Commissioner'
        },
    ]

    for dept_admin in dept_admins:
        existing_admin = User.query.filter_by(email=dept_admin['email']).first()
        if not existing_admin:
            da = User(
                name=dept_admin['name'],
                email=dept_admin['email'],
                phone=dept_admin['phone'],
                role='admin',
                department=dept_admin['department'],
                status='active',
                is_verified=True
            )
            da.set_password('admin123')
            db.session.add(da)

    # 3. Ensure Verified Primary Citizen Accounts
    citizens_data = [
        {
            'name': "VINOTH KRISHNA E",
            'email': "vevinoth333@gmail.com",
            'phone': "+91 9876543210",
            'password': "vinothciviccare"
        },
        {
            'name': "Vinoth Krishna",
            'email': "vinoth@gmail.com",
            'phone': "+91 9876543210",
            'password': "123456"
        }
    ]

    for c in citizens_data:
        existing_c = User.query.filter_by(email=c['email']).first()
        if not existing_c:
            cu = User(
                name=c['name'],
                email=c['email'],
                phone=c['phone'],
                role='citizen',
                status='active',
                is_verified=True
            )
            cu.set_password(c['password'])
            db.session.add(cu)
        else:
            # Keep credentials verified and up-to-date
            existing_c.status = 'active'
            existing_c.is_verified = True
            existing_c.set_password(c['password'])

    db.session.commit()
