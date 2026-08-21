from datetime import datetime
from . import db

class ComplaintUpdate(db.Model):
    __tablename__ = 'complaint_updates'

    update_id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.issue_id', ondelete='CASCADE'), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    admin = db.relationship('User', foreign_keys=[admin_id], lazy=True)

    def to_dict(self):
        return {
            'update_id': self.update_id,
            'issue_id': self.issue_id,
            'admin_id': self.admin_id,
            'admin_name': self.admin.name if self.admin else 'Municipal Officer',
            'admin_department': self.admin.department if self.admin else 'City Administration',
            'message': self.message,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'formatted_date': self.created_at.strftime('%d %b %Y, %I:%M %p') if self.created_at else 'N/A'
        }

    def __repr__(self):
        return f'<ComplaintUpdate #{self.update_id} for Issue #{self.issue_id}>'
