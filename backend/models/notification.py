from datetime import datetime
from . import db

class Notification(db.Model):
    __tablename__ = 'notifications'

    notification_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    issue_id = db.Column(db.Integer, db.ForeignKey('issues.issue_id', ondelete='CASCADE'), nullable=True)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='status_update', nullable=False)  # 'status_update', 'assignment', 'resolution', 'alert'
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'notification_id': self.notification_id,
            'user_id': self.user_id,
            'issue_id': self.issue_id,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'time_ago': self.get_time_ago()
        }

    def get_time_ago(self):
        if not self.created_at:
            return 'just now'
        diff = datetime.utcnow() - self.created_at
        seconds = diff.total_seconds()
        if seconds < 60:
            return 'just now'
        elif seconds < 3600:
            mins = int(seconds / 60)
            return f'{mins}m ago'
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f'{hours}h ago'
        else:
            days = int(seconds / 86400)
            return f'{days}d ago'

    def __repr__(self):
        return f'<Notification #{self.notification_id} for User #{self.user_id}>'
