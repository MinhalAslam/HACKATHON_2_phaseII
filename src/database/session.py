from sqlmodel import Session
from contextlib import contextmanager
from .database import engine


@contextmanager
def get_db_session():
    """
    Context manager for database sessions.
    Ensures proper session cleanup after use.
    """
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


def get_session_override():
    """
    Dependency override for testing purposes.
    """
    yield get_db_session()