from pathlib import Path

from flask import Flask, send_from_directory
from flask_cors import CORS

from .api.admin import admin_bp
from .api.auth import auth_bp
from .api.student import student_bp
from .api.teacher import teacher_bp
from .core.config import Config
from .core.db import db
from .core.runtime_schema import ensure_runtime_schema
from .seed.bootstrap import seed_all

SPRITE_DIR = Path(__file__).resolve().parent.parent / "sprite"


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    if app.config["IS_PRODUCTION"] and app.config["SECRET_KEY"] in {
        "dev-secret-key",
        "super-secret-key-change-me",
    }:
        raise RuntimeError("Set a strong SECRET_KEY before running in production mode.")
    if app.config["IS_PRODUCTION"] and not app.config.get("SESSION_COOKIE_SECURE", True):
        raise RuntimeError("SESSION_COOKIE_SECURE must stay enabled in production mode.")
    if app.config["IS_PRODUCTION"] and not app.config.get("GIGACHAT_VERIFY_SSL", True):
        raise RuntimeError("GIGACHAT_VERIFY_SSL cannot be disabled in production mode.")
    if app.config["IS_PRODUCTION"] and app.config.get("SUPERADMIN_BOOTSTRAP"):
        from .core.security import ADMIN_PASSWORD_MIN_LENGTH, validate_password

        superadmin_email = (app.config.get("SUPERADMIN_EMAIL") or "").strip().lower()
        superadmin_password = app.config.get("SUPERADMIN_PASSWORD") or ""
        if not superadmin_email or not superadmin_password:
            raise RuntimeError(
                "SUPERADMIN_BOOTSTRAP requires explicit SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in production mode."
            )
        password_error = validate_password(
            superadmin_password,
            minimum_length=ADMIN_PASSWORD_MIN_LENGTH,
        )
        if password_error:
            raise RuntimeError(f"SUPERADMIN_PASSWORD is not secure enough: {password_error}")

    allowed_origins = [
        origin.strip()
        for origin in app.config["CLIENT_URL"].split(",")
        if origin.strip()
    ]
    if not allowed_origins:
        allowed_origins = [
            "https://push-ltnrmytaq-xcvbnm2003fgha-6604s-projects.vercel.app"
        ]
    db.init_app(app)
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
    )

    with app.app_context():
        from . import models  # noqa: F401

        db.create_all()
        ensure_runtime_schema()
        seed_all(enable_demo_data=app.config["ENABLE_DEMO_DATA"])

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(student_bp, url_prefix="/api")
    app.register_blueprint(teacher_bp, url_prefix="/api/teacher")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/mascot/<path:filename>")
    def mascot_sprite(filename: str):
        return send_from_directory(SPRITE_DIR, filename)

    @app.after_request
    def apply_security_headers(response):
        response.headers.setdefault('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        response.headers.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'DENY')
        return response

    return app
