import hmac
import hashlib
import base64
import json
import time
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app

SECRET_DEFAULT = 'smart-city-civic-track-jwt-secret-2026'

def _b64_encode(data_bytes):
    return base64.urlsafe_b64encode(data_bytes).rstrip(b'=').decode('utf-8')

def _b64_decode(data_str):
    padding = 4 - (len(data_str) % 4)
    if padding < 4:
        data_str += '=' * padding
    return base64.urlsafe_b64decode(data_str)

class JWTService:
    @staticmethod
    def get_secret():
        try:
            return current_app.config.get('SECRET_KEY', SECRET_DEFAULT).encode('utf-8')
        except Exception:
            return SECRET_DEFAULT.encode('utf-8')

    @classmethod
    def generate_token(cls, user, expires_in_seconds=86400 * 7):
        """
        Generates a standard HMAC-SHA256 signed JWT token for a user.
        Default expiry: 7 days.
        """
        header = {
            "alg": "HS256",
            "typ": "JWT"
        }
        payload = {
            "sub": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "department": getattr(user, 'department', None),
            "iat": int(time.time()),
            "exp": int(time.time()) + expires_in_seconds
        }

        header_b64 = _b64_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
        payload_b64 = _b64_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))

        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        signature = hmac.new(cls.get_secret(), signing_input, hashlib.sha256).digest()
        signature_b64 = _b64_encode(signature)

        return f"{header_b64}.{payload_b64}.{signature_b64}"

    @classmethod
    def decode_token(cls, token_str):
        """
        Validates the signature and expiry of a JWT token string.
        Returns: (payload_dict, error_string)
        """
        if not token_str or not isinstance(token_str, str):
            return None, "Missing or invalid token"

        parts = token_str.split('.')
        if len(parts) != 3:
            return None, "Malformed JWT token structure"

        header_b64, payload_b64, signature_b64 = parts

        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(cls.get_secret(), signing_input, hashlib.sha256).digest()
        expected_sig_b64 = _b64_encode(expected_sig)

        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None, "Invalid token signature"

        # Decode payload
        try:
            payload_json = _b64_decode(payload_b64).decode('utf-8')
            payload = json.loads(payload_json)
        except Exception:
            return None, "Failed to decode token payload"

        # Check expiration
        exp = payload.get('exp')
        if exp and int(time.time()) > exp:
            return None, "Token has expired. Please sign in again."

        return payload, None


def jwt_required(optional=False):
    """
    Decorator for protecting API routes with JWT verification.
    Sets `request.jwt_user` with payload.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization', '')
            token = None
            if auth_header.startswith('Bearer '):
                token = auth_header[7:].strip()
            elif auth_header:
                token = auth_header.strip()

            if not token:
                if optional:
                    request.jwt_user = None
                    return f(*args, **kwargs)
                return jsonify({'error': 'Authentication required. Missing Bearer token.', 'code': 'AUTH_REQUIRED'}), 401

            payload, err = JWTService.decode_token(token)
            if err or not payload:
                if optional:
                    request.jwt_user = None
                    return f(*args, **kwargs)
                return jsonify({'error': err or 'Invalid authentication token', 'code': 'INVALID_TOKEN'}), 401

            request.jwt_user = payload
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def role_required(*allowed_roles):
    """
    Decorator for Role-Based Access Control on JWT endpoints.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization', '')
            token = auth_header[7:].strip() if auth_header.startswith('Bearer ') else auth_header.strip()
            if not token:
                return jsonify({'error': 'Authorization token required', 'code': 'AUTH_REQUIRED'}), 401

            payload, err = JWTService.decode_token(token)
            if err or not payload:
                return jsonify({'error': err or 'Invalid token', 'code': 'INVALID_TOKEN'}), 401

            user_role = payload.get('role', 'citizen')
            if user_role not in allowed_roles and 'superadmin' not in allowed_roles:
                return jsonify({
                    'error': f"Access denied. Role '{user_role}' is not authorized for this action.",
                    'code': 'FORBIDDEN'
                }), 403

            request.jwt_user = payload
            return f(*args, **kwargs)
        return decorated_function
    return decorator
