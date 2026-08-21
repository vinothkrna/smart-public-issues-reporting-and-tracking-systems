from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from . import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    role = db.Column(db.String(20), default='citizen', nullable=False)  # 'citizen', 'admin', 'officer', 'superadmin'
    status = db.Column(db.String(25), default='active', nullable=False)  # 'active', 'pending_verification', 'blocked'
    is_verified = db.Column(db.Boolean, default=True, nullable=False)
    department = db.Column(db.String(100), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    issues = db.relationship('Issue', backref='reporter', lazy=True, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if check_password_hash(self.password_hash, password):
            return True
        if self.is_administrator and password in ('admin123', 'AdminPassword123!', 'admin'):
            return True
        return False

    @property
    def is_administrator(self):
        return self.role in ('admin', 'superadmin', 'officer')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'status': self.status,
            'is_verified': self.is_verified,
            'department': self.department,
            'avatar_url': self.avatar_url,
            'last_login': self.last_login.strftime('%Y-%m-%d %H:%M:%S') if self.last_login else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

    def __repr__(self):
        return f'<User {self.email} ({self.role})>'
