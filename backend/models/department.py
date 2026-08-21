from datetime import datetime
from . import db

class Department(db.Model):
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    icon = db.Column(db.String(50), default='building-2')
    color = db.Column(db.String(20), default='#3b82f6')
    description = db.Column(db.Text, nullable=True)
    head_officer = db.Column(db.String(100), nullable=True)
    contact_email = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.code,
            'db_id': self.id,
            'code': self.code,
            'name': self.name,
            'icon': self.icon,
            'color': self.color,
            'description': self.description,
            'head_officer': self.head_officer,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone
        }

    def __repr__(self):
        return f'<Department {self.name}>'
