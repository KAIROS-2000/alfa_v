from __future__ import annotations

import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class TeacherReadPathTests(unittest.TestCase):
    def setUp(self) -> None:
        self._apps = []
        self._tempdirs: list[tempfile.TemporaryDirectory[str]] = []

    def tearDown(self) -> None:
        for app in self._apps:
            with app.app_context():
                from app.core.db import db

                db.session.remove()
                db.engine.dispose()
        for tempdir in self._tempdirs:
            tempdir.cleanup()

    def create_app(self):
        tempdir = tempfile.TemporaryDirectory()
        self._tempdirs.append(tempdir)
        database_path = Path(tempdir.name) / 'test.db'
        env = {
            'APP_ENV': 'development',
            'SECRET_KEY': 'UnitTestSecretKey123!UnitTestSecretKey123!',
            'DATABASE_URL': f'sqlite:///{database_path.as_posix()}',
            'CLIENT_URL': 'http://localhost:3000',
            'ENABLE_DEMO_DATA': 'false',
            'SUPERADMIN_BOOTSTRAP': 'false',
            'SESSION_COOKIE_SECURE': 'false',
            'GIGACHAT_VERIFY_SSL': 'true',
            'METRICS_DEBUG': 'false',
        }

        with patch.dict(os.environ, env, clear=False):
            import app.core.config as config_module
            import app as app_module

            importlib.reload(config_module)
            importlib.reload(app_module)

            app = app_module.create_app()
            app.config.update(TESTING=True)
            with app.app_context():
                from app import models  # noqa: F401
                from app.core.db import db

                db.create_all()
            self._apps.append(app)
            return app

    def create_teacher_fixture(self, app):
        from app.core.db import db
        from app.core.security import hash_password
        from app.models.learning import Assignment, Classroom
        from app.models.user import User, UserRole

        with app.app_context():
            teacher = User(
                full_name='Teacher Example',
                username='teacher',
                email='teacher@example.com',
                password_hash=hash_password('TeacherPass123!'),
                role=UserRole.TEACHER,
                age_group=None,
            )
            student = User(
                full_name='Student Example',
                username='student',
                email='student@example.com',
                password_hash=hash_password('StudentPass123!'),
                role=UserRole.STUDENT,
                age_group='middle',
            )
            db.session.add_all([teacher, student])
            db.session.flush()

            classroom = Classroom(
                name='Math',
                description='Test class',
                code='CLASS1',
                teacher_id=teacher.id,
            )
            db.session.add(classroom)
            db.session.flush()

            assignment = Assignment(
                classroom_id=classroom.id,
                lesson_id=None,
                title='Read-only assignment',
                description='Simple description',
                difficulty='medium',
                due_date=None,
                xp_reward=0,
            )
            db.session.add(assignment)
            db.session.commit()
            return teacher.id, classroom.id, assignment.id

    def login_teacher(self, client):
        return client.post('/api/auth/login', json={'login': 'teacher@example.com', 'password': 'TeacherPass123!'})

    def test_teacher_read_endpoints_do_not_backfill_submissions(self):
        app = self.create_app()
        teacher_id, classroom_id, assignment_id = self.create_teacher_fixture(app)

        from app.models.learning import AssignmentSubmission

        with app.test_client() as client:
            login_response = self.login_teacher(client)
            self.assertEqual(login_response.status_code, 200)

            overview = client.get('/api/teacher/overview')
            self.assertEqual(overview.status_code, 200)

            assignments = client.get(f'/api/teacher/classes/{classroom_id}/assignments')
            self.assertEqual(assignments.status_code, 200)

            submissions = client.get(f'/api/teacher/assignments/{assignment_id}/submissions')
            self.assertEqual(submissions.status_code, 200)
            self.assertEqual(submissions.get_json()['submissions'], [])

        with app.app_context():
            self.assertEqual(AssignmentSubmission.query.count(), 0)


if __name__ == '__main__':
    unittest.main()
