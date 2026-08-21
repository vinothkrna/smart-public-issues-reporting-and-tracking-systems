# Routes module initialization
from .auth import auth_bp
from .issue_routes import issue_bp
from .admin_routes import admin_bp

__all__ = ['auth_bp', 'issue_bp', 'admin_bp']
