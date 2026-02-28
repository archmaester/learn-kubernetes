// Patches the Databases module (m3) with full tutorial lesson content.
// Loaded after curriculum.js. m3 = CURRICULUM.phases[0].modules[2]
(function patchDatabaseLessons() {
  const m = CURRICULUM.phases[0].modules[2]; // phase-1 (index 0), third module (m3)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "postgresql-acid-indexes",
      title: "PostgreSQL: ACID, Transactions, and Indexes",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "PostgreSQL is the workhorse of production backend systems. Nearly every company you'll interview at uses it — often as the source of truth for user data, orders, and financial records. Understanding its internals is what separates a backend engineer from a form-handler."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why PostgreSQL Dominates",
          text: "Postgres offers SQL expressiveness, ACID guarantees, rich index types (B-tree, GIN, BRIN, hash), JSONB for semi-structured data, full-text search, and a mature extension ecosystem (pgvector, TimescaleDB, PostGIS). It scales to hundreds of millions of rows before you need to think about sharding."
        },
        {
          type: "heading",
          text: "ACID: The Four Guarantees",
          level: 2
        },
        {
          type: "text",
          text: "ACID is the contract that relational databases make with you. Violating any of these properties leads to corrupt data, lost money, or worse."
        },
        {
          type: "comparison",
          headers: ["Property", "What It Means", "Real-World Example"],
          rows: [
            ["Atomicity", "All operations in a transaction succeed, or none do", "Transfer $100: debit AND credit both happen, or neither does"],
            ["Consistency", "Transaction brings DB from one valid state to another", "Balance can never go negative if a CHECK constraint says so"],
            ["Isolation", "Concurrent transactions don't see each other's in-progress changes", "Two users booking the last seat — only one wins"],
            ["Durability", "Committed data survives crashes (written to WAL first)", "Server crashes after COMMIT — data is still there on restart"],
          ]
        },
        {
          type: "heading",
          text: "Transactions in Practice",
          level: 2
        },
        {
          type: "text",
          text: "A transaction wraps multiple statements into an all-or-nothing unit. If any statement fails, a ROLLBACK undoes everything."
        },
        {
          type: "code",
          lang: "sql",
          filename: "transaction.sql",
          code: `-- Classic bank transfer: atomic debit + credit
BEGIN;

UPDATE accounts
SET balance = balance - 100
WHERE user_id = 1 AND balance >= 100;  -- conditional: don't go negative

-- Check that exactly 1 row was affected before proceeding
-- Application checks rowcount here and rolls back if 0

UPDATE accounts
SET balance = balance + 100
WHERE user_id = 2;

COMMIT;

-- If anything fails:
ROLLBACK;`
        },
        {
          type: "heading",
          text: "Isolation Levels",
          level: 2
        },
        {
          type: "text",
          text: "Isolation is a spectrum. Stricter isolation = fewer anomalies but more contention. Most apps use READ COMMITTED (the Postgres default). Financial systems often need SERIALIZABLE."
        },
        {
          type: "comparison",
          headers: ["Level", "Dirty Read", "Non-Repeatable Read", "Phantom Read", "Use When"],
          rows: [
            ["READ UNCOMMITTED", "Possible", "Possible", "Possible", "Never in Postgres (treated as READ COMMITTED)"],
            ["READ COMMITTED (default)", "Prevented", "Possible", "Possible", "Most web apps — good balance"],
            ["REPEATABLE READ", "Prevented", "Prevented", "Possible", "Reports that must see consistent snapshot"],
            ["SERIALIZABLE", "Prevented", "Prevented", "Prevented", "Financial transactions, inventory allocation"],
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Phantom Read Anomaly",
          text: "At REPEATABLE READ, you can re-read the same row and get the same result — but a second SELECT with a range filter might return NEW rows inserted by another transaction. Example: SELECT * FROM orders WHERE amount > 1000 returns 5 rows, another transaction inserts a 6th, your same SELECT returns 6 rows. This is a phantom. SERIALIZABLE prevents it."
        },
        {
          type: "heading",
          text: "Indexes: How PostgreSQL Finds Data Fast",
          level: 2
        },
        {
          type: "text",
          text: "A table without an index is a pile of paper — to find something, you read every page. An index is an ordered structure that lets Postgres jump directly to the right location. The cost: write overhead (every INSERT/UPDATE/DELETE must also update the index)."
        },
        {
          type: "diagram",
          code: `  WITHOUT INDEX (Sequential Scan):
  ┌──────────────────────────────────────────────┐
  │ Page 1: id=1, id=2, id=3, id=4, id=5        │ ← read
  │ Page 2: id=6, id=7, id=8, id=9, id=10       │ ← read
  │ Page 3: id=11, id=12, ...                    │ ← read
  │ ... (10,000 pages for 1M rows)               │ ← all read
  └──────────────────────────────────────────────┘
  Result: ~100ms for 1M rows

  WITH B-tree INDEX on id:
  ┌────────────────────────────────┐
  │ Root Node: 500,000             │
  │ ├── Left: 250,000              │
  │ │   ├── 125,000  ← found!      │
  │ │   └── ...                    │
  │ └── Right: 750,000             │
  └────────────────────────────────┘
  Result: ~0.1ms (3 I/O ops for 1M rows)`
        },
        {
          type: "heading",
          text: "B-tree Indexes: The Default Workhorse",
          level: 3
        },
        {
          type: "text",
          text: "B-tree (balanced tree) is the default index type. It handles equality (=), range queries (<, >, BETWEEN), ORDER BY, and IS NULL efficiently."
        },
        {
          type: "code",
          lang: "sql",
          filename: "btree_indexes.sql",
          code: `-- Single column: fast for equality and range
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Composite: column ORDER matters
-- Good for: WHERE status = 'pending' AND created_at > '2024-01-01'
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- Partial index: only index rows matching condition
-- Saves space + faster for queries on active orders
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Covering index: includes extra columns to avoid heap fetch
-- Query: SELECT id, total FROM orders WHERE user_id = 1
-- With this index, Postgres never touches the table (index-only scan)
CREATE INDEX idx_orders_user_covering ON orders(user_id)
INCLUDE (id, total);

-- Unique index (also enforces constraint)
CREATE UNIQUE INDEX idx_users_email ON users(email);`
        },
        {
          type: "heading",
          text: "GIN Indexes: Arrays, JSONB, Full-Text Search",
          level: 3
        },
        {
          type: "text",
          text: "GIN (Generalized Inverted Index) works on composite values — JSONB documents, arrays, and tsvector columns. It builds an index from every element/key within the value."
        },
        {
          type: "code",
          lang: "sql",
          filename: "gin_indexes.sql",
          code: `-- JSONB: index all keys and values inside a JSON column
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);

-- Now this is fast (would be a seqscan without the index):
SELECT * FROM products WHERE metadata @> '{"category": "electronics"}';
SELECT * FROM products WHERE metadata ? 'discount_pct';  -- key exists

-- Array column: index all array elements
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);

-- Fast containment queries:
SELECT * FROM posts WHERE tags @> ARRAY['python', 'ai'];  -- has both tags
SELECT * FROM posts WHERE tags && ARRAY['redis', 'kafka'];  -- has any

-- Full-text search:
ALTER TABLE articles ADD COLUMN search_vector tsvector;
CREATE INDEX idx_articles_fts ON articles USING GIN(search_vector);

UPDATE articles
SET search_vector = to_tsvector('english', title || ' ' || body);

SELECT title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'kubernetes & deploy');`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview Tip: B-tree vs GIN",
          text: "B-tree: ordered scalar values, range queries, equality. GIN: containment queries on composite types (JSONB @>, array &&, full-text @@). If asked 'which index for JSONB?', answer GIN. If asked 'which for WHERE created_at > ?', answer B-tree."
        },
        {
          type: "heading",
          text: "EXPLAIN ANALYZE: Reading Query Plans",
          level: 2
        },
        {
          type: "text",
          text: "EXPLAIN ANALYZE is your most powerful optimization tool. It shows exactly what Postgres does to execute a query, how long each step takes, and how many rows each node processes."
        },
        {
          type: "code",
          lang: "sql",
          filename: "explain_analyze.sql",
          code: `-- Always use EXPLAIN (ANALYZE, BUFFERS) for the full picture
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.email, COUNT(o.id) as order_count
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.status = 'completed'
  AND o.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.email
HAVING COUNT(o.id) > 5;

-- Sample output to read:
-- Hash Join  (cost=1234.56..5678.90 rows=100 width=40)
--             (actual time=12.345..45.678 rows=87 loops=1)
--   Hash Cond: (o.user_id = u.id)
--   Buffers: shared hit=234 read=891          ← "read" = disk I/O!
--   ->  Seq Scan on orders o                  ← BAD: no index used
--         Filter: (status = 'completed' AND created_at > ...)
--         Rows Removed by Filter: 892341      ← removed 892k rows!
--   ->  Hash  (cost=... rows=1000)
--         ->  Seq Scan on users u
-- Planning Time: 0.456 ms
-- Execution Time: 45.678 ms                   ← wall clock time

-- Key things to look for:
-- "Seq Scan" on large tables → missing index
-- "Rows Removed by Filter" is huge → index would help
-- "Hash Join" with large hash → may need work_mem tuning
-- "Buffers: shared read" is high → cache misses, hot data not in RAM`
        },
        {
          type: "callout",
          variant: "info",
          title: "cost= vs actual time=",
          text: "cost= is Postgres's ESTIMATE (in abstract units). actual time= is real milliseconds from ANALYZE. When they diverge wildly, Postgres's statistics are stale — run ANALYZE on the table to refresh row counts and distributions. This fixes the planner choosing wrong join strategies."
        },
        {
          type: "heading",
          text: "Common Index Mistakes",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Mistake", "Why it fails", "Fix"],
          rows: [
            ["Index on low-cardinality column", "Boolean or status with 3 values → index slower than seqscan", "Partial index or skip entirely"],
            ["Wrong composite column order", "Index on (status, user_id) can't be used for WHERE user_id = ?", "Put equality columns first, range last"],
            ["Function wrapping indexed column", "WHERE LOWER(email) = ? ignores index on email", "Store lowercased, or use functional index: CREATE INDEX ON users(LOWER(email))"],
            ["Too many indexes", "Each index slows writes; unused indexes waste disk", "pg_stat_user_indexes to find unused indexes"],
            ["Missing index after FK", "JOINs on foreign keys without index → seqscan", "Always index FK columns"],
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "sqlalchemy-alembic",
      title: "SQLAlchemy Async ORM + Alembic Migrations",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "SQLAlchemy is the de facto ORM for Python. Combined with its async driver (asyncpg) and Alembic for migrations, it's the standard stack for production FastAPI + PostgreSQL applications."
        },
        {
          type: "callout",
          variant: "info",
          title: "ORM vs Raw SQL",
          text: "An ORM maps Python classes to database tables. You write Python instead of SQL, get type safety, and avoid SQL injection by default. The tradeoff: complex queries can be harder to express, and you must understand what SQL the ORM generates. Never blindly trust ORM queries — always check with EXPLAIN ANALYZE."
        },
        {
          type: "heading",
          text: "Setting Up Async SQLAlchemy",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "database.py",
          code: `from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# asyncpg is the async PostgreSQL driver (much faster than psycopg2 for async)
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"

# echo=True logs all SQL — use in development, NEVER in production
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,           # persistent connections in pool
    max_overflow=10,        # extra connections allowed when pool is full
    pool_timeout=30,        # wait up to 30s for a connection before error
    pool_recycle=3600,      # recycle connections after 1 hour (avoid stale)
    pool_pre_ping=True,     # test connection health before using it
)

# Factory for async sessions
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # prevent lazy-load errors after commit
)

class Base(DeclarativeBase):
    pass

# FastAPI dependency: yields a session, commits or rolls back, closes
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise`
        },
        {
          type: "heading",
          text: "Defining Models",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "models.py",
          code: `from datetime import datetime
from sqlalchemy import String, Integer, Numeric, ForeignKey, DateTime, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()")
    )
    is_active: Mapped[bool] = mapped_column(default=True)

    # Relationship — not loaded by default (lazy loading disabled in async)
    orders: Mapped[list["Order"]] = relationship(back_populates="user")

    # Table-level indexes and constraints
    __table_args__ = (
        Index("idx_users_email_active", "email", postgresql_where=text("is_active = true")),
    )

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("NOW()")
    )

    user: Mapped["User"] = relationship(back_populates="orders")

    __table_args__ = (
        Index("idx_orders_user_status", "user_id", "status"),
        Index("idx_orders_metadata", "metadata", postgresql_using="gin"),
    )`
        },
        {
          type: "heading",
          text: "CRUD Operations with Async Session",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "crud.py",
          code: `from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from models import User, Order

# CREATE
async def create_user(db: AsyncSession, email: str, hashed_password: str) -> User:
    user = User(email=email, hashed_password=hashed_password)
    db.add(user)
    await db.flush()   # sends INSERT, assigns id, stays in transaction
    return user

# READ — single row
async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()

# READ — with eager loading of relationship (avoids N+1)
async def get_user_with_orders(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.orders))  # JOIN + load in one query
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()

# READ — paginated list
async def list_orders(
    db: AsyncSession,
    user_id: int,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Order]:
    query = select(Order).where(Order.user_id == user_id)
    if status:
        query = query.where(Order.status == status)
    query = query.order_by(Order.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return list(result.scalars().all())

# UPDATE
async def update_order_status(
    db: AsyncSession, order_id: str, new_status: str
) -> int:
    result = await db.execute(
        update(Order)
        .where(Order.id == order_id)
        .values(status=new_status)
        .returning(Order.id)  # returns updated rows
    )
    return result.rowcount

# AGGREGATE
async def get_order_stats(db: AsyncSession, user_id: int) -> dict:
    result = await db.execute(
        select(
            func.count(Order.id).label("total"),
            func.sum(Order.total).label("revenue"),
            func.avg(Order.total).label("avg_order"),
        ).where(Order.user_id == user_id)
    )
    row = result.one()
    return {"total": row.total, "revenue": float(row.revenue or 0), "avg": float(row.avg_order or 0)}`
        },
        {
          type: "callout",
          variant: "warning",
          title: "The N+1 Query Problem",
          text: "If you load 100 users and then access user.orders for each one, SQLAlchemy fires 1 + 100 = 101 queries. Use selectinload() or joinedload() to fetch relationships eagerly in 1-2 queries. In production, always check query count with SQLAlchemy's echo or a query counter middleware."
        },
        {
          type: "heading",
          text: "Alembic: Database Migrations",
          level: 2
        },
        {
          type: "text",
          text: "Alembic manages schema changes over time. Every change (add column, create table, add index) becomes a versioned migration script that can be applied forward or rolled back."
        },
        {
          type: "code",
          lang: "bash",
          filename: "alembic_workflow.sh",
          code: `# Initial setup (once per project)
pip install alembic
alembic init alembic       # creates alembic/ dir and alembic.ini

# In alembic/env.py, wire it to your models:
# from models import Base
# target_metadata = Base.metadata

# Generate a migration from model changes (autogenerate)
alembic revision --autogenerate -m "add orders table"
# → creates alembic/versions/abc123_add_orders_table.py

# Review the generated migration! Autogenerate misses:
# - Custom indexes with WHERE clauses
# - CHECK constraints
# - Partial indexes
# - Server-side defaults

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade abc123

# View migration history
alembic history --verbose

# Show current state
alembic current`
        },
        {
          type: "code",
          lang: "python",
          filename: "alembic_migration_example.py",
          code: `"""add status index to orders

Revision ID: d4e9f123abc1
Revises: c3d8e012b9f0
Create Date: 2024-02-15 10:30:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e9f123abc1'
down_revision = 'c3d8e012b9f0'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add a column
    op.add_column('orders', sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True))

    # Create a partial index (autogenerate won't do this)
    op.create_index(
        'idx_orders_pending_created',
        'orders',
        ['created_at'],
        postgresql_where=sa.text("status = 'pending'")
    )

    # Data migration: backfill a column
    op.execute("UPDATE orders SET refunded_at = updated_at WHERE status = 'refunded'")

def downgrade() -> None:
    op.drop_index('idx_orders_pending_created', table_name='orders')
    op.drop_column('orders', 'refunded_at')`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Zero-Downtime Schema Changes",
          text: "Adding a nullable column is safe. Adding a NOT NULL column with no default locks the table during backfill — add it nullable first, backfill, then add the constraint. Adding an index locks reads — use CREATE INDEX CONCURRENTLY (Alembic: op.create_index(..., postgresql_concurrently=True)). Never drop a column that code still references — remove code first, deploy, then migrate."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "connection-pooling",
      title: "Connection Pooling: PgBouncer and asyncpg",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Every database connection consumes ~5–10MB of RAM on the Postgres server and requires a backend process. A Postgres server can typically handle 100–500 concurrent connections before memory becomes a bottleneck. With 10 pods each holding 20 connections, you're already at 200 connections — fine. With 100 pods, you're at 2,000 — you'll OOM the database."
        },
        {
          type: "heading",
          text: "Two Levels of Pooling",
          level: 2
        },
        {
          type: "diagram",
          code: `  Application Pods (100 pods × 5 connections = 500 conns)
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │  Pod 1      │  │  Pod 2      │  │  Pod 100    │
  │  asyncpg    │  │  asyncpg    │  │  asyncpg    │
  │  pool(5)    │  │  pool(5)    │  │  pool(5)    │
  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
              ┌─────────────────────┐
              │     PgBouncer       │  ← Connection pooler (proxy)
              │  pool_size = 50     │  ← Only 50 server-side conns!
              │  mode = transaction │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │     PostgreSQL      │  ← Only sees 50 connections
              │   max_connections   │
              │       = 200         │
              └─────────────────────┘

  Without PgBouncer: 100 pods × 20 conns = 2,000 connections → OOM
  With PgBouncer:    100 pods × 20 conns → multiplexed to 50 → safe`
        },
        {
          type: "heading",
          text: "PgBouncer Modes",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Mode", "How It Works", "Overhead", "Use When"],
          rows: [
            ["Session pooling", "Client gets a server connection for the entire session", "None", "Long-lived connections, apps using session-level features"],
            ["Transaction pooling (recommended)", "Server connection held only during a transaction", "Minimal", "Stateless apps (FastAPI, Django) — best multiplexing"],
            ["Statement pooling", "Released after every statement", "High", "Rare — breaks multi-statement transactions"],
          ]
        },
        {
          type: "code",
          lang: "ini",
          filename: "pgbouncer.ini",
          code: `[databases]
mydb = host=postgres-service port=5432 dbname=mydb

[pgbouncer]
listen_port = 5432
listen_addr = 0.0.0.0
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction          ; recommended for stateless apps
max_client_conn = 1000           ; max clients connecting to PgBouncer
default_pool_size = 50           ; server-side connections to Postgres
min_pool_size = 10               ; keep warm connections ready
reserve_pool_size = 5            ; emergency connections
reserve_pool_timeout = 5         ; seconds before using reserve pool

server_idle_timeout = 600        ; close idle server conns after 10 min
client_idle_timeout = 0          ; never disconnect idle clients
server_lifetime = 3600           ; recycle connections every hour

; Monitoring
stats_period = 60
logfile = /var/log/pgbouncer/pgbouncer.log`
        },
        {
          type: "heading",
          text: "asyncpg Pool Configuration",
          level: 2
        },
        {
          type: "text",
          text: "asyncpg is 3–5x faster than psycopg2 for async workloads. Its connection pool is configured at engine creation time in SQLAlchemy, or directly via asyncpg for raw queries."
        },
        {
          type: "code",
          lang: "python",
          filename: "pool_config.py",
          code: `import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine

# Option 1: SQLAlchemy engine (most common with FastAPI + ORM)
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@pgbouncer:5432/mydb",
    pool_size=5,          # connections per pod (PgBouncer multiplexes them)
    max_overflow=2,       # burst capacity
    pool_timeout=30,      # wait up to 30s for connection from pool
    pool_recycle=1800,    # recycle connections every 30 min
    pool_pre_ping=True,   # validate connection before use (handles restarts)
)

# Option 2: Raw asyncpg pool (for high-performance, non-ORM queries)
async def create_pool():
    return await asyncpg.create_pool(
        "postgresql://user:pass@pgbouncer:5432/mydb",
        min_size=2,
        max_size=10,
        command_timeout=60,         # query timeout
        max_inactive_connection_lifetime=300,  # drop idle conns after 5 min
    )

# Using raw asyncpg pool
async def get_user(pool: asyncpg.Pool, user_id: int):
    async with pool.acquire() as conn:  # checkout from pool
        row = await conn.fetchrow(
            "SELECT id, email FROM users WHERE id = $1",  # $1 = parameterized
            user_id
        )
        return dict(row) if row else None`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Right-sizing Your Pool",
          text: "A common formula: pool_size = (num_cores * 2) + num_disks. But with PgBouncer in transaction mode, keep application pool small (2–10 per pod) since PgBouncer handles multiplexing. Too large a pool wastes memory and causes contention. Monitor pg_stat_activity to see actual connection usage."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "mongodb-aggregation",
      title: "MongoDB: Document Model and Aggregation Pipeline",
      readTime: "13 min",
      content: [
        {
          type: "text",
          text: "MongoDB stores data as BSON documents (binary JSON). No schema, no JOINs, no ACID across collections by default. That's not a limitation — it's a design choice for workloads where flexibility, horizontal scaling, and read performance matter more than relational integrity."
        },
        {
          type: "callout",
          variant: "info",
          title: "When to Choose MongoDB Over PostgreSQL",
          text: "Use MongoDB when: (1) Your schema evolves rapidly and you don't want migrations. (2) Data is naturally hierarchical (nested arrays of objects). (3) You need horizontal sharding from day one. (4) Read performance on denormalized documents is critical. Use Postgres when: you need JOINs across many entities, strong ACID, complex queries, or financial data."
        },
        {
          type: "heading",
          text: "The Document Model",
          level: 2
        },
        {
          type: "text",
          text: "In MongoDB, related data is typically embedded in a single document rather than normalized across multiple tables. This trades write anomalies for read performance."
        },
        {
          type: "comparison",
          headers: ["", "PostgreSQL (normalized)", "MongoDB (denormalized)"],
          rows: [
            ["Storage", "3 tables: users, orders, order_items", "1 document: user + embedded orders array"],
            ["Read performance", "JOIN across 3 tables", "Single document fetch"],
            ["Write consistency", "ACID across all tables", "Document-level atomicity"],
            ["Schema updates", "ALTER TABLE (migration)", "Just write new shape — old docs still valid"],
            ["Best for", "Financial, relational data", "Catalogs, logs, user profiles, CMS"],
          ]
        },
        {
          type: "code",
          lang: "javascript",
          filename: "document_model.js",
          code: `// MongoDB document — related data embedded, not normalized
{
  "_id": ObjectId("..."),
  "user_id": "u_12345",
  "email": "alice@example.com",
  "profile": {
    "name": "Alice",
    "tier": "premium",
    "joined": ISODate("2024-01-15")
  },
  "recent_orders": [          // embedded array (top N orders)
    {
      "order_id": "ord_001",
      "total": 149.99,
      "status": "completed",
      "items": [
        { "sku": "LAPTOP-X1", "qty": 1, "price": 149.99 }
      ]
    }
  ],
  "tags": ["ai", "enterprise"],
  "metadata": {               // flexible schema — add fields freely
    "last_login": ISODate("2024-02-20"),
    "referral_code": "ALICE50"
  }
}`
        },
        {
          type: "heading",
          text: "The Aggregation Pipeline",
          level: 2
        },
        {
          type: "text",
          text: "The aggregation pipeline is MongoDB's SQL GROUP BY equivalent — and much more. Data flows through a series of stages, each transforming the document stream. Think of it like a Unix pipe: documents in, transformed documents out."
        },
        {
          type: "diagram",
          code: `  AGGREGATION PIPELINE

  Collection: events (10M documents)
  ──────────────────────────────────────────────────────────
  Stage 1: $match   → filter early (use index!) → 50k docs
  Stage 2: $group   → aggregate by day           → 30 docs
  Stage 3: $sort    → order by date              → 30 docs
  Stage 4: $project → reshape output fields      → 30 docs
  Stage 5: $limit   → return top 10              → 10 docs
  ──────────────────────────────────────────────────────────
  Rule: put $match and $limit as early as possible!`
        },
        {
          type: "code",
          lang: "javascript",
          filename: "aggregation_examples.js",
          code: `// Example: Daily revenue report for last 30 days
db.orders.aggregate([
  // Stage 1: filter (uses index on created_at)
  { $match: {
    status: "completed",
    created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  }},

  // Stage 2: group by day
  { $group: {
    _id: {
      year:  { $year: "$created_at" },
      month: { $month: "$created_at" },
      day:   { $dayOfMonth: "$created_at" }
    },
    daily_revenue: { $sum: "$total" },
    order_count:   { $sum: 1 },
    avg_order:     { $avg: "$total" },
    unique_users:  { $addToSet: "$user_id" }  // set of unique user_ids
  }},

  // Stage 3: compute unique user count from set
  { $addFields: {
    unique_user_count: { $size: "$unique_users" }
  }},

  // Stage 4: reshape for response
  { $project: {
    _id: 0,
    date: "$_id",
    daily_revenue: { $round: ["$daily_revenue", 2] },
    order_count: 1,
    avg_order: { $round: ["$avg_order", 2] },
    unique_user_count: 1
  }},

  // Stage 5: sort by date ascending
  { $sort: { "date.year": 1, "date.month": 1, "date.day": 1 } }
]);`
        },
        {
          type: "code",
          lang: "javascript",
          filename: "aggregation_lookup.js",
          code: `// $lookup: MongoDB's JOIN (use sparingly — denormalization is preferred)
db.orders.aggregate([
  { $match: { status: "pending" } },

  // Left outer join: orders → users
  { $lookup: {
    from: "users",
    localField: "user_id",
    foreignField: "_id",
    as: "user_info",
    pipeline: [                         // sub-pipeline on joined collection
      { $project: { email: 1, tier: 1 } }  // only fetch needed fields
    ]
  }},

  // Unwind the array (lookup always returns array)
  { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },

  // Filter to premium users only
  { $match: { "user_info.tier": "premium" } },

  { $project: {
    order_id: "$_id",
    total: 1,
    user_email: "$user_info.email"
  }}
]);

// $facet: run multiple aggregations in one pass (great for dashboards)
db.products.aggregate([
  { $match: { active: true } },
  { $facet: {
    "by_category": [
      { $group: { _id: "$category", count: { $sum: 1 }, avg_price: { $avg: "$price" } } }
    ],
    "price_distribution": [
      { $bucket: { groupBy: "$price", boundaries: [0, 10, 50, 100, 500], default: "500+" } }
    ],
    "total_count": [
      { $count: "count" }
    ]
  }}
]);`
        },
        {
          type: "heading",
          text: "MongoDB Indexes",
          level: 2
        },
        {
          type: "code",
          lang: "javascript",
          filename: "mongo_indexes.js",
          code: `// Single field
db.users.createIndex({ email: 1 }, { unique: true });

// Compound index (order matters for multi-field queries)
db.orders.createIndex({ user_id: 1, created_at: -1 });  // 1=asc, -1=desc

// Partial index (only index documents matching filter)
db.orders.createIndex(
  { created_at: 1 },
  { partialFilterExpression: { status: "pending" } }
);

// Text index for full-text search
db.articles.createIndex({ title: "text", body: "text" });
db.articles.find({ $text: { $search: "kubernetes deploy" } },
                 { score: { $meta: "textScore" } })
           .sort({ score: { $meta: "textScore" } });

// TTL index: auto-delete documents after expiry
db.sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Check if a query uses an index
db.orders.find({ user_id: "u_123", status: "completed" }).explain("executionStats");
// Look for: "IXSCAN" (index scan) vs "COLLSCAN" (collection scan — bad!)`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "redis-data-structures",
      title: "Redis: Data Structures and Core Commands",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Redis is an in-memory data structure server — not just a cache. Its six data structures (string, list, hash, set, sorted set, stream) let you implement caching, leaderboards, message queues, rate limiters, real-time analytics, and distributed locks without a separate service for each."
        },
        {
          type: "callout",
          variant: "info",
          title: "Redis Persistence Modes",
          text: "RDB (snapshot): Redis forks and writes a point-in-time snapshot to disk. Fast restart, but up to 5 minutes of data loss on crash. AOF (Append-Only File): logs every write command. Can be configured to fsync every second (default) or every write. Slower but more durable. Production recommendation: use both — RDB for fast restarts, AOF for durability. Redis 7+ has AOF with RDB-format base files."
        },
        {
          type: "heading",
          text: "String: The Universal Type",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "redis_strings.sh",
          code: `# Basic SET/GET with TTL
SET user:1:session "token_abc123" EX 3600    # expires in 1 hour
GET user:1:session

SET cache:product:42 '{"name":"Laptop","price":999}' EX 300

# Atomic increment (no race condition — Redis is single-threaded)
INCR page:views:homepage          # → 1, 2, 3, ...
INCRBY rate:limit:user:123 1      # for rate limiting
DECR stock:item:99

# Conditional SET (if-not-exists — distributed lock primitive)
SET lock:order:processing:789 "worker-1" NX EX 30
# NX = only set if key does not exist
# Returns OK if lock acquired, nil if already locked

# Bit operations (compact boolean arrays)
SETBIT user:1:logins:2024-02 5 1  # user logged in on Feb 5
GETBIT user:1:logins:2024-02 5    # → 1
BITCOUNT user:1:logins:2024-02    # total login days this month`
        },
        {
          type: "heading",
          text: "Hash: Object Storage",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "redis_hashes.sh",
          code: `# Store structured object (like a row)
HSET user:1 name "Alice" email "alice@example.com" tier "premium" logins 42
HGET user:1 email                    # → alice@example.com
HGETALL user:1                       # → all fields
HMGET user:1 name tier               # → Alice, premium

# Update single field without touching others
HSET user:1 tier "enterprise"

# Increment a hash field atomically
HINCRBY user:1 logins 1              # → 43

# Hash vs JSON string: use Hash when you need to update individual fields.
# Use string+JSON when you always read/write the whole object.`
        },
        {
          type: "heading",
          text: "List: Queue and Stack",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "redis_lists.sh",
          code: `# Push to queue (RPUSH = enqueue, LPOP = dequeue → FIFO)
RPUSH jobs:email '{"to":"alice@example.com","subject":"Welcome"}'
RPUSH jobs:email '{"to":"bob@example.com","subject":"Password reset"}'

LPOP jobs:email              # dequeue (FIFO)
LLEN jobs:email              # queue length

# Blocking pop — worker waits until item arrives (efficient polling)
BLPOP jobs:email 30          # blocks up to 30 seconds for an item

# Stack (LIFO) — LPUSH + LPOP
LPUSH history:user:1 "viewed product 42"
LPOP history:user:1

# Keep only last N items (sliding window)
LPUSH notifications:user:1 "New follower: Bob"
LTRIM notifications:user:1 0 99     # keep only 100 most recent`
        },
        {
          type: "heading",
          text: "Set: Unique Membership",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "redis_sets.sh",
          code: `# Track unique visitors (deduplication)
SADD unique:visitors:2024-02-20 "user:1" "user:2" "user:1"  # deduped
SCARD unique:visitors:2024-02-20    # → 2 (unique count)
SISMEMBER unique:visitors:2024-02-20 "user:1"  # → 1 (yes)

# Social graph: mutual follows, recommendations
SADD follows:alice bob charlie diana
SADD follows:bob alice charlie eve

SINTER follows:alice follows:bob    # mutual: {charlie}
SUNION follows:alice follows:bob    # all: {bob, charlie, diana, alice, eve}
SDIFF follows:alice follows:bob     # alice follows but bob doesn't: {diana}

# Random sampling (A/B tests, random picks)
SRANDMEMBER follows:alice 3         # 3 random members`
        },
        {
          type: "heading",
          text: "Sorted Set: Leaderboards and Range Queries",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "redis_sorted_sets.sh",
          code: `# Leaderboard: members with scores, auto-sorted
ZADD leaderboard 9850 "alice" 8720 "bob" 9100 "charlie"

# Top N players (descending: highest first)
ZREVRANGE leaderboard 0 9 WITHSCORES    # top 10

# Player rank (0-indexed)
ZREVRANK leaderboard "alice"            # → 0 (rank 1)
ZSCORE leaderboard "bob"                # → 8720.0

# Update score atomically
ZINCRBY leaderboard 150 "bob"           # bob += 150 pts

# Range by score: players between 8000 and 9000 points
ZRANGEBYSCORE leaderboard 8000 9000 WITHSCORES

# Time-series: score = Unix timestamp
ZADD events:user:1 1708598400 "login" 1708602000 "purchase"
# Get events in last hour:
ZRANGEBYSCORE events:user:1 (NOW()-3600) NOW()

# Expire old entries (keep only last 100 events)
ZREMRANGEBYRANK events:user:1 0 -101   # remove all but last 100`
        },
        {
          type: "heading",
          text: "Stream: Durable Message Log",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "redis_streams.sh",
          code: `# Add events to stream (auto-ID = timestamp-sequence)
XADD events:orders * event_type "order.created" order_id "ord_123" total "99.99"
XADD events:orders * event_type "order.shipped" order_id "ord_123"

# Read from beginning
XRANGE events:orders - +               # all events
XRANGE events:orders - + COUNT 10      # first 10

# Consumer group: multiple workers, each gets different messages
XGROUP CREATE events:orders workers $ MKSTREAM

# Worker reads and acknowledges
XREADGROUP GROUP workers worker-1 COUNT 5 STREAMS events:orders >
# > means "undelivered messages only"
XACK events:orders workers <message-id>  # acknowledge processed

# Streams vs Lists: Streams support consumer groups, persistent history,
# multiple readers. Use Streams for event sourcing, audit logs, Kafka-lite.
# Use Lists for simple job queues.`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "redis-patterns",
      title: "Redis Patterns: Caching, Pub/Sub, Locks, Rate Limiting",
      readTime: "13 min",
      content: [
        {
          type: "text",
          text: "Knowing Redis data structures is the prerequisite. This lesson is about the production patterns you'll use in every backend — and explain in interviews. These patterns are what Redis is famous for."
        },
        {
          type: "heading",
          text: "Pattern 1: Cache-Aside (Lazy Loading)",
          level: 2
        },
        {
          type: "text",
          text: "The most common caching pattern. Application checks cache first; on miss, loads from DB and populates cache. Simple, safe, and handles cold starts gracefully."
        },
        {
          type: "code",
          lang: "python",
          filename: "cache_aside.py",
          code: `import json
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

r = redis.from_url("redis://localhost:6379", decode_responses=True)

async def get_product(db: AsyncSession, product_id: int) -> dict | None:
    cache_key = f"product:{product_id}"

    # 1. Check cache
    cached = await r.get(cache_key)
    if cached:
        return json.loads(cached)   # cache hit

    # 2. Cache miss → query DB
    product = await db.get(Product, product_id)
    if not product:
        return None

    # 3. Populate cache with TTL
    data = {"id": product.id, "name": product.name, "price": float(product.price)}
    await r.setex(cache_key, 300, json.dumps(data))  # TTL = 5 minutes

    return data

async def update_product(db: AsyncSession, product_id: int, updates: dict):
    # Update DB
    await db.execute(update(Product).where(Product.id == product_id).values(**updates))
    await db.commit()

    # Invalidate cache — don't update it (avoid stale data race)
    await r.delete(f"product:{product_id}")

# Cache stampede protection: when cache expires, many requests hit DB at once.
# Solution: use a lock to let only one request rebuild the cache.
async def get_product_with_lock(db: AsyncSession, product_id: int) -> dict | None:
    cache_key = f"product:{product_id}"
    cached = await r.get(cache_key)
    if cached:
        return json.loads(cached)

    lock_key = f"lock:rebuild:{cache_key}"
    # Try to acquire rebuild lock (NX = only if not exists, EX = 10s timeout)
    acquired = await r.set(lock_key, "1", nx=True, ex=10)

    if acquired:
        try:
            product = await db.get(Product, product_id)
            if product:
                data = {"id": product.id, "name": product.name}
                await r.setex(cache_key, 300, json.dumps(data))
                return data
        finally:
            await r.delete(lock_key)
    else:
        # Another worker is rebuilding — wait briefly and retry
        import asyncio
        await asyncio.sleep(0.1)
        cached = await r.get(cache_key)
        return json.loads(cached) if cached else None`
        },
        {
          type: "heading",
          text: "Pattern 2: Pub/Sub and Real-Time Notifications",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "pubsub.py",
          code: `import redis.asyncio as redis
import asyncio, json

r = redis.from_url("redis://localhost:6379")

# Publisher: broadcast event to all subscribers
async def publish_event(channel: str, event: dict):
    await r.publish(channel, json.dumps(event))

# Example: after order status change
await publish_event("orders:status", {
    "order_id": "ord_123",
    "status": "shipped",
    "user_id": "u_456"
})

# Subscriber: listen on a channel (runs as background task)
async def subscribe_to_orders():
    pubsub = r.pubsub()
    await pubsub.subscribe("orders:status")

    async for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            # Handle: send push notification, update WebSocket, etc.
            await send_push_notification(event["user_id"], event["status"])

# Pattern subscribe (wildcard)
async def subscribe_all_order_events():
    pubsub = r.pubsub()
    await pubsub.psubscribe("orders:*")    # matches orders:status, orders:payment, etc.

# Note: Redis Pub/Sub is fire-and-forget. If a subscriber is offline, it misses
# messages. For durability, use Redis Streams (XADD/XREADGROUP) instead.`
        },
        {
          type: "heading",
          text: "Pattern 3: Distributed Lock (Redlock)",
          level: 2
        },
        {
          type: "text",
          text: "When multiple workers compete to process the same resource (a payment, a cron job, a batch), a distributed lock ensures only one wins. The key properties: automatic expiry (so crashes don't leave locks forever), and atomic acquire+release."
        },
        {
          type: "code",
          lang: "python",
          filename: "distributed_lock.py",
          code: `import redis.asyncio as redis
import uuid, asyncio
from contextlib import asynccontextmanager

r = redis.from_url("redis://localhost:6379")

# Lua script for atomic release: only delete if we own the lock
RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

@asynccontextmanager
async def distributed_lock(resource: str, ttl: int = 30):
    """Acquire a distributed lock. Raises if unable to acquire."""
    lock_key = f"lock:{resource}"
    lock_value = str(uuid.uuid4())   # unique token per acquire

    # Atomic acquire: SET key value NX EX ttl
    acquired = await r.set(lock_key, lock_value, nx=True, ex=ttl)
    if not acquired:
        raise RuntimeError(f"Could not acquire lock for {resource}")

    try:
        yield lock_value
    finally:
        # Atomic release: only delete if we still own it
        await r.eval(RELEASE_SCRIPT, 1, lock_key, lock_value)

# Usage
async def process_payment(payment_id: str):
    try:
        async with distributed_lock(f"payment:{payment_id}", ttl=60):
            # Only one worker executes this at a time
            await charge_card(payment_id)
            await update_order_status(payment_id, "paid")
    except RuntimeError:
        # Another worker already processing this payment
        return {"status": "already_processing"}

# For production, use the 'redis-py' lock or 'aioredlock' library
# which implements the full Redlock algorithm across multiple Redis nodes`
        },
        {
          type: "heading",
          text: "Pattern 4: Rate Limiting",
          level: 2
        },
        {
          type: "text",
          text: "Rate limiting protects your API from abuse. There are three common algorithms, each with different tradeoffs."
        },
        {
          type: "comparison",
          headers: ["Algorithm", "How It Works", "Pros", "Cons"],
          rows: [
            ["Fixed Window", "Count requests per fixed time window (e.g., per minute)", "Simple", "Burst at window boundary (100 req at 11:59 + 100 at 12:00)"],
            ["Sliding Window", "Count requests in rolling window using sorted set", "Smooth limiting", "Higher memory (stores each request timestamp)"],
            ["Token Bucket", "Tokens refill at constant rate, consumed per request", "Allows short bursts", "More complex"],
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "rate_limiter.py",
          code: `import redis.asyncio as redis
import time
from fastapi import HTTPException, Request

r = redis.from_url("redis://localhost:6379")

# Fixed Window Rate Limiter (simple, good for most use cases)
async def rate_limit_fixed(user_id: str, limit: int = 100, window: int = 60) -> bool:
    """Returns True if allowed, False if rate limited."""
    key = f"ratelimit:{user_id}:{int(time.time() // window)}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    results = await pipe.execute()
    count = results[0]
    return count <= limit

# Sliding Window Rate Limiter using Sorted Set (more precise)
SLIDING_WINDOW_SCRIPT = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local request_id = ARGV[4]

-- Remove requests outside the window
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
-- Count requests in window
local count = redis.call('ZCARD', key)
if count < limit then
    redis.call('ZADD', key, now, request_id)
    redis.call('EXPIRE', key, window)
    return 1  -- allowed
else
    return 0  -- rate limited
end
"""

async def rate_limit_sliding(user_id: str, limit: int = 100, window: int = 60) -> bool:
    key = f"ratelimit:sliding:{user_id}"
    now = time.time()
    request_id = f"{now}:{id(object())}"  # unique per request
    result = await r.eval(SLIDING_WINDOW_SCRIPT, 1, key, now, window, limit, request_id)
    return bool(result)

# FastAPI middleware example
async def rate_limit_middleware(request: Request, user_id: str):
    allowed = await rate_limit_fixed(user_id, limit=100, window=60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in 60 seconds.")`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview: Why Lua Scripts for Atomicity?",
          text: "Redis executes Lua scripts atomically — no other command runs between script lines. This avoids race conditions like: read count (100), another request increments (101), you compare against limit and incorrectly allow. The increment-then-check pattern needs atomicity. Lua or Redis transactions (MULTI/EXEC) provide this."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "database-design",
      title: "Database Design: Normalization, Sharding, and Replication",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Database design is where software engineering meets data engineering. Choosing between normalization and denormalization, and knowing when to shard vs scale vertically, are senior-level decisions that show up in system design interviews."
        },
        {
          type: "heading",
          text: "Normalization vs Denormalization",
          level: 2
        },
        {
          type: "text",
          text: "Normalization reduces data redundancy by splitting data into related tables. Denormalization merges tables for read performance, accepting redundancy as the cost."
        },
        {
          type: "comparison",
          headers: ["", "Normalized (3NF)", "Denormalized"],
          rows: [
            ["Storage", "Minimal (no duplication)", "More storage (copies of data)"],
            ["Reads", "Requires JOINs", "Single table/document fetch"],
            ["Writes", "Update one place", "Update all copies (write anomalies)"],
            ["Consistency", "Strong (single source of truth)", "Must manage consistency in app layer"],
            ["Use when", "OLTP: frequent writes, financial data", "OLAP: analytics, read-heavy, reporting"],
          ]
        },
        {
          type: "code",
          lang: "sql",
          filename: "normalization.sql",
          code: `-- Normalized (3NF): each fact stored once
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL  -- snapshot price at time of order
);

-- Query: requires JOINs
SELECT u.email, p.name, oi.quantity, oi.unit_price
FROM orders o
JOIN users u ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.id = 42;

-- Denormalized: embed user + product info in order
-- Used for analytics / data warehouse (OLAP)
CREATE TABLE orders_denormalized (
    order_id BIGINT,
    order_date DATE,
    user_id INT,
    user_email TEXT,        -- duplicated from users
    user_tier TEXT,         -- duplicated from users
    product_id INT,
    product_name TEXT,      -- duplicated from products
    category TEXT,          -- duplicated from products
    quantity INT,
    unit_price NUMERIC,
    total_line NUMERIC
);
-- Fast for: "total revenue by category last month" → single table scan`
        },
        {
          type: "heading",
          text: "Read Replicas: Scale Reads",
          level: 2
        },
        {
          type: "text",
          text: "Most production systems have read-heavy workloads (90%+ reads). Read replicas receive a stream of changes from the primary and apply them asynchronously — allowing you to distribute read traffic across multiple servers."
        },
        {
          type: "diagram",
          code: `  READ REPLICA ARCHITECTURE

  ┌──────────────────────────────────────────────┐
  │              Application                     │
  │                                              │
  │  WRITES ──→ Primary (read-write)             │
  │  READS  ──→ Replica 1 (read-only)            │
  │          ──→ Replica 2 (read-only)            │
  │          ──→ Replica 3 (read-only) [reports] │
  └──────────────────────────────────────────────┘
            │
            ▼  WAL streaming replication
  ┌─────────────────┐
  │    Primary DB   │  ← all writes happen here
  │  WAL (log of   │
  │  every change) │
  └────────┬────────┘
           │ stream WAL
   ┌───────┼───────┐
   ▼       ▼       ▼
 Rep 1   Rep 2   Rep 3  ← apply WAL, stay in sync
 (0-50ms replica lag typical)`
        },
        {
          type: "code",
          lang: "python",
          filename: "replica_routing.py",
          code: `from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Separate engines for primary and replica
primary_engine = create_async_engine("postgresql+asyncpg://user:pass@primary:5432/db")
replica_engine = create_async_engine("postgresql+asyncpg://user:pass@replica:5432/db")

PrimarySession = async_sessionmaker(primary_engine, expire_on_commit=False)
ReplicaSession = async_sessionmaker(replica_engine, expire_on_commit=False)

# Dependency for write operations (routes to primary)
async def get_write_db():
    async with PrimarySession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Dependency for read operations (routes to replica)
async def get_read_db():
    async with ReplicaSession() as session:
        yield session   # no commit needed for reads

# Usage in endpoints
@app.get("/products")
async def list_products(db: AsyncSession = Depends(get_read_db)):
    # Read from replica — OK if slightly stale
    ...

@app.post("/products")
async def create_product(db: AsyncSession = Depends(get_write_db)):
    # Write to primary
    ...

# Important: after a write, reads may need to go to primary
# (replica lag means replica may not have the new data yet)
# Pattern: use primary for reads immediately after writes (read-your-writes)`
        },
        {
          type: "heading",
          text: "WAL: The Foundation of Replication and Durability",
          level: 2
        },
        {
          type: "text",
          text: "The Write-Ahead Log (WAL) is Postgres's durability mechanism. Before any data page is modified, the change is written to the WAL. On crash, Postgres replays the WAL to recover. Replication works by streaming the WAL to replicas."
        },
        {
          type: "comparison",
          headers: ["WAL Use", "How It Works", "Why It Matters"],
          rows: [
            ["Durability (ACID D)", "Change is WAL-written before response to client", "If server crashes after COMMIT, WAL lets Postgres recover"],
            ["Streaming replication", "Primary sends WAL records to replicas in real-time", "Replicas stay near-sync with primary (milliseconds of lag)"],
            ["Logical replication", "Decoded WAL sent as logical changes (INSERT/UPDATE/DELETE)", "CDC for event sourcing, migrating to new DB versions"],
            ["PITR (backups)", "Continuous WAL archiving to S3", "Restore to any point in time — not just last snapshot"],
          ]
        },
        {
          type: "heading",
          text: "Sharding: Horizontal Scaling",
          level: 2
        },
        {
          type: "text",
          text: "Sharding splits a table across multiple database servers (shards). Each shard holds a subset of rows. This is the last resort — try read replicas, caching, and vertical scaling first. Sharding adds complexity that you'll live with forever."
        },
        {
          type: "comparison",
          headers: ["Strategy", "How It Works", "Good For", "Problem"],
          rows: [
            ["Hash sharding", "shard = hash(user_id) % N", "Even distribution, user data", "Range queries span all shards"],
            ["Range sharding", "Shard by date range or ID range", "Time-series, sequential IDs", "Hot shards if traffic concentrated in range"],
            ["Directory sharding", "Lookup table maps key → shard", "Flexible, easy rebalancing", "Lookup table is a bottleneck"],
            ["Geo sharding", "Region determines shard", "Data sovereignty, latency", "Uneven user distribution by region"],
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "Sharding Kills JOINs",
          text: "Once you shard, you cannot JOIN across shards at the database level. Queries that were simple SQL become multi-step: query each shard, aggregate in application code. This is why you delay sharding as long as possible — a well-indexed Postgres can handle 100M rows with good performance. Vertical scaling (more RAM, faster SSD) is often cheaper and simpler than sharding at 50M rows."
        },
        {
          type: "heading",
          text: "CAP Theorem",
          level: 2
        },
        {
          type: "text",
          text: "CAP theorem states that a distributed system can guarantee at most two of: Consistency, Availability, Partition tolerance. Since network partitions are unavoidable, you're really choosing between CP and AP."
        },
        {
          type: "comparison",
          headers: ["Choice", "DB Examples", "Behavior During Partition", "Use When"],
          rows: [
            ["CP (Consistent + Partition-tolerant)", "PostgreSQL, MongoDB (replica sets), etcd, ZooKeeper", "Returns error rather than stale data", "Financial transactions, inventory, anything requiring accuracy"],
            ["AP (Available + Partition-tolerant)", "Cassandra, DynamoDB, CouchDB", "Returns potentially stale data, accepts writes", "User feeds, shopping carts, anything that can tolerate eventual consistency"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview Answer: CAP Theorem",
          text: "\"Since network partitions are unavoidable in distributed systems, the real choice is CP vs AP. Postgres is CP — during a network split between primary and replica, it refuses to serve stale reads to stay consistent. Cassandra is AP — it stays available and accepts writes on all nodes, reconciling conflicts later. I'd choose CP for financial data, AP for user activity feeds where eventual consistency is fine.\""
        },
      ]
    },

  ]; // end m.lessons
})();
