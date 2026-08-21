from datetime import datetime
from . import db

class StatusHistory(db.Model):
    __tablename__ = 'status_history'

    history_id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.issue_id', ondelete='CASCADE'), nullable=False)
    old_status = db.Column(db.String(50), nullable=True)
    new_status = db.Column(db.String(50), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    updater = db.relationship('User', foreign_keys=[updated_by], lazy=True)

    @property
    def formatted_time(self):
        return self.updated_at.strftime('%d %b %Y, %I:%M %p') if self.updated_at else 'N/A'

    def to_dict(self):
        return {
            'history_id': self.history_id,
            'issue_id': self.issue_id,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'updated_by_id': self.updated_by,
            'updated_by_name': self.updater.name if self.updater else 'System / Admin',
            'updated_by_role': self.updater.role if self.updater else 'admin',
            'notes': self.notes,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
            'formatted_time': self.formatted_time
        }

    def __repr__(self):
        return f'<StatusHistory #{self.history_id} [{self.old_status} -> {self.new_status}] for Issue #{self.issue_id}>'
