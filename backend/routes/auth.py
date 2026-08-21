import re
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import db
from models.user import User
from models.email_verification import EmailVerification
from models.password_reset import PasswordReset
from models.department import Department
from models.audit_log import AuditLog
from services.jwt_service import JWTService, jwt_required, role_required

auth_bp = Blueprint('auth', __name__)

# ── LOGIN RATE LIMITER (in-memory) ──────────────────────────────────────
_login_attempts = {}
_MAX_ATTEMPTS = 5
_LOCKOUT_SECONDS = 300  # 5 minutes

def _check_rate_limit(email):
    """Returns (is_blocked, remaining_seconds). Clears stale locks automatically."""
    record = _login_attempts.get(email)
    if not record:
        return False, 0
    if record.get('locked_until'):
        remaining = (record['locked_until'] - datetime.utcnow()).total_seconds()
        if remaining > 0:
            return True, int(remaining)
        _login_attempts.pop(email, None)
        return False, 0
    return False, 0

def _record_failed_attempt(email):
    record = _login_attempts.setdefault(email, {'count': 0, 'locked_until': None})
    record['count'] += 1
    if record['count'] >= _MAX_ATTEMPTS:
        record['locked_until'] = datetime.utcnow() + timedelta(seconds=_LOCKOUT_SECONDS)

def _clear_attempts(email):
    _login_attempts.pop(email, None)


# ── DEPARTMENT REGISTRY ─────────────────────────────────────────────────
DEPARTMENTS = [
    {
        'id': 'roads_highways',
        'name': 'Roads & Highways Department',
        'icon': 'construction',
        'description': 'Manage road maintenance, potholes, and transportation infrastructure complaints.',
        'color': '#e67e22'
    },
    {
        'id': 'sanitation',
        'name': 'Sanitation Department',
        'icon': 'trash-2',
        'description': 'Oversee waste collection, garbage disposal, and public cleanliness operations.',
        'color': '#27ae60'
    },
    {
        'id': 'water_supply',
        'name': 'Water Supply Department',
        'icon': 'droplets',
        'description': 'Handle water distribution, pipeline maintenance, and supply quality issues.',
        'color': '#3498db'
    },
    {
        'id': 'electricity',
        'name': 'Electricity Department',
        'icon': 'zap',
        'description': 'Address streetlight failures, power outages, and electrical hazard complaints.',
        'color': '#f39c12'
    },
    {
        'id': 'drainage_sewer',
        'name': 'Drainage & Sewer Department',
        'icon': 'waves',
        'description': 'Manage stormwater drains, sewer lines, and flood prevention infrastructure.',
        'color': '#8e44ad'
    },
    {
        'id': 'public_health',
        'name': 'Public Health Department',
        'icon': 'heart-pulse',
        'description': 'Monitor public health hazards, mosquito breeding, and sanitation-related health risks.',
        'color': '#e74c3c'
    },
    {
        'id': 'municipal_commissioner',
        'name': 'Municipal Commissioner',
        'icon': 'landmark',
        'description': 'Central monitoring and oversight of all municipal departments and escalated complaints.',
        'color': '#2c3e50'
    },
    {
        'id': 'super_admin',
        'name': 'Super Admin',
        'icon': 'shield-check',
        'description': 'Full system administration with access to all departments, users, and platform settings.',
        'color': '#1a1a2e'
    },
]

# Validation Helpers
EMAIL_REGEX = r'^[\w\.-]+@[\w\.-]+\.\w+$'
PHONE_REGEX = r'^\+?[0-9\s-]{7,15}$'


# ── REST API ENDPOINTS ──────────────────────────────────────────────────

@auth_bp.route('/api/auth/departments', methods=['GET'])
def api_get_departments():
    """Return list of departments available for admin login and routing."""
    return jsonify({'departments': DEPARTMENTS}), 200


@auth_bp.route('/api/auth/register', methods=['POST'])
def api_auth_register():
    """
    Citizen Registration Endpoint.
    Validates input, checks duplicates, creates pending citizen account,
    and returns 6-digit email verification token + demo OTP.
    """
    data = request.get_json(silent=True) or request.form or {}
    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    phone = str(data.get('phone', '')).strip()
    password = str(data.get('password', ''))
    confirm_password = str(data.get('confirm_password', data.get('confirmPassword', '')))

    # 1. Validation
    if not name:
        return jsonify({'error': 'Full name is required.'}), 400
    if len(name) < 2:
        return jsonify({'error': 'Full name must be at least 2 characters.'}), 400

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({'error': 'A valid email address is required.'}), 400

    if phone and not re.match(PHONE_REGEX, phone):
        return jsonify({'error': 'Please provide a valid phone number.'}), 400

    if not password:
        return jsonify({'error': 'Password is required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    if confirm_password and password != confirm_password:
        return jsonify({'error': 'Passwords do not match. Please re-enter your password.'}), 400

    # 2. Duplicate Check
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        if existing_user.status == 'pending_verification' or not existing_user.is_verified:
            # Re-issue verification OTP for unactivated account
            verif = EmailVerification.create_verification_for_user(existing_user.id, email)
            return jsonify({
                'message': f'Verification OTP re-sent to {email}',
                'token': verif.token,
                'demo_otp': verif.otp,
                'email': email,
                'is_pending_activation': True,
                'user': existing_user.to_dict()
            }), 200
        return jsonify({'error': 'An account with this email address already exists. Please log in.'}), 409

    # 3. Create Pending User
    role = str(data.get('role', 'citizen')).strip().lower()
    department = str(data.get('department', '')).strip()
    if role == 'admin' and not department:
        department = 'Roads & Highways Department'

    user = User(
        name=name,
        email=email,
        phone=phone or None,
        role='admin' if role == 'admin' else 'citizen',
        department=department if role == 'admin' else None,
        status='pending_verification',
        is_verified=False
    )
    user.set_password(password)

    db.session.add(user)
    db.session.flush()

    # 4. Generate Verification OTP (expires in 24 hours)
    verification = EmailVerification.create_verification_for_user(user.id, email)

    # 5. Audit Log
    try:
        log = AuditLog(
            user_id=user.id,
            action='USER_REGISTER_INITIATED',
            entity_type='User',
            entity_id=user.id,
            ip_address=request.remote_addr,
            details=f"Citizen registration initiated for {name} ({email})"
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        db.session.commit()

    print(f"[AUTH VERIFY EMAIL] Verification OTP for {user.email}: {verification.otp} (Token: {verification.token})")

    return jsonify({
        'success': True,
        'message': f'Verification code sent to {email}. Please enter the 6-digit code to activate your account.',
        'token': verification.token,
        'demo_otp': verification.otp,
        'email': email,
        'user': user.to_dict()
    }), 201


@auth_bp.route('/api/auth/verify-email', methods=['POST'])
def api_auth_verify_email():
    """
    Email Verification & Account Activation.
    Accepts token & 6-digit OTP, activates user account, and issues signed JWT.
    """
    data = request.get_json(silent=True) or {}
    token = str(data.get('token', '')).strip()
    otp = str(data.get('otp', '')).strip()
    email = str(data.get('email', '')).strip().lower()

    if not otp:
        return jsonify({'error': '6-digit verification OTP code is required.'}), 400

    query = EmailVerification.query.filter_by(otp=otp)
    if token:
        query = query.filter_by(token=token)
    elif email:
        query = query.filter_by(email=email)

    verif_record = query.order_by(EmailVerification.created_at.desc()).first()

    if not verif_record:
        return jsonify({'error': 'Invalid verification code. Please check and try again.'}), 400

    if not verif_record.is_valid():
        return jsonify({'error': 'Verification code has expired or was already used. Please request a new code.'}), 410

    user = db.session.get(User, verif_record.user_id)
    if not user:
        return jsonify({'error': 'User associated with verification token not found.'}), 404

    # Activate Account
    user.status = 'active'
    user.is_verified = True
    user.last_login = datetime.utcnow()
    verif_record.is_used = True

    try:
        log = AuditLog(
            user_id=user.id,
            action='USER_ACCOUNT_ACTIVATED',
            entity_type='User',
            entity_id=user.id,
            ip_address=request.remote_addr,
            details=f"Citizen account {user.email} successfully activated via email OTP."
        )
        db.session.add(log)
    except Exception:
        pass

    db.session.commit()

    # Generate JWT Token
    jwt_token = JWTService.generate_token(user)

    return jsonify({
        'success': True,
        'message': 'Account verified and activated successfully! Welcome to CivicTrack.',
        'token': jwt_token,
        'user': user.to_dict(),
        'verified': True
    }), 200


@auth_bp.route('/api/auth/resend-verification', methods=['POST'])
def api_auth_resend_verification():
    """Resend email verification OTP."""
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    token = str(data.get('token', '')).strip()

    user = None
    if email:
        user = User.query.filter_by(email=email).first()
    elif token:
        old_verif = EmailVerification.query.filter_by(token=token).first()
        if old_verif:
            user = db.session.get(User, old_verif.user_id)

    if not user:
        return jsonify({'error': 'No account found matching this email or session.'}), 404

    if user.is_verified and user.status == 'active':
        return jsonify({'message': 'Account is already verified. Please sign in.', 'already_verified': True}), 200

    new_verif = EmailVerification.create_verification_for_user(user.id, user.email)
    print(f"[AUTH RE-SEND OTP] New verification OTP for {user.email}: {new_verif.otp}")

    return jsonify({
        'message': f'New 6-digit verification code sent to {user.email}',
        'token': new_verif.token,
        'demo_otp': new_verif.otp,
        'email': user.email
    }), 200


@auth_bp.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    """
    Login endpoint supporting Citizen Login and Department Admin Login with explicit role verification.
    """
    data = request.get_json(silent=True) or request.form or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    department = str(data.get('department', '')).strip()
    expected_role = str(data.get('role', data.get('expected_role', ''))).strip().lower()

    if not email or not password:
        return jsonify({'error': 'Email address and password are required.'}), 400

    # ── Rate-limit check ──
    is_blocked, remaining = _check_rate_limit(email)
    if is_blocked:
        minutes = remaining // 60
        seconds = remaining % 60
        return jsonify({
            'error': f'Too many failed login attempts. Please try again in {minutes}m {seconds}s.',
            'locked': True,
            'retry_after': remaining
        }), 429

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        _record_failed_attempt(email)
        attempts_left = _MAX_ATTEMPTS - _login_attempts.get(email, {}).get('count', 0)
        error_msg = 'Invalid email address or password.'
        if 0 < attempts_left <= 2:
            error_msg += f' {attempts_left} attempt(s) remaining before temporary lockout.'
        return jsonify({'error': error_msg}), 401

    # ── Status Check ──
    if user.status == 'blocked':
        return jsonify({'error': 'This account has been suspended by administration. Contact municipal support.'}), 403

    if user.status == 'pending_verification' or not user.is_verified:
        # Generate new verification code for unactivated citizen
        verif = EmailVerification.create_verification_for_user(user.id, user.email)
        return jsonify({
            'error': 'Your email address has not been verified yet. Please complete verification.',
            'code': 'PENDING_VERIFICATION',
            'token': verif.token,
            'demo_otp': verif.otp,
            'email': user.email
        }), 403

    user_is_admin = user.role in ('admin', 'superadmin', 'officer')

    # ── Strict Role Verification Before Allowing Login ──
    if expected_role == 'citizen':
        if user_is_admin:
            return jsonify({
                'error': 'This account is registered as a Municipal Administrator / Officer. Please switch to the "Admin Login" tab to access your Admin Command Center.',
                'code': 'ROLE_MISMATCH_ADMIN',
                'account_role': user.role,
                'target_tab': 'admin'
            }), 403
    elif expected_role == 'admin':
        if not user_is_admin:
            return jsonify({
                'error': 'Access Denied: This account is registered as a Citizen and does not have administrative privileges. Please switch to the "Citizen Login" tab to access your Citizen Dashboard.',
                'code': 'ROLE_MISMATCH_CITIZEN',
                'account_role': user.role,
                'target_tab': 'citizen'
            }), 403
        if not department:
            return jsonify({'error': 'Please select your municipal department before signing in as Administrator.'}), 400

    # ── Department validation for Admin login ──
    if user_is_admin:
        if department:
            user_dept = (user.department or '').strip().lower()
            req_dept = department.strip().lower()
            # Super Admin & Municipal Commissioner can log into any department view
            if user_dept not in ('super admin', 'municipal administration', 'municipal commissioner') and user.role != 'superadmin':
                dept_short = user_dept.split(' ')[0]
                if dept_short not in req_dept and req_dept not in user_dept:
                    return jsonify({
                        'error': f'Department authorization failed. Your administrative account is assigned to "{user.department}", not "{department}".',
                        'code': 'DEPT_MISMATCH'
                    }), 403

    # Clear rate limit upon success
    _clear_attempts(email)

    user.last_login = datetime.utcnow()
    db.session.commit()

    # Flask-Login session
    login_user(user)

    # JWT Token
    jwt_token = JWTService.generate_token(user)

    # Audit Log
    try:
        log = AuditLog(
            user_id=user.id,
            action='USER_LOGIN_SUCCESS',
            entity_type='User',
            entity_id=user.id,
            ip_address=request.remote_addr,
            details=f"Successful login for {user.name} ({user.role}) via {expected_role or 'standard'} portal"
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        pass

    return jsonify({
        'message': f'Welcome back, {user.name}!',
        'token': jwt_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/api/auth/google', methods=['POST'])
def api_auth_google():
    """
    Continue with Google authentication for Citizens and Administrators.
    Performs role verification and provisions accounts seamlessly.
    """
    data = request.get_json(silent=True) or request.form or {}
    email = str(data.get('email', '')).strip().lower()
    name = str(data.get('name', '')).strip()
    avatar_url = str(data.get('avatar_url', '')).strip() or None
    department = str(data.get('department', '')).strip()
    expected_role = str(data.get('role', data.get('expected_role', 'citizen'))).strip().lower()

    if not email:
        return jsonify({'error': 'Google account email is required.'}), 400

    if not name:
        name = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()

    user = User.query.filter_by(email=email).first()

    if user:
        # Existing user check
        if user.status == 'blocked':
            return jsonify({'error': 'This Google account has been suspended by administration. Contact municipal support.'}), 403

        user_is_admin = user.role in ('admin', 'superadmin', 'officer')

        # Strict Role Verification
        if expected_role == 'citizen':
            if user_is_admin:
                return jsonify({
                    'error': 'This Google account is registered as a Municipal Administrator / Officer. Please switch to the "Admin Login" tab to access your Admin Command Center.',
                    'code': 'ROLE_MISMATCH_ADMIN',
                    'account_role': user.role,
                    'target_tab': 'admin'
                }), 403
        elif expected_role == 'admin':
            if not user_is_admin:
                return jsonify({
                    'error': 'Access Denied: This Google account is registered as a Citizen and lacks administrator privileges. Please switch to the "Citizen Login" tab to access your Citizen Dashboard.',
                    'code': 'ROLE_MISMATCH_CITIZEN',
                    'account_role': user.role,
                    'target_tab': 'citizen'
                }), 403
            if not department and not user.department:
                return jsonify({'error': 'Please select your municipal department before signing in as Administrator.'}), 400

            # Department validation if specific department selected
            if department and user.department:
                user_dept = user.department.strip().lower()
                req_dept = department.strip().lower()
                if user_dept not in ('super admin', 'municipal administration', 'municipal commissioner') and user.role != 'superadmin':
                    dept_short = user_dept.split(' ')[0]
                    if dept_short not in req_dept and req_dept not in user_dept:
                        return jsonify({
                            'error': f'Department authorization failed. Your administrative account is assigned to "{user.department}", not "{department}".',
                            'code': 'DEPT_MISMATCH'
                        }), 403

        # Update profile if needed
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        user.is_verified = True
        user.last_login = datetime.utcnow()
        db.session.commit()
    else:
        # New user registration via Google
        if expected_role == 'admin':
            if not department:
                return jsonify({'error': 'Please select your municipal department to register as an Administrator via Google.'}), 400
            user = User(
                name=name,
                email=email,
                role='admin',
                department=department,
                is_verified=True,
                status='active',
                avatar_url=avatar_url
            )
        else:
            user = User(
                name=name,
                email=email,
                role='citizen',
                department=None,
                is_verified=True,
                status='active',
                avatar_url=avatar_url
            )

        # Set a secure randomized internal password
        user.set_password(uuid.uuid4().hex)
        db.session.add(user)
        db.session.commit()

    # Log in session and generate JWT token
    login_user(user)
    jwt_token = JWTService.generate_token(user)

    # Audit Log
    try:
        log = AuditLog(
            user_id=user.id,
            action='GOOGLE_LOGIN_SUCCESS',
            entity_type='User',
            entity_id=user.id,
            ip_address=request.remote_addr,
            details=f"Google OAuth sign in for {user.name} ({user.email}) as {user.role}"
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        pass

    return jsonify({
        'message': f'Welcome to CivicTrack, {user.name}!',
        'token': jwt_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/api/auth/forgot-password', methods=['POST'])
def api_forgot_password():
    """Initiates 3-step password recovery by sending 6-digit OTP."""
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()

    if not email:
        return jsonify({'error': 'Please enter your registered email address.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'No account found with this email address.'}), 404

    reset_record = PasswordReset.create_otp_for_user(user.id)
    print(f"[AUTH RESET OTP] Password reset OTP for {user.email}: {reset_record.otp} (Token: {reset_record.token})")

    return jsonify({
        'message': f'Verification OTP sent to {email}',
        'token': reset_record.token,
        'demo_otp': reset_record.otp,
        'email': email
    }), 200


@auth_bp.route('/api/auth/verify-otp', methods=['POST'])
def api_verify_otp():
    """Step 2: Verifies password reset OTP."""
    data = request.get_json(silent=True) or {}
    token = str(data.get('token', '')).strip()
    otp = str(data.get('otp', '')).strip()

    if not token or not otp:
        return jsonify({'error': 'Session token and 6-digit OTP are required.'}), 400

    reset_record = PasswordReset.query.filter_by(token=token, otp=otp).first()
    if not reset_record:
        return jsonify({'error': 'Invalid OTP code. Please check and try again.'}), 400

    if not reset_record.is_valid():
        return jsonify({'error': 'OTP has expired or already been used. Please request a new OTP.'}), 410

    return jsonify({
        'message': 'OTP verified successfully.',
        'token': token,
        'verified': True
    }), 200


@auth_bp.route('/api/auth/reset-password', methods=['POST'])
def api_reset_password():
    """Step 3: Resets password with verified token."""
    data = request.get_json(silent=True) or {}
    token = str(data.get('token', '')).strip()
    new_password = str(data.get('new_password', data.get('password', ''))).strip()

    if not token or not new_password:
        return jsonify({'error': 'Reset token and new password are required.'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long.'}), 400

    reset_record = PasswordReset.query.filter_by(token=token).first()
    if not reset_record or not reset_record.is_valid():
        return jsonify({'error': 'Invalid or expired password reset session. Please restart.'}), 400

    user = db.session.get(User, reset_record.user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    user.set_password(new_password)
    reset_record.is_used = True
    db.session.commit()

    return jsonify({
        'message': 'Password has been reset successfully! You can now sign in with your new password.'
    }), 200


@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required(optional=True)
def api_auth_me():
    """Returns profile info for current authenticated user via JWT or Flask session."""
    user = None
    if hasattr(request, 'jwt_user') and request.jwt_user:
        user = db.session.get(User, request.jwt_user.get('sub'))
    elif current_user.is_authenticated:
        user = current_user

    if user:
        return jsonify({'user': user.to_dict()}), 200
    return jsonify({'error': 'Not authenticated', 'code': 'UNAUTHORIZED'}), 401


# ── ADMIN USER MANAGEMENT ENDPOINTS ────────────────────────────────────

@auth_bp.route('/api/admin/users', methods=['GET'])
def api_admin_get_users():
    """List all registered users for administration dashboard."""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@auth_bp.route('/api/admin/users/<int:user_id>/toggle-status', methods=['POST'])
def api_admin_toggle_user_status(user_id):
    """Admin block/unblock action for citizen accounts."""
    user = User.query.get_or_404(user_id)
    if user.role in ('admin', 'superadmin'):
        return jsonify({'error': 'Administrator accounts cannot be suspended.'}), 403

    current_st = getattr(user, 'status', 'active')
    user.status = 'blocked' if current_st == 'active' else 'active'
    db.session.commit()

    return jsonify({
        'message': f"User account for {user.name} is now {user.status.upper()}.",
        'user': user.to_dict()
    }), 200


# ── WEB ROUTES FOR JINJA FALLBACK ──────────────────────────────────────

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin.admin_dashboard') if current_user.is_administrator else url_for('issue.citizen_dashboard'))
    return render_template('login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('admin.admin_dashboard') if current_user.is_administrator else url_for('issue.citizen_dashboard'))
    return render_template('register.html')

@auth_bp.route('/logout')
def logout():
    if current_user.is_authenticated:
        logout_user()
    return redirect(url_for('issue.home'))
