from __future__ import annotations

from flask import current_app
from sqlalchemy import inspect, text

from .db import db


def _timestamp_sql_type() -> str:
    return 'TIMESTAMP WITH TIME ZONE' if db.engine.dialect.name == 'postgresql' else 'TIMESTAMP'


def ensure_runtime_schema() -> None:
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())

    if 'user_progress' in table_names:
        progress_columns = {column['name'] for column in inspector.get_columns('user_progress')}
        if 'started_at' not in progress_columns:
            with db.engine.begin() as connection:
                connection.execute(text(f'ALTER TABLE user_progress ADD COLUMN started_at {_timestamp_sql_type()}'))
            current_app.logger.info('Added missing user_progress.started_at column.')

    if 'users' in table_names:
        user_columns = {column['name'] for column in inspector.get_columns('users')}
        if 'session_version' not in user_columns:
            with db.engine.begin() as connection:
                connection.execute(text('ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0'))
            current_app.logger.info('Added missing users.session_version column.')
