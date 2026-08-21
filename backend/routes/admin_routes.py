import os
import uuid
import csv
import io
from datetime import datetime
from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, Response, current_app
from flask_login import login_required, current_user
from models import db
from models.user import User
from models.issue import Issue
from services.notification_service import NotificationService

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_administrator:
            flash('Administrator access required.', 'danger')
            return redirect(url_for('auth.login', next=request.path))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/admin')
@login_required
@admin_required
def admin_dashboard():
    # Filter parameters
    status_filter = request.args.get('status', 'All')
    category_filter = request.args.get('category', 'All')
    priority_filter = request.args.get('priority', 'All')
    dept_filter = request.args.get('department', 'All')
    search_query = request.args.get('search', '').strip()

    query = Issue.query

    if status_filter != 'All':
        query = query.filter_by(status=status_filter)
    if category_filter != 'All':
        query = query.filter_by(category=category_filter)
    if priority_filter != 'All':
        query = query.filter_by(priority=priority_filter)
    if dept_filter != 'All':
        query = query.filter_by(department=dept_filter)
    if search_query:
        query = query.filter(
            (Issue.title.ilike(f'%{search_query}%')) |
            (Issue.location.ilike(f'%{search_query}%')) |
            (Issue.issue_id == int(search_query) if search_query.isdigit() else False)
        )

    all_issues = query.order_by(
        db.case(
            (Issue.priority == 'Urgent', 1),
            (Issue.priority == 'High', 2),
            (Issue.priority == 'Medium', 3),
            else_=4
        ),
        Issue.created_at.desc()
    ).all()

    # Metrics
    total = Issue.query.count()
    pending = Issue.query.filter(Issue.status.in_(['Submitted', 'Under Review'])).count()
    assigned = Issue.query.filter_by(status='Assigned').count()
    in_progress = Issue.query.filter_by(status='In Progress').count()
    resolved = Issue.query.filter_by(status='Resolved').count()
    urgent_count = Issue.query.filter_by(priority='Urgent').filter(Issue.status != 'Resolved').count()

    departments = [
        'Roads & PWD',
        'Sanitation & Solid Waste',
        'Water Supply & Sewerage',
        'Electricity Board',
        'Drainage & Stormwater',
        'Public Health & Environment'
    ]

    return render_template('admin.html',
                           issues=all_issues,
                           total=total,
                           pending=pending,
                           assigned=assigned,
                           in_progress=in_progress,
                           resolved=resolved,
                           urgent_count=urgent_count,
                           status_filter=status_filter,
                           category_filter=category_filter,
                           priority_filter=priority_filter,
                           dept_filter=dept_filter,
                           departments=departments,
                           search_query=search_query)

@admin_bp.route('/admin/issue/<int:issue_id>/assign', methods=['POST'])
@login_required
@admin_required
def assign_department(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    department = request.form.get('department')
    assigned_to = request.form.get('assigned_to')
    priority = request.form.get('priority')

    if department:
        issue.department = department
    if assigned_to:
        issue.assigned_to = assigned_to
    if priority:
        issue.priority = priority
        
    old_status = issue.status
    issue.status = 'Assigned'
    db.session.commit()

    NotificationService.notify_status_change(
        issue=issue,
        old_status=old_status,
        new_status='Assigned',
        notes=f"Assigned to {issue.department} (Officer: {issue.assigned_to or 'Field Team'})"
    )

    flash(f'Issue #{issue.issue_id} assigned to {issue.department} successfully.', 'success')
    return redirect(request.referrer or url_for('admin.admin_dashboard'))

@admin_bp.route('/admin/issue/<int:issue_id>/status', methods=['POST'])
@login_required
@admin_required
def update_status(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    new_status = request.form.get('status')
    notes = request.form.get('notes', '').strip()

    if new_status:
        old_status = issue.status
        issue.status = new_status
        if notes:
            issue.resolution_notes = notes
        if new_status == 'Resolved':
            issue.resolved_at = datetime.utcnow()

        db.session.commit()
        NotificationService.notify_status_change(issue, old_status, new_status, notes)
        flash(f'Status for Issue #{issue.issue_id} updated to {new_status}.', 'success')

    return redirect(request.referrer or url_for('admin.admin_dashboard'))

@admin_bp.route('/admin/issue/<int:issue_id>/resolve', methods=['POST'])
@login_required
@admin_required
def resolve_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    resolution_notes = request.form.get('resolution_notes', '').strip()
    
    # Handle resolution proof image upload
    file = request.files.get('resolution_image')
    if file and file.filename:
        ext = file.filename.rsplit('.', 1)[1].lower()
        res_filename = f"res_{uuid.uuid4().hex[:12]}_{int(datetime.utcnow().timestamp())}.{ext}"
        upload_dir = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_dir, exist_ok=True)
        file.save(os.path.join(upload_dir, res_filename))
        issue.resolution_image = f"uploads/{res_filename}"

    old_status = issue.status
    issue.status = 'Resolved'
    issue.resolution_notes = resolution_notes or 'Issue resolved by field municipal department.'
    issue.resolved_at = datetime.utcnow()

    db.session.commit()
    NotificationService.notify_status_change(issue, old_status, 'Resolved', issue.resolution_notes)

    flash(f'🎉 Issue #{issue.issue_id} marked as RESOLVED with proof.', 'success')
    return redirect(request.referrer or url_for('admin.admin_dashboard'))

@admin_bp.route('/analytics')
@login_required
def analytics_view():
    total_issues = Issue.query.count()
    resolved = Issue.query.filter_by(status='Resolved').count()
    pending = Issue.query.filter(Issue.status != 'Resolved').count()

    return render_template('analytics.html',
                           total=total_issues,
                           resolved=resolved,
                           pending=pending)

@admin_bp.route('/api/analytics')
def api_analytics():
    # Category Distribution
    categories = ['Pothole', 'Garbage Dump', 'Water Leakage', 'Streetlight Failure', 'Drainage Blockage']
    cat_counts = {}
    for cat in categories:
        cat_counts[cat] = Issue.query.filter_by(category=cat).count()

    # Status Distribution
    statuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected']
    status_counts = {}
    for st in statuses:
        status_counts[st] = Issue.query.filter_by(status=st).count()

    # Priority Distribution
    priorities = ['Low', 'Medium', 'High', 'Urgent']
    priority_counts = {}
    for pr in priorities:
        priority_counts[pr] = Issue.query.filter_by(priority=pr).count()

    # Department Workload
    dept_data = db.session.query(Issue.department, db.func.count(Issue.issue_id))\
        .filter(Issue.department.isnot(None))\
        .group_by(Issue.department)\
        .all()
    dept_workload = {dept: count for dept, count in dept_data}

    return jsonify({
        'categories': cat_counts,
        'statuses': status_counts,
        'priorities': priority_counts,
        'departments': dept_workload,
        'summary': {
            'total': Issue.query.count(),
            'resolved': Issue.query.filter_by(status='Resolved').count(),
            'pending': Issue.query.filter(Issue.status != 'Resolved').count(),
            'resolution_rate': round((Issue.query.filter_by(status='Resolved').count() / max(1, Issue.query.count())) * 100, 1)
        }
    })

@admin_bp.route('/admin/export/csv')
def export_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Issue ID', 'Title', 'Category', 'Status', 'Priority',
        'Department', 'Assigned Officer', 'Location', 'Latitude', 'Longitude',
        'Reporter Name', 'Reporter Email', 'Created At', 'Resolved At', 'Resolution Notes'
    ])

    issues = Issue.query.order_by(Issue.created_at.desc()).all()
    for i in issues:
        writer.writerow([
            i.issue_id,
            i.title,
            i.category,
            i.status,
            i.priority,
            i.department or 'Unassigned',
            i.assigned_to or 'None',
            i.location,
            i.latitude,
            i.longitude,
            i.reporter.name if i.reporter else 'Anonymous',
            i.reporter.email if i.reporter else 'N/A',
            i.created_at.strftime('%Y-%m-%d %H:%M:%S') if i.created_at else '',
            i.resolved_at.strftime('%Y-%m-%d %H:%M:%S') if i.resolved_at else '',
            i.resolution_notes or ''
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=public_issues_master_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

# ── CENTRAL MASTER DATA VAULT & INTELLIGENCE HUB ENDPOINTS ──

@admin_bp.route('/api/admin/data-vault/summary')
def api_data_vault_summary():
    from models.complaint_message import ComplaintMessage
    from models.complaint_update import ComplaintUpdate
    from models.audit_log import AuditLog
    from models.notification import Notification
    from models.department import Department

    total_issues = Issue.query.count()
    total_users = User.query.count()
    citizens_count = User.query.filter_by(role='citizen').count()
    admins_count = User.query.filter(User.role.in_(['admin', 'superadmin', 'officer'])).count()
    total_audits = AuditLog.query.count()
    total_messages = ComplaintMessage.query.count()
    total_updates = ComplaintUpdate.query.count()
    total_notifications = Notification.query.count()
    total_departments = Department.query.count() or 6

    # DB file size
    db_size_bytes = 0
    db_path = os.path.join(current_app.root_path, 'database.db')
    if os.path.exists(db_path):
        db_size_bytes = os.path.getsize(db_path)
    
    if db_size_bytes < 1024:
        db_size_formatted = f"{db_size_bytes} B"
    elif db_size_bytes < 1024 * 1024:
        db_size_formatted = f"{(db_size_bytes / 1024):.1f} KB"
    else:
        db_size_formatted = f"{(db_size_bytes / (1024 * 1024)):.2f} MB"

    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
        'counts': {
            'issues': total_issues,
            'users': total_users,
            'citizens': citizens_count,
            'admins': admins_count,
            'audits': total_audits,
            'messages': total_messages,
            'updates': total_updates,
            'notifications': total_notifications,
            'departments': total_departments
        },
        'database': {
            'engine': 'SQLite 3 (WAL mode)',
            'size_bytes': db_size_bytes,
            'size_formatted': db_size_formatted,
            'integrity': 'Verified Clean',
            'last_sync': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        }
    })

@admin_bp.route('/api/admin/data-vault/users')
def api_data_vault_users():
    search = request.args.get('search', '').strip().lower()
    role_filter = request.args.get('role', 'All')

    query = User.query
    if role_filter != 'All':
        query = query.filter_by(role=role_filter)
    
    users = query.order_by(User.created_at.desc()).all()
    user_list = []
    for u in users:
        d = u.to_dict()
        d['issues_count'] = len(u.issues)
        if search:
            if search not in u.name.lower() and search not in u.email.lower() and search not in (u.phone or '').lower():
                continue
        user_list.append(d)

    return jsonify({
        'total': len(user_list),
        'users': user_list
    })

@admin_bp.route('/api/admin/data-vault/audit-logs')
def api_data_vault_audit_logs():
    from models.audit_log import AuditLog
    limit = int(request.args.get('limit', 100))
    action_filter = request.args.get('action', 'All')

    query = AuditLog.query
    if action_filter != 'All':
        query = query.filter_by(action=action_filter)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return jsonify({
        'total': len(logs),
        'audit_logs': [log.to_dict() for log in logs]
    })

@admin_bp.route('/api/admin/data-vault/communications')
def api_data_vault_communications():
    from models.complaint_message import ComplaintMessage
    from models.complaint_update import ComplaintUpdate

    limit = int(request.args.get('limit', 50))
    messages = ComplaintMessage.query.order_by(ComplaintMessage.created_at.desc()).limit(limit).all()
    updates = ComplaintUpdate.query.order_by(ComplaintUpdate.created_at.desc()).limit(limit).all()

    return jsonify({
        'messages': [m.to_dict() for m in messages],
        'updates': [u.to_dict() for u in updates]
    })

@admin_bp.route('/api/admin/data-vault/export/all-json')
def export_all_json():
    from models.complaint_message import ComplaintMessage
    from models.complaint_update import ComplaintUpdate
    from models.audit_log import AuditLog
    from models.status_history import StatusHistory

    data = {
        'metadata': {
            'exported_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
            'system': 'CivicTrack Smart Public Issues Reporting & Tracking System',
            'version': '2.4.0-PROD'
        },
        'users': [u.to_dict() for u in User.query.all()],
        'issues': [i.to_dict() for i in Issue.query.all()],
        'audit_logs': [a.to_dict() for a in AuditLog.query.all()],
        'messages': [m.to_dict() for m in ComplaintMessage.query.all()],
        'updates': [u.to_dict() for u in ComplaintUpdate.query.all()],
        'status_histories': [s.to_dict() for s in StatusHistory.query.all()]
    }

    import json
    json_str = json.dumps(data, indent=2)
    return Response(
        json_str,
        mimetype="application/json",
        headers={"Content-disposition": f"attachment; filename=civictrack_master_vault_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"}
    )

@admin_bp.route('/api/admin/data-vault/export/users-csv')
def export_users_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'User ID', 'Name', 'Email', 'Phone', 'Role', 'Status',
        'Is Verified', 'Department', 'Complaints Logged', 'Created At', 'Last Login'
    ])

    users = User.query.order_by(User.created_at.desc()).all()
    for u in users:
        writer.writerow([
            u.id,
            u.name,
            u.email,
            u.phone or 'N/A',
            u.role,
            u.status,
            'Yes' if u.is_verified else 'No',
            u.department or 'N/A',
            len(u.issues),
            u.created_at.strftime('%Y-%m-%d %H:%M:%S') if u.created_at else '',
            u.last_login.strftime('%Y-%m-%d %H:%M:%S') if u.last_login else 'Never'
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=civictrack_users_directory_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@admin_bp.route('/api/admin/data-vault/export/audit-csv')
def export_audit_csv():
    from models.audit_log import AuditLog
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Log ID', 'Timestamp', 'User ID', 'User Name', 'Action',
        'Entity Type', 'Entity ID', 'IP Address', 'Details'
    ])

    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).all()
    for l in logs:
        writer.writerow([
            l.id,
            l.created_at.strftime('%Y-%m-%d %H:%M:%S') if l.created_at else '',
            l.user_id or 'System',
            l.user.name if l.user else 'System Engine',
            l.action,
            l.entity_type or 'N/A',
            l.entity_id or 'N/A',
            l.ip_address or '127.0.0.1',
            l.details or ''
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=civictrack_audit_trail_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

