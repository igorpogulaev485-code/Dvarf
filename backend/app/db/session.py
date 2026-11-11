from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# Fail fast: hung PATCH/COMMIT used to hold locks until nginx 60s → list/login spin.
# Keep pool checkout short so auth / character list are not starved behind sheet saves.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    pool_timeout=8,
)


@event.listens_for(engine, "connect")
def _set_postgres_timeouts(dbapi_connection, _connection_record) -> None:
    """Per-connection guards against lock stampedes and stuck transactions."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("SET statement_timeout = '15s'")
        cursor.execute("SET lock_timeout = '5s'")
        cursor.execute("SET idle_in_transaction_session_timeout = '30s'")
    finally:
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
