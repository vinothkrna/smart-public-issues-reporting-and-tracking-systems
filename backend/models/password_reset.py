from datetime import datetime, timedelta
import random
import uuid
from . import db

class PasswordReset(db.Model):
    __tablename__ = 'password_resets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    otp = db.Column(db.String(6), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref=db.backref('password_resets', lazy=True, cascade='all, delete-orphan'))

    @classmethod
    def create_otp_for_user(cls, user_id):
        """Generates a secure 6-digit OTP and reset token expiring in 15 minutes."""
        otp = f"{random.randint(100000, 999999)}"
        token = uuid.uuid4().hex
        expires_at = datetime.utcnow() + timedelta(minutes=15)

        reset_entry = cls(
            user_id=user_id,
            otp=otp,
            token=token,
            expires_at=expires_at,
            is_used=False
        )
        db.session.add(reset_entry)
        db.session.commit()
        return reset_entry

    def is_valid(self):
        """Returns True if the OTP token is not expired and has not been used."""
        return not self.is_used and datetime.utcnow() <= self.expires_at

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'otp': self.otp,
            'token': self.token,
            'expires_at': self.expires_at.strftime('%Y-%m-%d %H:%M:%S'),
            'is_used': self.is_used,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
