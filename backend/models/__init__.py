from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .user import User
from .department import Department
from .email_verification import EmailVerification
from .password_reset import PasswordReset
from .issue import Issue
from .notification import Notification
from .complaint_update import ComplaintUpdate
from .complaint_message import ComplaintMessage
from .status_history import StatusHistory
from .audit_log import AuditLog
