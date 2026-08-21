from datetime import datetime
from . import db

class ComplaintMessage(db.Model):
    __tablename__ = 'complaint_messages'

    message_id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.issue_id', ondelete='CASCADE'), nullable=False)
    sender_type = db.Column(db.String(20), default='User', nullable=False)  # 'User' or 'Admin'
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    message = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], lazy=True)

    def to_dict(self):
        return {
            'message_id': self.message_id,
            'issue_id': self.issue_id,
            'sender_type': self.sender_type,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else ('Citizen' if self.sender_type == 'User' else 'Admin Official'),
            'sender_role': self.sender.role if self.sender else ('citizen' if self.sender_type == 'User' else 'admin'),
            'message': self.message,
            'image_path': self.image_path,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'formatted_time': self.created_at.strftime('%d %b %Y, %I:%M %p') if self.created_at else 'just now'
        }

    def __repr__(self):
        return f'<ComplaintMessage #{self.message_id} ({self.sender_type}) on Issue #{self.issue_id}>'
