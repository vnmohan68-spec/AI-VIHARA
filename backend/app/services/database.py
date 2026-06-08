from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool, StaticPool
from app.config.settings import settings
from app.models.models import Base
import logging

logger = logging.getLogger(__name__)

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# SQLite needs StaticPool (single connection, thread-safe for async)
# PostgreSQL uses NullPool (no connection pool overhead)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    poolclass=StaticPool if _is_sqlite else NullPool,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified (%s)", "SQLite" if _is_sqlite else "PostgreSQL")


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
