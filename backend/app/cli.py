from __future__ import annotations

import click
from flask import Flask, current_app
from flask.cli import with_appcontext

from .core.db import db
from .core.runtime_schema import ensure_runtime_schema


def _ensure_models_loaded() -> None:
    from . import models  # noqa: F401


def register_commands(app: Flask) -> None:
    @app.cli.command("init-db")
    @with_appcontext
    def init_db_command() -> None:
        _ensure_models_loaded()
        db.create_all()
        click.echo("Database schema ensured.")

    @app.cli.command("sync-runtime-schema")
    @with_appcontext
    def sync_runtime_schema_command() -> None:
        ensure_runtime_schema()
        click.echo("Runtime schema ensured.")

    @app.cli.command("seed-data")
    @click.option("--demo/--no-demo", default=None)
    @with_appcontext
    def seed_data_command(demo: bool | None) -> None:
        from .seed.bootstrap import seed_all

        enable_demo_data = current_app.config["ENABLE_DEMO_DATA"] if demo is None else demo
        seed_all(enable_demo_data=enable_demo_data)
        click.echo(f"Seed completed (demo={'on' if enable_demo_data else 'off'}).")

    @app.cli.command("bootstrap-app")
    @click.option("--demo/--no-demo", default=None)
    @with_appcontext
    def bootstrap_app_command(demo: bool | None) -> None:
        from .seed.bootstrap import seed_all

        _ensure_models_loaded()
        enable_demo_data = current_app.config["ENABLE_DEMO_DATA"] if demo is None else demo
        db.create_all()
        ensure_runtime_schema()
        seed_all(enable_demo_data=enable_demo_data)
        click.echo(f"Bootstrap completed (demo={'on' if enable_demo_data else 'off'}).")
