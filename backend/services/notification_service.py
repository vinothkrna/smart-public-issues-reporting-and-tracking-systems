from models import db
from models.notification import Notification
from models.user import User

class NotificationService:
    @staticmethod
    def send_notification(user_id, message, issue_id=None, notif_type='status_update'):
        """Creates a new notification for a user."""
        try:
            notif = Notification(
                user_id=user_id,
                issue_id=issue_id,
                message=message,
                type=notif_type,
                is_read=False
            )
            db.session.add(notif)
            db.session.commit()
            return notif
        except Exception as e:
            db.session.rollback()
            print(f"[NOTIFICATION ERROR] {e}")
            return None

    @staticmethod
    def notify_status_change(issue, old_status, new_status, notes=None):
        """Sends notification to the citizen when their complaint status updates."""
        if not issue or not issue.user_id:
            return None

        status_messages = {
            'Under Review': f"🔍 Issue #{issue.issue_id} ('{issue.title}') is now under verification by the municipal team.",
            'Assigned': f"📋 Issue #{issue.issue_id} has been assigned to {issue.department or 'the department'}.",
            'In Progress': f"🛠️ Field action is currently in progress for Issue #{issue.issue_id}.",
            'Resolved': f"✅ Issue #{issue.issue_id} has been marked as RESOLVED! {f'Notes: {notes}' if notes else 'Check resolution proof.'}",
            'Rejected': f"❌ Issue #{issue.issue_id} was reviewed and rejected. {f'Reason: {notes}' if notes else ''}"
        }

        message = status_messages.get(new_status, f"Status for Issue #{issue.issue_id} updated to '{new_status}'.")
        return NotificationService.send_notification(
            user_id=issue.user_id,
            message=message,
            issue_id=issue.issue_id,
            notif_type='resolution' if new_status == 'Resolved' else 'status_update'
        )

    @staticmethod
    def notify_department_admins(department, message, issue_id=None, notif_type='admin_alert'):
        """Notifies all admins assigned to a specific department, plus Super Admins & Commissioner."""
        try:
            dept_str = (department or '').lower()
            admins = User.query.filter(User.role.in_(['admin', 'superadmin', 'officer'])).all()
            target_admins = []
            for a in admins:
                user_dept = (a.department or '').lower()
                if not user_dept or user_dept in ('super admin', 'municipal commissioner', 'municipal administration'):
                    target_admins.append(a)
                elif any(k in user_dept and k in dept_str for k in ['road', 'sanitation', 'waste', 'water', 'drain', 'sewer', 'electr', 'health']):
                    target_admins.append(a)
                elif user_dept == dept_str:
                    target_admins.append(a)

            notifs = []
            for admin in target_admins:
                n = Notification(
                    user_id=admin.id,
                    issue_id=issue_id,
                    message=message,
                    type=notif_type,
                    is_read=False
                )
                db.session.add(n)
                notifs.append(n)

            db.session.commit()
            return notifs
        except Exception as e:
            db.session.rollback()
            print(f"[ADMIN NOTIFICATION ERROR] {e}")
            return []

    @staticmethod
    def notify_critical_incident(issue):
        """Dispatches an emergency broadcast for critical civic hazards."""
        msg = f"🚨 CRITICAL INCIDENT: Issue #{issue.issue_id} ('{issue.title}') reported at {issue.location}! Immediate action required."
        return NotificationService.notify_department_admins(
            department=issue.department or issue.assigned_department,
            message=msg,
            issue_id=issue.issue_id,
            notif_type='critical_alert'
        )

    @staticmethod
    def notify_chat_message(issue, sender_name, sender_role, message_snippet):
        """Notifies the other party in a grievance dialogue."""
        if sender_role == 'admin':
            # Notify citizen
            return NotificationService.send_notification(
                user_id=issue.user_id,
                message=f"💬 {sender_name} (Municipal Officer) replied to Issue #{issue.issue_id}: '{message_snippet[:60]}...'",
                issue_id=issue.issue_id,
                notif_type='admin_reply'
            )
        else:
            # Notify department admin
            return NotificationService.notify_department_admins(
                department=issue.department,
                message=f"💬 Citizen {sender_name} sent a message regarding Issue #{issue.issue_id}: '{message_snippet[:60]}...'",
                issue_id=issue.issue_id,
                notif_type='citizen_reply'
            )

    @staticmethod
    def get_user_notifications(user_id, limit=30):
        """Fetches latest notifications for any user."""
        return Notification.query.filter_by(user_id=user_id)\
            .order_by(Notification.created_at.desc())\
            .limit(limit)\
            .all()

    @staticmethod
    def get_unread_count(user_id):
        """Returns count of unread notifications."""
        return Notification.query.filter_by(user_id=user_id, is_read=False).count()

    @staticmethod
    def mark_all_as_read(user_id):
        """Marks all notifications for user as read."""
        Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
        db.session.commit()
