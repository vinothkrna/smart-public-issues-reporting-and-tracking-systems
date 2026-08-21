import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app
from flask_login import login_required, current_user
from models import db
from models.user import User
from models.issue import Issue
from models.notification import Notification
from models.complaint_update import ComplaintUpdate
from models.complaint_message import ComplaintMessage
from models.status_history import StatusHistory
from services.ai_service import AIService, CATEGORY_DEFAULT_DEPARTMENTS
from services.notification_service import NotificationService
from services.jwt_service import JWTService, jwt_required, role_required

issue_bp = Blueprint('issue', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def validate_coordinates(lat, lng):
    """Validate that lat/lng are within real-world geographic bounds."""
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        return None, None, 'Latitude and longitude must be numeric values'
    if not (-90 <= lat_f <= 90):
        return None, None, 'Latitude must be between -90 and 90'
    if not (-180 <= lng_f <= 180):
        return None, None, 'Longitude must be between -180 and 180'
    return lat_f, lng_f, None

@issue_bp.route('/')
def home():
    # Fetch public statistics
    total_issues = Issue.query.count()
    resolved_issues = Issue.query.filter_by(status='Resolved').count()
    in_progress = Issue.query.filter(Issue.status.in_(['In Progress', 'Assigned', 'Under Review'])).count()
    resolution_rate = round((resolved_issues / total_issues * 100), 1) if total_issues > 0 else 100.0

    # Recent resolved issues for community showcase
    recent_resolved = Issue.query.filter_by(status='Resolved')\
        .order_by(Issue.resolved_at.desc().nullslast(), Issue.updated_at.desc())\
        .limit(6)\
        .all()

    # Active complaints with coordinates for live GIS map
    map_issues = Issue.query.filter(Issue.latitude.isnot(None), Issue.longitude.isnot(None))\
        .order_by(Issue.created_at.desc())\
        .limit(100)\
        .all()

    return render_template('index.html',
                           total_issues=total_issues,
                           resolved_issues=resolved_issues,
                           in_progress=in_progress,
                           resolution_rate=resolution_rate,
                           recent_resolved=recent_resolved,
                           map_issues=[i.to_dict() for i in map_issues])

@issue_bp.route('/dashboard')
@login_required
def citizen_dashboard():
    if current_user.is_administrator:
        return redirect(url_for('admin.admin_dashboard'))

    # Fetch user's complaints
    user_issues = Issue.query.filter_by(user_id=current_user.id)\
        .order_by(Issue.created_at.desc())\
        .all()

    # Statistics for the citizen
    my_total = len(user_issues)
    my_resolved = sum(1 for i in user_issues if i.status == 'Resolved')
    my_pending = sum(1 for i in user_issues if i.status != 'Resolved' and i.status != 'Rejected')

    notifications = NotificationService.get_user_notifications(current_user.id)
    unread_count = NotificationService.get_unread_count(current_user.id)

    return render_template('dashboard.html',
                           user_issues=user_issues,
                           my_total=my_total,
                           my_resolved=my_resolved,
                           my_pending=my_pending,
                           notifications=notifications,
                           unread_count=unread_count)

@issue_bp.route('/report', methods=['GET', 'POST'])
@login_required
def report_issue():
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        manual_category = request.form.get('category', '').strip()
        location = request.form.get('location', '').strip()
        lat_str = request.form.get('latitude')
        lon_str = request.form.get('longitude')
        
        latitude = float(lat_str) if lat_str and lat_str.strip() else None
        longitude = float(lon_str) if lon_str and lon_str.strip() else None

        if not title or not description or not location:
            flash('Title, description, and location are required.', 'danger')
            return render_template('report_issue.html')

        # Handle Image Upload
        image_rel_path = None
        full_image_path = None
        file = request.files.get('image')
        if file and file.filename and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"issue_{uuid.uuid4().hex[:12]}_{int(datetime.utcnow().timestamp())}.{ext}"
            
            upload_dir = current_app.config['UPLOAD_FOLDER']
            os.makedirs(upload_dir, exist_ok=True)
            
            full_image_path = os.path.join(upload_dir, unique_filename)
            file.save(full_image_path)
            image_rel_path = f"uploads/{unique_filename}"

        # Run AI Classification Module
        ai_category, ai_confidence, ai_dept, detected_tags = AIService.classify_issue(
            title=title,
            description=description,
            image_path=full_image_path
        )

        final_category = manual_category if manual_category and manual_category != 'Auto-Detect' else ai_category
        
        # Check Duplicate
        all_active_issues = Issue.query.filter(Issue.status != 'Resolved').all()
        dup_check = AIService.check_duplicate(latitude, longitude, final_category, all_active_issues)
        
        is_duplicate = dup_check.get('duplicate_found', False)
        dup_parent_id = dup_check.get('original_issue_id') if is_duplicate else None

        # Predict Priority
        predicted_priority = AIService.predict_priority(
            title=title,
            description=description,
            category=final_category,
            is_duplicate=is_duplicate
        )

        # Calculate AI Priority Score
        ai_score = AIService.calculate_ai_priority_score(
            title=title,
            description=description,
            category=final_category,
            priority=predicted_priority,
            upvotes=1,
            is_duplicate=is_duplicate,
            age_hours=0,
            ai_confidence=ai_confidence
        )

        # Create Issue record
        new_issue = Issue(
            user_id=current_user.id,
            title=title,
            description=description,
            category=final_category,
            image_path=image_rel_path,
            location=location,
            latitude=latitude,
            longitude=longitude,
            status='Submitted',
            priority=predicted_priority,
            department=ai_dept,
            ai_confidence=ai_confidence,
            ai_detected_category=ai_category,
            ai_priority_score=ai_score,
            is_duplicate_of=dup_parent_id
        )

        db.session.add(new_issue)
        db.session.flush()

        # Add initial Status History entry
        initial_history = StatusHistory(
            issue_id=new_issue.issue_id,
            old_status=None,
            new_status='Submitted',
            updated_by=current_user.id,
            notes='Initial grievance logged by citizen.'
        )
        db.session.add(initial_history)
        db.session.commit()

        # Send confirmation notification
        NotificationService.send_notification(
            user_id=current_user.id,
            message=f"🎉 Complaint #{new_issue.issue_id} ('{new_issue.title}') has been registered and auto-assigned to {ai_dept}.",
            issue_id=new_issue.issue_id,
            notif_type='status_update'
        )

        if is_duplicate:
            flash(f"Notice: A similar issue (#{dup_parent_id}) was found nearby. Your report has been registered and upvoted the priority!", 'warning')
        else:
            flash(f"Complaint #{new_issue.issue_id} submitted successfully! AI identified as '{final_category}' ({predicted_priority} priority).", 'success')

        return redirect(url_for('issue.track_issue', issue_id=new_issue.issue_id))

    return render_template('report_issue.html')

@issue_bp.route('/track/<int:issue_id>')
def track_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    return render_template('track_issue.html', issue=issue)

@issue_bp.route('/issues')
def list_issues():
    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip()
    search = request.args.get('search', '').strip()

    query = Issue.query

    if category and category != 'All':
        query = query.filter_by(category=category)
    if status and status != 'All':
        query = query.filter_by(status=status)
    if search:
        query = query.filter(
            (Issue.title.ilike(f'%{search}%')) |
            (Issue.location.ilike(f'%{search}%')) |
            (Issue.description.ilike(f'%{search}%'))
        )

    issues = query.order_by(Issue.created_at.desc()).all()
    categories = ['Pothole', 'Garbage Dump', 'Water Leakage', 'Streetlight Failure', 'Drainage Blockage']
    statuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved']

    return render_template('issues_list.html',
                           issues=issues,
                           selected_category=category,
                           selected_status=status,
                           search=search,
                           categories=categories,
                           statuses=statuses)

# Live AI Pre-Scan API
@issue_bp.route('/api/ai/analyze', methods=['POST'])
def api_ai_analyze():
    title = request.form.get('title', '')
    description = request.form.get('description', '')
    
    temp_image_path = None
    file = request.files.get('image')
    
    if file and file.filename and allowed_file(file.filename):
        temp_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        temp_image_path = os.path.join(temp_dir, f"temp_{uuid.uuid4().hex[:8]}.jpg")
        file.save(temp_image_path)

    predicted_cat, confidence, dept, tags = AIService.classify_issue(
        title=title,
        description=description,
        image_path=temp_image_path
    )

    priority = AIService.predict_priority(title, description, predicted_cat)

    # Clean up temp file
    if temp_image_path and os.path.exists(temp_image_path):
        try:
            os.remove(temp_image_path)
        except Exception:
            pass

    return jsonify({
        'category': predicted_cat,
        'confidence': confidence,
        'confidence_percentage': int(confidence * 100),
        'suggested_department': dept,
        'predicted_priority': priority,
        'detected_tags': tags
    })

# REST Complaint APIs
@issue_bp.route('/api/issues', methods=['GET', 'POST'])
def api_issues():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        location = data.get('location', '').strip()
        category = data.get('category')
        address = data.get('address', '').strip() or None
        area = data.get('area', '').strip() or None
        city = data.get('city', '').strip() or None
        state = data.get('state', '').strip() or None
        lat_raw = data.get('latitude')
        lng_raw = data.get('longitude')
        # Determine user_id from JWT token, Flask-Login, or payload
        auth_header = request.headers.get('Authorization', '')
        jwt_user_id = None
        if auth_header:
            t = auth_header[7:].strip() if auth_header.startswith('Bearer ') else auth_header.strip()
            payload, _ = JWTService.decode_token(t)
            if payload:
                jwt_user_id = payload.get('sub')

        user_id = jwt_user_id or (current_user.id if current_user.is_authenticated else data.get('user_id', 2))

        if not title or not description or not (location or address):
            return jsonify({'error': 'Title, description, and location/address are required'}), 400

        # Fallback location string if location field is not separately supplied
        final_location = location or address or (f"{area}, {city}" if area and city else "City Ward")

        # Validate coordinates if provided
        latitude = longitude = None
        if lat_raw is not None and lng_raw is not None:
            latitude, longitude, coord_error = validate_coordinates(lat_raw, lng_raw)
            if coord_error:
                return jsonify({'error': coord_error}), 422

        # Handle uploaded image file if present in multipart request
        image_rel_path = data.get('image_path')
        full_image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"issue_{uuid.uuid4().hex[:12]}_{int(datetime.utcnow().timestamp())}.{ext}"
                upload_dir = current_app.config['UPLOAD_FOLDER']
                os.makedirs(upload_dir, exist_ok=True)
                full_image_path = os.path.join(upload_dir, unique_filename)
                file.save(full_image_path)
                image_rel_path = f"uploads/{unique_filename}"

        ai_category, ai_conf, ai_dept, _ = AIService.classify_issue(title, description, full_image_path)
        final_category = category if (category and category != 'Auto-Detect') else ai_category
        assigned_dept = CATEGORY_DEFAULT_DEPARTMENTS.get(final_category, ai_dept)
        priority = AIService.predict_priority(title, description, final_category)

        # Check Duplicate
        all_active_issues = Issue.query.filter(Issue.status != 'Resolved').all()
        dup_check = AIService.check_duplicate(latitude, longitude, final_category, all_active_issues)
        is_duplicate = dup_check.get('duplicate_found', False)
        dup_parent_id = dup_check.get('original_issue_id') if is_duplicate else None

        # Map priority to CRITICAL, HIGH, MEDIUM, LOW
        priority_level = 'CRITICAL' if priority == 'Urgent' or 'collapse' in (title + description).lower() or 'live wire' in (title + description).lower() or 'open manhole' in (title + description).lower() else priority.upper()
        if priority_level not in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            priority_level = 'MEDIUM'

        ai_score = AIService.calculate_ai_priority_score(
            title=title,
            description=description,
            category=final_category,
            priority=priority,
            upvotes=1,
            is_duplicate=is_duplicate,
            age_hours=0,
            ai_confidence=ai_conf
        )

        from datetime import timedelta
        sla_hours = 12 if priority_level == 'CRITICAL' else 24 if priority == 'Urgent' else 48 if priority_level == 'HIGH' else 72 if priority_level == 'MEDIUM' else 168
        resolution_deadline = datetime.utcnow() + timedelta(hours=sla_hours)

        issue = Issue(
            user_id=user_id,
            title=title,
            description=description,
            location=final_location,
            address=address,
            area=area,
            city=city,
            state=state,
            category=final_category,
            image_path=image_rel_path,
            ai_category=ai_category,
            ai_detected_category=ai_category,
            department=assigned_dept,
            recommended_department=ai_dept,
            assigned_department=assigned_dept,
            priority=priority,
            priority_level=priority_level,
            priority_score=ai_score,
            status='Submitted',
            latitude=latitude,
            longitude=longitude,
            ai_confidence=ai_conf,
            ai_priority_score=ai_score,
            is_duplicate_of=dup_parent_id,
            resolution_deadline=resolution_deadline
        )
        db.session.add(issue)
        db.session.flush()

        # Add initial status history
        history = StatusHistory(
            issue_id=issue.issue_id,
            old_status=None,
            new_status='Submitted',
            updated_by=user_id,
            notes=f"Grievance logged. AI auto-assigned to {ai_dept} ({priority_level} Priority)."
        )
        db.session.add(history)
        db.session.commit()

        # Notification dispatch
        NotificationService.send_notification(
            user_id=issue.user_id,
            message=f"🎉 Complaint #{issue.issue_id} ('{issue.title}') has been registered and auto-assigned to {ai_dept}.",
            issue_id=issue.issue_id,
            notif_type='status_update'
        )

        # Notify department admins
        NotificationService.notify_department_admins(
            department=ai_dept,
            message=f"📌 New Complaint #{issue.issue_id} ('{issue.title}') assigned to {ai_dept} at {final_location}.",
            issue_id=issue.issue_id,
            notif_type='admin_alert'
        )

        # Critical Incident Emergency Alert
        if priority_level == 'CRITICAL':
            NotificationService.notify_critical_incident(issue)
            print(f"[CRITICAL INCIDENT ALERT] Issue #{issue.issue_id} at {final_location} flagged as CRITICAL! Notifying {ai_dept} Admin & Municipal Commissioner.")

        return jsonify({
            'success': True,
            'message': 'Issue reported successfully',
            'potential_duplicate': is_duplicate,
            'duplicate_of_id': dup_parent_id,
            'issue': issue.to_dict(include_details=True)
        }), 201

    # ── GET all issues (paginated & filtered) ──────────────────────────────
    page        = request.args.get('page', 1, type=int)
    per_page    = min(request.args.get('per_page', 100, type=int), 200)
    status_f    = request.args.get('status', '').strip()
    category_f  = request.args.get('category', '').strip()
    dept_f      = request.args.get('department', '').strip()
    priority_f  = request.args.get('priority', '').strip()
    search_q    = request.args.get('search', '').strip()
    all_issues  = request.args.get('all', 'false').lower() == 'true'

    q = Issue.query
    if status_f and status_f != 'All':
        q = q.filter_by(status=status_f)
    if category_f and category_f != 'All':
        q = q.filter_by(category=category_f)
    if dept_f and dept_f != 'All':
        q = q.filter(Issue.department.ilike(f'%{dept_f}%'))
    if priority_f and priority_f != 'All':
        q = q.filter_by(priority=priority_f)
    if search_q:
        q = q.filter(
            (Issue.title.ilike(f'%{search_q}%')) |
            (Issue.location.ilike(f'%{search_q}%')) |
            (Issue.description.ilike(f'%{search_q}%'))
        )

    q = q.order_by(Issue.created_at.desc())

    if all_issues:
        issues_list = q.all()
        resp = jsonify([i.to_dict() for i in issues_list])
    else:
        paginated   = q.paginate(page=page, per_page=per_page, error_out=False)
        resp = jsonify({
            'issues':  [i.to_dict() for i in paginated.items],
            'total':   paginated.total,
            'page':    page,
            'pages':   paginated.pages,
            'per_page': per_page
        })

    resp.headers['Cache-Control'] = 'no-store'
    return resp


@issue_bp.route('/api/issues/map', methods=['GET'])
def api_issues_map():
    """
    Returns issues that have coordinates, optimised for map rendering.
    """
    status_filter   = request.args.get('status', '').strip()
    category_filter = request.args.get('category', '').strip()

    query = Issue.query.filter(
        Issue.latitude.isnot(None),
        Issue.longitude.isnot(None)
    )

    if status_filter and status_filter != 'All':
        query = query.filter_by(status=status_filter)
    if category_filter and category_filter != 'All':
        query = query.filter_by(category=category_filter)

    issues = query.order_by(Issue.created_at.desc()).limit(200).all()
    return jsonify([i.to_dict() for i in issues])


@issue_bp.route('/api/issues/<int:issue_id>', methods=['GET', 'PUT'])
def api_single_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    
    if request.method == 'PUT':
        data = request.get_json(silent=True) or request.form
        old_status = issue.status

        if 'status' in data and data['status'] != old_status:
            new_status = data['status']
            issue.status = new_status
            notes = data.get('notes') or data.get('resolution_notes') or f"Status changed from {old_status} to {new_status}"
            
            if new_status == 'Resolved':
                issue.resolved_at = datetime.utcnow()

            # Record in StatusHistory
            history = StatusHistory(
                issue_id=issue.issue_id,
                old_status=old_status,
                new_status=new_status,
                updated_by=current_user.id if current_user.is_authenticated else 1,
                notes=notes
            )
            db.session.add(history)

            # Send Notification
            NotificationService.notify_status_change(issue, old_status, new_status, notes)

        if 'priority' in data:
            issue.priority = data['priority']
        if 'department' in data:
            issue.department = data['department']
        if 'assigned_to' in data:
            issue.assigned_to = data['assigned_to']
        if 'resolution_notes' in data:
            issue.resolution_notes = data['resolution_notes']

        # Handle resolution image file upload if present
        if 'resolution_image' in request.files:
            res_file = request.files['resolution_image']
            if res_file and res_file.filename and allowed_file(res_file.filename):
                ext = res_file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"resolved_{issue_id}_{uuid.uuid4().hex[:8]}.{ext}"
                upload_dir = current_app.config['UPLOAD_FOLDER']
                os.makedirs(upload_dir, exist_ok=True)
                full_path = os.path.join(upload_dir, unique_filename)
                res_file.save(full_path)
                issue.resolution_image = f"uploads/{unique_filename}"
            
        db.session.commit()
        return jsonify({'message': 'Issue updated successfully', 'issue': issue.to_dict(include_details=True)})

    return jsonify(issue.to_dict(include_details=True))


@issue_bp.route('/api/issues/<int:issue_id>/details', methods=['GET'])
def api_issue_full_details(issue_id):
    """
    Dedicated endpoint returning comprehensive issue details, including
    status history, official admin bulletins, conversation chat messages,
    and SLA metrics.
    """
    issue = Issue.query.get_or_404(issue_id)
    return jsonify(issue.to_dict(include_details=True))


# ── Citizen-Admin Communication Messages (Chat / Ticketing) ──────────────────

@issue_bp.route('/api/issues/<int:issue_id>/messages', methods=['GET', 'POST'])
def api_issue_messages(issue_id):
    issue = Issue.query.get_or_404(issue_id)

    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        message_text = data.get('message', '').strip()
        sender_type = data.get('sender_type')
        sender_id = data.get('sender_id')

        if not message_text and 'image' not in request.files:
            return jsonify({'error': 'Message text or image is required'}), 400

        # Determine sender type and ID
        if current_user.is_authenticated:
            sender_id = current_user.id
            sender_type = 'Admin' if current_user.is_administrator else 'User'
        else:
            auth_header = request.headers.get('Authorization', '')
            jwt_uid = None
            jwt_role = None
            if auth_header:
                t = auth_header[7:].strip() if auth_header.startswith('Bearer ') else auth_header.strip()
                payload, _ = JWTService.decode_token(t)
                if payload:
                    jwt_uid = payload.get('sub')
                    jwt_role = payload.get('role')

            if jwt_uid and not sender_id:
                sender_id = jwt_uid
                if not sender_type:
                    sender_type = 'Admin' if jwt_role in ['admin', 'superadmin', 'officer'] else 'User'

            if not sender_type:
                sender_type = 'User'
            if not sender_id:
                sender_id = issue.user_id if sender_type == 'User' else 1

        # Handle optional attached image
        image_rel_path = None
        if 'image' in request.files:
            img_file = request.files['image']
            if img_file and img_file.filename and allowed_file(img_file.filename):
                ext = img_file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"chat_{issue_id}_{uuid.uuid4().hex[:8]}.{ext}"
                upload_dir = current_app.config['UPLOAD_FOLDER']
                os.makedirs(upload_dir, exist_ok=True)
                full_path = os.path.join(upload_dir, unique_filename)
                img_file.save(full_path)
                image_rel_path = f"uploads/{unique_filename}"

        msg = ComplaintMessage(
            issue_id=issue_id,
            sender_type=sender_type,
            sender_id=sender_id,
            message=message_text,
            image_path=image_rel_path
        )
        db.session.add(msg)
        db.session.commit()

        # Send notification to counterpart
        if sender_type == 'Admin':
            # Notify citizen
            NotificationService.send_notification(
                user_id=issue.user_id,
                message=f"💬 New message from Admin on Issue #{issue.issue_id}: '{message_text[:60]}...'",
                issue_id=issue.issue_id,
                notif_type='admin_reply'
            )
        else:
            # Notify admin
            admins = User.query.filter_by(role='admin').all()
            for admin_user in admins:
                NotificationService.send_notification(
                    user_id=admin_user.id,
                    message=f"💬 Citizen message on Issue #{issue.issue_id} ('{issue.title}'): '{message_text[:60]}...'",
                    issue_id=issue.issue_id,
                    notif_type='citizen_reply'
                )

        return jsonify({
            'success': True,
            'message': 'Message sent successfully',
            'chat_message': msg.to_dict()
        }), 201

    # GET messages
    messages = ComplaintMessage.query.filter_by(issue_id=issue_id).order_by(ComplaintMessage.created_at.asc()).all()
    return jsonify([m.to_dict() for m in messages])


# ── Official Admin Response / Bulletin Updates ───────────────────────────────

@issue_bp.route('/api/issues/<int:issue_id>/updates', methods=['GET', 'POST'])
def api_issue_updates(issue_id):
    issue = Issue.query.get_or_404(issue_id)

    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        message_text = data.get('message', '').strip()
        admin_id = current_user.id if current_user.is_authenticated else None
        if not admin_id:
            auth_header = request.headers.get('Authorization', '')
            if auth_header:
                t = auth_header[7:].strip() if auth_header.startswith('Bearer ') else auth_header.strip()
                payload, _ = JWTService.decode_token(t)
                if payload:
                    admin_id = payload.get('sub')
        if not admin_id:
            admin_id = data.get('admin_id', 1)

        if not message_text:
            return jsonify({'error': 'Update message cannot be empty'}), 400

        update_entry = ComplaintUpdate(
            issue_id=issue_id,
            admin_id=admin_id,
            message=message_text
        )
        db.session.add(update_entry)
        db.session.commit()

        # Notify the citizen reporter
        NotificationService.send_notification(
            user_id=issue.user_id,
            message=f"📢 Official Admin Update on Issue #{issue.issue_id}: '{message_text[:80]}...'",
            issue_id=issue.issue_id,
            notif_type='admin_update'
        )

        return jsonify({
            'message': 'Official update posted successfully',
            'update': update_entry.to_dict()
        }), 201

    # GET updates
    updates = ComplaintUpdate.query.filter_by(issue_id=issue_id).order_by(ComplaintUpdate.created_at.desc()).all()
    return jsonify([u.to_dict() for u in updates])


# ── Status History Audit Trail ───────────────────────────────────────────────

@issue_bp.route('/api/issues/<int:issue_id>/history', methods=['GET'])
def api_issue_history(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    history = StatusHistory.query.filter_by(issue_id=issue_id).order_by(StatusHistory.updated_at.asc()).all()
    return jsonify([h.to_dict() for h in history])


@issue_bp.route('/api/issues/<int:issue_id>/status', methods=['POST'])
def api_update_status(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    data = request.get_json(silent=True) or request.form
    new_status = data.get('status', '').strip()
    notes = data.get('notes', '').strip() or f"Status changed to {new_status}"
    updated_by = current_user.id if current_user.is_authenticated else data.get('user_id', 1)

    if not new_status:
        return jsonify({'error': 'Status is required'}), 400

    old_status = issue.status
    issue.status = new_status
    if new_status == 'Resolved':
        issue.resolved_at = datetime.utcnow()
        if 'resolution_notes' in data:
            issue.resolution_notes = data['resolution_notes']

    history = StatusHistory(
        issue_id=issue.issue_id,
        old_status=old_status,
        new_status=new_status,
        updated_by=updated_by,
        notes=notes
    )
    db.session.add(history)
    db.session.commit()

    NotificationService.notify_status_change(issue, old_status, new_status, notes)

    return jsonify({
        'message': f'Status updated to {new_status}',
        'issue': issue.to_dict(include_details=True)
    })


@issue_bp.route('/api/issues/<int:issue_id>/resolve', methods=['POST'])
def api_resolve_issue_json(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    data = request.get_json(silent=True) or request.form
    notes = data.get('resolution_notes') or data.get('notes') or 'Issue resolved by field squad.'
    updated_by = current_user.id if current_user.is_authenticated else data.get('user_id', 1)

    old_status = issue.status
    issue.status = 'Resolved'
    issue.resolved_at = datetime.utcnow()
    issue.resolution_notes = notes

    history = StatusHistory(
        issue_id=issue.issue_id,
        old_status=old_status,
        new_status='Resolved',
        updated_by=updated_by,
        notes=notes
    )
    db.session.add(history)
    db.session.commit()

    NotificationService.notify_status_change(issue, old_status, 'Resolved', notes)

    return jsonify({
        'message': 'Issue marked as resolved',
        'issue': issue.to_dict(include_details=True)
    })


@issue_bp.route('/api/issues/<int:issue_id>/upvote', methods=['POST'])
def api_upvote_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    issue.upvotes = (issue.upvotes or 1) + 1

    # If many citizens upvote, dynamically elevate priority
    if issue.upvotes >= 5 and issue.priority in ['Low', 'Medium']:
        issue.priority = 'High'
    elif issue.upvotes >= 10:
        issue.priority = 'Urgent'

    # Recalculate AI priority score after upvote
    age_h = issue.get_age_hours()
    issue.ai_priority_score = AIService.calculate_ai_priority_score(
        title=issue.title,
        description=issue.description,
        category=issue.category or 'Pothole',
        priority=issue.priority,
        upvotes=issue.upvotes,
        is_duplicate=bool(issue.is_duplicate_of),
        age_hours=age_h,
        ai_confidence=issue.ai_confidence
    )

    db.session.commit()
    return jsonify({
        'message': 'Issue upvoted',
        'upvotes': issue.upvotes,
        'priority': issue.priority,
        'ai_priority_score': issue.ai_priority_score
    })


# ── AI Intelligence Endpoints ────────────────────────────────────────────────

@issue_bp.route('/api/analytics/summary', methods=['GET'])
def api_analytics_summary():
    from datetime import timedelta
    from collections import defaultdict

    # ── Core KPI counts (single-pass via DB) ────────────────────────────────
    all_issues = Issue.query.all()
    total    = len(all_issues)
    resolved = sum(1 for i in all_issues if i.status == 'Resolved')
    active   = sum(1 for i in all_issues if i.status not in ('Resolved', 'Rejected'))
    pending  = sum(1 for i in all_issues if i.status in ('Submitted', 'Under Review'))
    today    = datetime.utcnow().date()
    this_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    today_count  = sum(1 for i in all_issues if i.created_at and i.created_at.date() == today)
    month_count  = sum(1 for i in all_issues if i.created_at and i.created_at >= this_month_start)
    critical = sum(1 for i in all_issues if i.priority in ('Urgent', 'High') or getattr(i, 'priority_level', '') == 'CRITICAL')

    # Average resolution time (hours)
    res_times = [i.age_hours for i in all_issues if i.status == 'Resolved' and i.age_hours]
    avg_res_time = round(sum(res_times) / len(res_times), 1) if res_times else 0

    # ── Category Distribution ────────────────────────────────────────────────
    cat_map = defaultdict(int)
    for i in all_issues:
        cat_map[i.category or 'Other'] += 1
    cat_distribution = dict(cat_map)

    # ── Department Distribution (resolved + active) ──────────────────────────
    dept_map = defaultdict(int)
    dept_resolved = defaultdict(int)
    dept_res_times = defaultdict(list)
    for i in all_issues:
        dept = i.department or i.assigned_department or 'General Administration'
        dept_map[dept] += 1
        if i.status == 'Resolved':
            dept_resolved[dept] += 1
            if i.age_hours:
                dept_res_times[dept].append(i.age_hours)
    dept_distribution = dict(dept_map)

    # Department performance scorecard
    dept_performance = []
    for dept, total_dept in dept_map.items():
        res = dept_resolved.get(dept, 0)
        times = dept_res_times.get(dept, [])
        dept_performance.append({
            'department': dept,
            'total': total_dept,
            'resolved': res,
            'resolution_rate': round(res / total_dept * 100, 1) if total_dept > 0 else 0,
            'avg_resolution_hours': round(sum(times) / len(times), 1) if times else None
        })
    dept_performance.sort(key=lambda x: x['resolution_rate'], reverse=True)

    # ── Priority Distribution ────────────────────────────────────────────────
    priority_map = defaultdict(int)
    for i in all_issues:
        priority_map[i.priority or 'Medium'] += 1

    # ── Monthly Trends (last 6 months) ───────────────────────────────────────
    monthly_trends = []
    for months_ago in range(5, -1, -1):
        target = (datetime.utcnow().replace(day=1) - timedelta(days=30 * months_ago))
        m_label = target.strftime('%b %Y')
        m_total = sum(
            1 for i in all_issues
            if i.created_at and i.created_at.year == target.year and i.created_at.month == target.month
        )
        m_resolved = sum(
            1 for i in all_issues
            if i.created_at and i.created_at.year == target.year and i.created_at.month == target.month
            and i.status == 'Resolved'
        )
        monthly_trends.append({'month': m_label, 'total': m_total, 'resolved': m_resolved})

    # ── Area / Ward Hotspots (top 8) ─────────────────────────────────────────
    area_map = defaultdict(int)
    for i in all_issues:
        area = (i.area or (i.location or '').split(',')[0] or 'City Center').strip()[:40]
        area_map[area] += 1
    area_hotspots = sorted(
        [{'area': k, 'count': v} for k, v in area_map.items()],
        key=lambda x: x['count'], reverse=True
    )[:8]

    # ── Status Distribution ──────────────────────────────────────────────────
    status_map = defaultdict(int)
    for i in all_issues:
        status_map[i.status or 'Submitted'] += 1

    resp = jsonify({
        'total':              total,
        'active':             active,
        'resolved':           resolved,
        'pending':            pending,
        'critical':           critical,
        'today_count':        today_count,
        'month_count':        month_count,
        'avg_resolution_hours': avg_res_time,
        'resolution_rate':    round(resolved / total * 100, 1) if total > 0 else 100.0,
        'category_distribution': cat_distribution,
        'department_distribution': dept_distribution,
        'department_performance':  dept_performance,
        'priority_distribution':   dict(priority_map),
        'status_distribution':     dict(status_map),
        'monthly_trends':          monthly_trends,
        'area_hotspots':           area_hotspots,
    })
    resp.headers['Cache-Control'] = 'no-store'
    return resp, 200


@issue_bp.route('/api/ai/insights', methods=['GET'])
def api_ai_insights():
    issues = Issue.query.order_by(Issue.created_at.desc()).all()
    insights = AIService.generate_ai_insights(issues)
    return jsonify(insights)


@issue_bp.route('/api/ai/reprioritize', methods=['POST'])
def api_ai_reprioritize():
    open_issues = Issue.query.filter(
        Issue.status.notin_(['Resolved', 'Rejected'])
    ).all()

    updates = AIService.batch_reprioritize(open_issues)
    db.session.commit()

    return jsonify({
        'message': f'Re-prioritized {len(updates)} open issues.',
        'updates': updates
    })


@issue_bp.route('/api/issues/escalation-queue', methods=['GET'])
def api_escalation_queue():
    active_issues = Issue.query.filter(
        Issue.status.notin_(['Resolved', 'Rejected'])
    ).all()

    queue = []
    for issue in active_issues:
        sla_info = AIService.predict_sla_breach(issue)
        if sla_info['progress_pct'] >= 75:
            d = issue.to_dict(include_details=True)
            d['sla_info'] = sla_info
            queue.append(d)

    queue.sort(key=lambda x: x.get('sla_progress_pct', 0), reverse=True)
    return jsonify(queue)


@issue_bp.route('/api/issues/<int:issue_id>/feedback', methods=['POST'])
def api_submit_feedback(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    data = request.get_json() or {}
    rating = data.get('rating')
    comment = data.get('comment', '').strip()

    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({'error': 'Feedback rating between 1 and 5 stars is required'}), 400

    issue.feedback_rating = int(rating)
    issue.feedback_comment = comment

    # Update timeline if present
    history = StatusHistory(
        issue_id=issue.issue_id,
        old_status=issue.status,
        new_status=issue.status,
        updated_by=issue.user_id,
        notes=f"Citizen Feedback Received: {rating}/5 Stars — '{comment}'"
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({
        'message': 'Feedback submitted successfully',
        'issue': issue.to_dict(include_details=True)
    }), 200


# ── Notification Endpoints ───────────────────────────────────────────────────

@issue_bp.route('/api/notifications', methods=['GET'])
@jwt_required(optional=True)
def api_notifications():
    user_id = None
    if current_user and current_user.is_authenticated:
        user_id = current_user.id
    elif getattr(request, 'jwt_user', None):
        user_id = request.jwt_user.get('sub')
    
    if not user_id:
        user_id = request.args.get('user_id', type=int)

    if user_id:
        notifications = NotificationService.get_user_notifications(user_id)
        unread_count = NotificationService.get_unread_count(user_id)
    else:
        notifications = []
        unread_count = 0

    return jsonify({
        'unread_count': unread_count,
        'notifications': [n.to_dict() for n in notifications]
    })


@issue_bp.route('/api/notifications/read-all', methods=['POST'])
@jwt_required(optional=True)
def api_read_notifications():
    user_id = None
    if current_user and current_user.is_authenticated:
        user_id = current_user.id
    elif getattr(request, 'jwt_user', None):
        user_id = request.jwt_user.get('sub')
    
    if not user_id:
        data = request.get_json(silent=True) or {}
        user_id = data.get('user_id') or request.args.get('user_id', type=int)

    if user_id:
        NotificationService.mark_all_as_read(user_id)

    return jsonify({'message': 'All notifications marked as read'})
