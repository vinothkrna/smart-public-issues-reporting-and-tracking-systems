from datetime import datetime
from . import db

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(100), nullable=False)  # 'USER_LOGIN', 'ISSUE_CREATED', 'STATUS_CHANGE', 'USER_BLOCKED', etc.
    entity_type = db.Column(db.String(50), nullable=True)  # 'User', 'Issue', 'Department'
    entity_id = db.Column(db.Integer, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('audit_logs', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'System',
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'ip_address': self.ip_address,
            'details': self.details,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
