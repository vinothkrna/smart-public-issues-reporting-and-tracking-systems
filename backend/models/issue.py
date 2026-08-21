from datetime import datetime
from . import db

# SLA targets in hours per priority level
SLA_HOURS = {
    'Urgent': 24,
    'High': 48,
    'Medium': 72,
    'Low': 168  # 7 days
}

class Issue(db.Model):
    __tablename__ = 'issues'

    issue_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # 'Pothole', 'Garbage Dump', 'Water Leakage', etc.
    image_path = db.Column(db.String(255), nullable=True)
    location = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    address = db.Column(db.String(500), nullable=True)  # Full reverse-geocoded address
    area = db.Column(db.String(150), nullable=True)     # Area / Locality / Suburb
    city = db.Column(db.String(150), nullable=True)     # City / Municipality / Town
    state = db.Column(db.String(150), nullable=True)    # State / Region
    status = db.Column(db.String(50), default='Submitted', nullable=False)  # 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'
    priority = db.Column(db.String(20), default='Medium', nullable=False)  # 'Low', 'Medium', 'High', 'Urgent'

    # Department & Resolution Assignment
    department = db.Column(db.String(100), nullable=True)
    recommended_department = db.Column(db.String(100), nullable=True)
    assigned_department = db.Column(db.String(100), nullable=True)
    assigned_to = db.Column(db.String(100), nullable=True)
    assigned_admin = db.Column(db.String(100), nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)
    resolution_image = db.Column(db.String(255), nullable=True)
    resolution_deadline = db.Column(db.DateTime, nullable=True)

    # Citizen Feedback
    feedback_rating = db.Column(db.Integer, nullable=True)  # 1 to 5 stars
    feedback_comment = db.Column(db.Text, nullable=True)

    # AI Metadata
    ai_category = db.Column(db.String(50), nullable=True)
    ai_confidence = db.Column(db.Float, nullable=True)
    ai_detected_category = db.Column(db.String(50), nullable=True)
    priority_level = db.Column(db.String(20), default='MEDIUM', nullable=False)  # 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    priority_score = db.Column(db.Float, nullable=True)
    ai_priority_score = db.Column(db.Float, nullable=True)  # Numeric 0-100 AI urgency score
    is_duplicate_of = db.Column(db.Integer, db.ForeignKey('issues.issue_id', ondelete='SET NULL'), nullable=True)
    upvotes = db.Column(db.Integer, default=1)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    notifications = db.relationship('Notification', backref='issue', lazy=True, cascade='all, delete-orphan')
    duplicate_reports = db.relationship('Issue', backref=db.backref('original_issue', remote_side=[issue_id]), lazy=True)
    updates = db.relationship('ComplaintUpdate', backref='issue', lazy=True, cascade='all, delete-orphan', order_by='ComplaintUpdate.created_at.desc()')
    messages = db.relationship('ComplaintMessage', backref='issue', lazy=True, cascade='all, delete-orphan', order_by='ComplaintMessage.created_at.asc()')
    status_history = db.relationship('StatusHistory', backref='issue', lazy=True, cascade='all, delete-orphan', order_by='StatusHistory.updated_at.asc()')

    def get_age_hours(self):
        """Returns how many hours old this issue is."""
        if self.created_at:
            delta = datetime.utcnow() - self.created_at
            return delta.total_seconds() / 3600
        return 0

    def get_sla_hours(self):
        """Returns the SLA target in hours for this issue's priority."""
        return SLA_HOURS.get(self.priority, 72)

    def get_sla_remaining_hours(self):
        """Returns hours remaining before SLA breach. Negative = already breached."""
        return self.get_sla_hours() - self.get_age_hours()

    def is_sla_breached(self):
        """True if the issue has exceeded its SLA deadline."""
        if self.status in ['Resolved', 'Rejected']:
            return False
        return self.get_sla_remaining_hours() < 0

    def get_sla_progress_pct(self):
        """Returns 0-100 SLA consumption percentage (100 = breached)."""
        sla = self.get_sla_hours()
        if sla <= 0:
            return 100
        return min(100, round((self.get_age_hours() / sla) * 100, 1))

    def to_dict(self, include_details=False):
        sla_remaining = self.get_sla_remaining_hours()
        data = {
            'issue_id': self.issue_id,
            'user_id': self.user_id,
            'reporter_name': self.reporter.name if self.reporter else 'Anonymous',
            'reporter_email': self.reporter.email if self.reporter else None,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'image_path': self.image_path,
            'location': self.location,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'area': self.area,
            'city': self.city,
            'state': self.state,
            'status': self.status,
            'priority': self.priority,
            'priority_level': self.priority_level or self.priority.upper(),
            'priority_score': round(self.priority_score or self.ai_priority_score or 50.0, 1),
            'department': self.department or self.assigned_department or 'General Administration',
            'recommended_department': self.recommended_department or self.department or 'General Administration',
            'assigned_department': self.assigned_department or self.department or 'General Administration',
            'assigned_to': self.assigned_to,
            'assigned_admin': self.assigned_admin,
            'resolution_notes': self.resolution_notes,
            'resolution_image': self.resolution_image,
            'resolution_deadline': self.resolution_deadline.strftime('%Y-%m-%d %H:%M:%S') if self.resolution_deadline else None,
            'feedback_rating': self.feedback_rating,
            'feedback_comment': self.feedback_comment,
            'ai_category': self.ai_category or self.ai_detected_category or self.category,
            'ai_confidence': round(self.ai_confidence, 2) if self.ai_confidence is not None else 0.92,
            'ai_detected_category': self.ai_detected_category or self.ai_category or self.category,
            'ai_priority_score': round(self.ai_priority_score or self.priority_score or 50.0, 1),
            'is_duplicate_of': self.is_duplicate_of,
            'upvotes': self.upvotes,
            'age_hours': round(self.get_age_hours(), 1),
            'sla_hours': self.get_sla_hours(),
            'sla_remaining_hours': round(sla_remaining, 1),
            'sla_progress_pct': self.get_sla_progress_pct(),
            'is_sla_breached': self.is_sla_breached(),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
            'resolved_at': self.resolved_at.strftime('%Y-%m-%d %H:%M:%S') if self.resolved_at else None,
            'timeline': self.get_timeline(),
            'messages_count': len(self.messages) if self.messages else 0,
            'updates_count': len(self.updates) if self.updates else 0
        }

        if include_details:
            data['updates'] = [u.to_dict() for u in self.updates]
            data['messages'] = [m.to_dict() for m in self.messages]
            data['status_history'] = [h.to_dict() for h in self.status_history]

        return data

    def get_timeline(self):
        history_map = {}
        if self.status_history:
            for h in self.status_history:
                history_map[h.new_status] = h.formatted_time

        stages = [
            {
                'stage': 'Submitted',
                'label': 'Complaint Submitted',
                'done': True,
                'date': history_map.get('Submitted') or (self.created_at.strftime('%d %b %Y, %I:%M %p') if self.created_at else 'N/A')
            },
            {
                'stage': 'Under Review',
                'label': 'AI & Admin Verification',
                'done': self.status in ['Under Review', 'Assigned', 'In Progress', 'Resolved'],
                'date': history_map.get('Under Review') or (self.updated_at.strftime('%d %b %Y, %I:%M %p') if self.status in ['Under Review', 'Assigned', 'In Progress', 'Resolved'] and self.status != 'Submitted' else None)
            },
            {
                'stage': 'Assigned',
                'label': f'Assigned to {self.department or "Department"}',
                'done': self.status in ['Assigned', 'In Progress', 'Resolved'],
                'date': history_map.get('Assigned') or None
            },
            {
                'stage': 'In Progress',
                'label': 'Field Action in Progress',
                'done': self.status in ['In Progress', 'Resolved'],
                'date': history_map.get('In Progress') or None
            },
            {
                'stage': 'Resolved',
                'label': 'Issue Resolved',
                'done': self.status == 'Resolved',
                'date': history_map.get('Resolved') or (self.resolved_at.strftime('%d %b %Y, %I:%M %p') if self.resolved_at else None)
            }
        ]
        if self.status == 'Rejected':
            stages.append({
                'stage': 'Rejected',
                'label': 'Complaint Rejected',
                'done': True,
                'date': history_map.get('Rejected') or (self.updated_at.strftime('%d %b %Y, %I:%M %p') if self.updated_at else None)
            })
        return stages

    def __repr__(self):
        return f'<Issue #{self.issue_id} {self.title} [{self.status}]>'
