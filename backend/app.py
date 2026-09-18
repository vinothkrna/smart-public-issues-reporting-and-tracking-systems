import os
import sqlite3
from datetime import datetime
# pyrefly: ignore [missing-import]
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from flask_login import LoginManager, current_user
from config import Config
from models import db
from models.user import User
from models.issue import Issue
from models.notification import Notification
from routes import auth_bp, issue_bp, admin_bp
from services.notification_service import NotificationService

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable Cross-Origin Resource Sharing
    CORS(app)

    # Ensure upload directories exist safely
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'temp'), exist_ok=True)

    # Initialize extensions
    db.init_app(app)

    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'warning'
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return db.session.get(User, int(user_id))
        except Exception:
            return None

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(issue_bp)
    app.register_blueprint(admin_bp)

    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'civiccare-backend',
            'database': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        }), 200

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Resource not found', 'status': 404}), 404
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error occurred', 'status': 500}), 500
        return render_template('500.html'), 500

    @app.errorhandler(413)
    def file_too_large_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Uploaded file exceeds 16MB limit', 'status': 413}), 413
        return render_template('500.html', message='Uploaded file exceeds 16MB size limit.'), 413

    # Inject global variables into all templates
    @app.context_processor
    def inject_global_vars():
        unread_notifications = 0
        latest_notifications = []
        if current_user.is_authenticated:
            try:
                unread_notifications = NotificationService.get_unread_count(current_user.id)
                latest_notifications = NotificationService.get_user_notifications(current_user.id, limit=5)
            except Exception:
                pass
            
        return {
            'current_year': datetime.utcnow().year,
            'unread_notifications_count': unread_notifications,
            'header_notifications': latest_notifications
        }

    # Initialize database tables and seed if empty
    with app.app_context():
        db.create_all()
        _run_migrations(app)
        try:
            from seed_data import seed_database
            seed_database()
        except Exception as e:
            print(f"[SEED] Note: {e}")

    return app


def _run_migrations(app):
    """Safely apply incremental DB migrations for SQLite."""
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if not db_uri.startswith('sqlite:///'):
        return  # Skip for non-SQLite (MySQL/Postgres use Alembic)

    db_path = db_uri.replace('sqlite:///', '')
    if not os.path.exists(db_path):
        return  # Fresh DB — create_all already built the schema

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(issues)")
        existing_cols = {row[1] for row in cursor.fetchall()}

        migrations = [
            ("address", "ALTER TABLE issues ADD COLUMN address VARCHAR(500)"),
            ("area", "ALTER TABLE issues ADD COLUMN area VARCHAR(150)"),
            ("city", "ALTER TABLE issues ADD COLUMN city VARCHAR(150)"),
            ("state", "ALTER TABLE issues ADD COLUMN state VARCHAR(150)"),
            ("ai_priority_score", "ALTER TABLE issues ADD COLUMN ai_priority_score FLOAT"),
            ("ai_category", "ALTER TABLE issues ADD COLUMN ai_category VARCHAR(50)"),
            ("priority_level", "ALTER TABLE issues ADD COLUMN priority_level VARCHAR(20) DEFAULT 'MEDIUM'"),
            ("priority_score", "ALTER TABLE issues ADD COLUMN priority_score FLOAT"),
            ("recommended_department", "ALTER TABLE issues ADD COLUMN recommended_department VARCHAR(100)"),
            ("assigned_department", "ALTER TABLE issues ADD COLUMN assigned_department VARCHAR(100)"),
            ("assigned_admin", "ALTER TABLE issues ADD COLUMN assigned_admin VARCHAR(100)"),
            ("resolution_deadline", "ALTER TABLE issues ADD COLUMN resolution_deadline DATETIME"),
            ("feedback_rating", "ALTER TABLE issues ADD COLUMN feedback_rating INTEGER"),
            ("feedback_comment", "ALTER TABLE issues ADD COLUMN feedback_comment TEXT"),
        ]
        for col, sql in migrations:
            if col not in existing_cols:
                cursor.execute(sql)
                print(f"[MIGRATION] Added column '{col}' to issues table.")

        cursor.execute("PRAGMA table_info(users)")
        user_cols = {row[1] for row in cursor.fetchall()}
        user_migrations = [
            ("status", "ALTER TABLE users ADD COLUMN status VARCHAR(25) DEFAULT 'active'"),
            ("is_verified", "ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1"),
            ("avatar_url", "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)"),
            ("last_login", "ALTER TABLE users ADD COLUMN last_login DATETIME")
        ]
        for col, sql in user_migrations:
            if col not in user_cols:
                cursor.execute(sql)
                print(f"[MIGRATION] Added column '{col}' to users table.")

        conn.commit()
        conn.close()
    except Exception as exc:
        print(f"[MIGRATION] Warning: {exc}")

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("=" * 65)
    print("[SMART CITY] Smart Public Issue Reporting and Tracking System")
    print(f"[SERVER] Running on http://127.0.0.1:{port}")
    print("[AUTH] Admin Demo Login: admin@smartcity.gov / admin123")
    print("[AUTH] Citizen Demo Login: vinoth@gmail.com / 123456")
    print("=" * 65)
    app.run(host='0.0.0.0', port=port, debug=True)
