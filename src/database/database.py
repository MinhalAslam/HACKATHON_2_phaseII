from sqlmodel import create_engine, Session
from sqlalchemy import event
from sqlalchemy.pool import Pool, NullPool
from typing import Generator
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./todo_app.db")  # Fallback to SQLite for testing

# Create the engine with proper connection pooling for serverless databases
# Use NullPool for serverless databases like Neon to avoid connection pool issues
engine = create_engine(
    DATABASE_URL,
    echo=True,
    poolclass=NullPool,  # No connection pooling for serverless
    connect_args={
        "connect_timeout": 10,
    } if "postgresql" in DATABASE_URL else {}
)

# Add pessimistic connection handling
@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Handle new connections"""
    connection_record.info['pid'] = os.getpid()

@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Ensure connection is alive before use"""
    pid = os.getpid()
    if connection_record.info['pid'] != pid:
        connection_record.dbapi_connection = connection_proxy.dbapi_connection = None
        raise Exception(
            "Connection record belongs to pid %s, "
            "attempting to check out in pid %s" %
            (connection_record.info['pid'], pid)
        )

def get_session() -> Generator[Session, None, None]:
    """Get a database session with proper error handling"""
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()