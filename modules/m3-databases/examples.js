// Patches the Databases module (m3) with topics, labs, interviewQuestions, and codeExamples.
// Loaded after curriculum.js but before db-lessons.js.
// COMPLETE REWRITE — comprehensive code examples across PostgreSQL, MongoDB, Redis.
(function patchDatabaseModule() {
  const m = CURRICULUM.phases[0].modules[2]; // phase-1, third module (m3)

  // ── Topics ──────────────────────────────────────────────────────────────────
  m.topics = [
    // PostgreSQL internals
    "PostgreSQL architecture: postmaster, backend processes, shared memory, WAL writer, checkpointer",
    "MVCC: multi-version concurrency control — xmin/xmax, snapshots, dead tuples, visibility map",
    "WAL (Write-Ahead Log): sequential writes for durability, crash recovery, and streaming replication",
    "Shared buffers: PostgreSQL page cache (8KB pages), hit ratio monitoring, tuning (25% of RAM)",
    "VACUUM and autovacuum: reclaiming dead tuples, preventing transaction ID wraparound",
    "TOAST: handling oversized attributes (>2KB) via compression and out-of-line storage",
    "Checkpoint process: flushing dirty pages, WAL recycling, checkpoint_completion_target tuning",

    // Transactions & isolation
    "ACID guarantees: atomicity, consistency, isolation, durability — what each prevents",
    "Isolation levels: READ COMMITTED (default), REPEATABLE READ (snapshot), SERIALIZABLE (SSI)",
    "Anomalies: dirty reads, non-repeatable reads, phantom reads, write skew — which levels prevent which",
    "Pessimistic locking: SELECT FOR UPDATE, FOR UPDATE SKIP LOCKED (job queues), FOR UPDATE NOWAIT",
    "Optimistic locking: version column pattern, WHERE version = N, retry on conflict",
    "Advisory locks: pg_advisory_lock, pg_try_advisory_lock — application-level coordination",
    "Deadlock detection: automatic (deadlock_timeout), prevention via consistent lock ordering",

    // Indexes & query optimization
    "B-tree indexes: equality, range, ORDER BY, composite (column order matters), partial, covering (INCLUDE)",
    "GIN indexes: inverted index for JSONB @>, array &&, full-text search @@, jsonb_path_ops operator class",
    "BRIN indexes: block range summaries for time-series data — 1000x smaller than B-tree, correlation requirement",
    "Hash indexes: equality-only lookups, WAL-logged since PG10, rarely better than B-tree",
    "EXPLAIN ANALYZE: reading plans — Seq Scan, Index Scan, Bitmap Scan, cost vs actual, Buffers, Rows Removed",
    "Index anti-patterns: over-indexing, low cardinality, wrong composite order, functions on indexed columns",
    "Functional indexes: CREATE INDEX ON users(LOWER(email)) — index expressions, not just columns",

    // Advanced SQL
    "Window functions: RANK, DENSE_RANK, ROW_NUMBER, LAG, LEAD, SUM/AVG OVER, frame clauses",
    "CTEs: WITH clause for readability, recursive CTEs for tree traversal, materialized vs inlined",
    "JSONB: containment (@>), key existence (?), jsonb_set, jsonb_path_query, GIN indexing",
    "Full-text search: tsvector, tsquery, setweight for boosting, ts_rank, ts_headline, GIN index",
    "Generated columns: GENERATED ALWAYS AS ... STORED — auto-computed derived values",
    "LATERAL joins: correlated subqueries — top-N per group, pair with LIMIT inside subquery",
    "DISTINCT ON: Postgres-specific, first row per group with ORDER BY",

    // SQLAlchemy & Alembic
    "SQLAlchemy 2.0: mapped_column, type hints, select() API, DeclarativeBase",
    "Async engine: create_async_engine + asyncpg, pool_size, max_overflow, pool_pre_ping",
    "Session management: async_sessionmaker, expire_on_commit=False, commit/rollback pattern",
    "Relationship loading: lazy='raise' (prevent N+1), selectinload (collections), joinedload (single)",
    "Repository pattern: encapsulate DB access, thin routes, easy testing with mocks",
    "Alembic migrations: autogenerate, upgrade/downgrade, revision chain",
    "Zero-downtime migrations: nullable-first, CONCURRENTLY indexes, no column renames",

    // Connection pooling & replication
    "Application-level pooling: SQLAlchemy pool_size, max_overflow, pool_recycle, pool_pre_ping",
    "PgBouncer: external connection pooler, session/transaction/statement modes, max_client_conn",
    "PgBouncer transaction mode limitations: no prepared statements, no SET, no LISTEN/NOTIFY",
    "Read replicas: WAL-based streaming replication, async vs sync, replication lag handling",
    "Failover: Patroni + etcd for self-managed, cloud-managed (RDS, Cloud SQL) automatic",
    "Monitoring: pg_stat_activity (idle in transaction), pg_stat_user_tables (dead tuples), pg_stat_user_indexes (unused)",

    // MongoDB
    "Document model: BSON, flexible schema, embedding vs referencing, 16MB document limit",
    "Indexes: single field, compound, multikey (arrays), text, TTL, partial, wildcard",
    "Aggregation pipeline: $match, $group, $unwind, $lookup (JOIN), $project, $addFields, $facet",
    "Schema design: embed for read-together data, reference for independent/unbounded data",
    "Atlas Search: Lucene-based full-text search, fuzzy matching, facets, highlighting",
    "Change streams: real-time event processing from oplog, resumable, pipeline filtering",
    "Motor + Beanie ODM: async Python driver, Pydantic document models, auto-indexing",

    // Redis
    "Data structures: string, hash, list, set, sorted set, stream, HyperLogLog, bitmap",
    "Caching patterns: cache-aside, write-through, write-behind, cache stampede prevention",
    "Rate limiting: sliding window with sorted sets, Lua scripts for atomicity",
    "Distributed locks: SET NX EX, Lua release script, token ownership, Redlock for HA",
    "Pub/Sub: fire-and-forget messaging, channel subscriptions, pattern subscriptions",
    "Streams: durable event log, consumer groups, XREADGROUP, XACK, pending entries list",
    "Persistence: RDB snapshots, AOF append-only file, RDB+AOF combined strategy",
    "Redis Sentinel (HA) vs Redis Cluster (sharding), hash slots, replica promotion",

    // System design
    "CAP theorem: consistency vs availability during partitions — CP (Postgres) vs AP (Cassandra)",
    "CQRS: separate read/write models, event-driven sync, denormalized read stores",
    "Event sourcing: append-only event log, derived state, materialized views",
    "Sharding strategies: hash, range, geo, tenant — and why to delay sharding",
    "Polyglot persistence: Postgres + Redis + Elasticsearch + MongoDB in one system",
  ];

  // ── Labs ────────────────────────────────────────────────────────────────────
  m.labs = [
    {
      title: "PostgreSQL Query Optimization Workshop",
      desc: "Load 1M rows of e-commerce data (users, orders, products). Write intentionally slow queries. Use EXPLAIN (ANALYZE, BUFFERS) to diagnose. Add B-tree, partial, composite, and covering indexes. Measure before/after execution times. Target: 100ms → <5ms.",
      difficulty: "intermediate",
    },
    {
      title: "Build a Complete SQLAlchemy Async CRUD API",
      desc: "Create a FastAPI app with SQLAlchemy 2.0 async models (User, Order, OrderItem). Implement repository pattern with eager loading. Add Alembic migrations. Write a migration that adds a column with CONCURRENTLY index. Test with pytest + async fixtures.",
      difficulty: "intermediate",
    },
    {
      title: "Redis Caching & Rate Limiting Layer",
      desc: "Add Redis cache-aside caching to your FastAPI app with automatic invalidation on writes. Implement sliding window rate limiting with Lua scripts. Add a distributed lock for payment idempotency. Benchmark with and without caching (wrk or locust).",
      difficulty: "intermediate",
    },
    {
      title: "MongoDB Aggregation Pipeline: Log Analytics Dashboard",
      desc: "Insert 100K synthetic log events into MongoDB. Build aggregation pipelines for: hourly error rates, top error types with stack traces, user impact analysis. Create compound and text indexes. Compare query times with and without indexes.",
      difficulty: "intermediate",
    },
    {
      title: "Connection Pooling & Read Replicas Setup",
      desc: "Set up PostgreSQL primary + replica with Docker Compose using streaming replication. Configure PgBouncer in transaction mode. Create a FastAPI app with separate read/write engines. Demonstrate replication lag with concurrent writes and reads. Monitor with pg_stat_activity.",
      difficulty: "advanced",
    },
    {
      title: "Multi-Database Architecture: E-Commerce Platform",
      desc: "Build an e-commerce backend using PostgreSQL (users, orders), Redis (cache, sessions, rate limits), and MongoDB (product catalog with flexible attributes). Implement cache invalidation, distributed locking for inventory, and change stream for real-time order notifications.",
      difficulty: "advanced",
    },
  ];

  // ── Interview Questions ─────────────────────────────────────────────────────
  m.interviewQuestions = [
    // PostgreSQL fundamentals
    "Explain MVCC in PostgreSQL. What happens when you UPDATE a row? Why do dead tuples accumulate, and how does VACUUM handle them?",
    "Walk me through the write path in PostgreSQL: what happens between your application's COMMIT and the data being durable on disk?",
    "Explain the four ACID properties with concrete examples. What breaks if you lose each one?",
    "What are the PostgreSQL isolation levels? When would you use REPEATABLE READ vs SERIALIZABLE? What's the performance trade-off?",

    // Indexes & optimization
    "You have a query that takes 5 seconds on a 10M row table. Walk me through how you'd diagnose and fix it using EXPLAIN ANALYZE.",
    "Explain B-tree vs GIN vs BRIN indexes. When would you use each? Give a concrete example for each.",
    "What is a covering index (INCLUDE clause)? How does it enable index-only scans and why does that matter?",
    "A developer added an index on a boolean column (is_active). Why is this usually useless? When would it actually help?",
    "Explain composite index column ordering. Why does CREATE INDEX ON orders(status, created_at) serve different queries than (created_at, status)?",

    // Locking & concurrency
    "Explain pessimistic vs optimistic locking. When would you use each? Show the SQL for both patterns.",
    "What is a deadlock? How does PostgreSQL detect and resolve deadlocks? How do you prevent them in application code?",
    "What is SELECT FOR UPDATE SKIP LOCKED? Design a job queue using it.",
    "Explain the write skew anomaly. Why can't REPEATABLE READ prevent it, but SERIALIZABLE can?",

    // Connection pooling & replication
    "Why does PostgreSQL performance degrade after 200-300 connections? How does PgBouncer solve this?",
    "Explain PgBouncer's transaction mode vs session mode. What breaks in transaction mode?",
    "How does PostgreSQL streaming replication work? What's the difference between synchronous and asynchronous replication?",
    "After writing to the primary, a user immediately reads from a replica and doesn't see their data. Why? How do you handle this?",

    // MongoDB
    "When would you choose MongoDB over PostgreSQL? Give three specific use cases where MongoDB's document model is genuinely better.",
    "Explain embedding vs referencing in MongoDB schema design. What's the 16MB document limit and how does it affect your design?",
    "Walk me through a MongoDB aggregation pipeline that computes revenue by category from an orders collection with embedded line items.",

    // Redis
    "Redis is single-threaded. How can it handle 100K+ operations per second?",
    "Design a rate limiter using Redis sorted sets. Why is a sliding window better than a fixed window?",
    "Explain the Redis distributed lock pattern (SET NX EX + Lua release). What happens if the lock holder crashes? What is Redlock?",
    "What's the difference between Redis Pub/Sub and Redis Streams? When would you use each?",
    "How does Redis persistence work (RDB vs AOF)? Should you use Redis as your primary database?",

    // System design
    "Design the database architecture for an Uber-like ride-sharing service. Which databases would you use for which data? How would you handle real-time driver locations?",
    "Explain the CAP theorem. Is PostgreSQL CP or AP? What about with async replicas?",
    "What is CQRS? When would you use it vs a simpler read-replica architecture?",
    "You have a PostgreSQL table with 500M rows and writes are getting slow. Walk me through your scaling strategy before and after considering sharding.",
    "Compare event sourcing to traditional CRUD. When is event sourcing worth the complexity?",
  ];

  // ── Code Examples ───────────────────────────────────────────────────────────
  // Story: Building "ShopAI" — an AI-powered e-commerce platform
  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1: PostgreSQL — Schema, Indexes, Query Optimization
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "postgresql-setup",
      icon: "🐘",
      title: "PostgreSQL: Schema, Indexes, Query Optimization",
      items: [
        {
          title: "Production Schema with Indexes",
          lang: "sql",
          filename: "schema.sql",
          desc: "Complete e-commerce schema with B-tree, partial, composite, covering, and GIN indexes reflecting real-world access patterns.",
          code: `-- Users table
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT NOT NULL,
    name        TEXT NOT NULL,
    tier        TEXT NOT NULL DEFAULT 'free'
                    CHECK (tier IN ('free', 'pro', 'enterprise')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active   BOOLEAN NOT NULL DEFAULT true
);

-- B-tree unique: login lookups
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Partial: only active users (smaller, faster auth)
CREATE INDEX idx_users_email_active
    ON users(email) WHERE is_active = true;

-- Orders table
CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     BIGINT NOT NULL REFERENCES users(id),
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                        'pending','processing','completed',
                        'cancelled','refunded'
                    )),
    total       NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK index (Postgres doesn't auto-index FKs!)
-- Composite: "show my pending orders"
CREATE INDEX idx_orders_user_status
    ON orders(user_id, status);

-- Date range: "orders in last 30 days"
CREATE INDEX idx_orders_created_at
    ON orders(created_at DESC);

-- Partial: only pending (tiny, blazing fast)
CREATE INDEX idx_orders_pending
    ON orders(created_at) WHERE status = 'pending';

-- GIN on JSONB: containment queries
CREATE INDEX idx_orders_metadata
    ON orders USING GIN(metadata);

-- Products table
CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    sku         TEXT NOT NULL,
    name        TEXT NOT NULL,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category    TEXT NOT NULL,
    tags        TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,
    search_vec  TSVECTOR GENERATED ALWAYS AS (
                    setweight(to_tsvector('english', name), 'A') ||
                    setweight(to_tsvector('english',
                        COALESCE(description, '')), 'B')
                ) STORED,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_search ON products USING GIN(search_vec);

-- Order items (join table)
CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    UUID NOT NULL REFERENCES orders(id)
                    ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);`,
          notes: [
            "gen_random_uuid() is built-in since Postgres 13 (no pgcrypto needed)",
            "GENERATED ALWAYS AS keeps search_vec in sync automatically — no trigger needed",
            "Partial indexes are invisible to queries that don't match the WHERE clause",
            "Always index foreign keys — Postgres doesn't do it automatically",
          ]
        },
        {
          title: "EXPLAIN ANALYZE Deep Dive",
          lang: "sql",
          filename: "explain_analyze.sql",
          desc: "Read and interpret query plans. Spot sequential scans, bad estimates, and disk I/O problems.",
          code: `-- The slow query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    u.email,
    COUNT(o.id)      AS order_count,
    SUM(o.total)     AS lifetime_value
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE
    o.status = 'completed'
    AND o.created_at > NOW() - INTERVAL '90 days'
    AND u.tier = 'pro'
GROUP BY u.email
ORDER BY lifetime_value DESC
LIMIT 20;

-- Reading the plan:
--
-- Hash Join  (cost=1500..8200 rows=85 width=50)
--            (actual time=23.4..87.6 rows=72 loops=1)
--   Hash Cond: (o.user_id = u.id)
--   Buffers: shared hit=1240 read=3892     ← "read" = disk I/O
--
--   ->  Index Scan using idx_orders_user_status
--         on orders o                       ← index used
--         Index Cond: (status = 'completed')
--         Filter: (created_at > ...)
--         Rows Removed by Filter: 45820     ← RED FLAG
--         Buffers: shared hit=200 read=3800  ← mostly disk
--
--   ->  Hash (actual rows=9200)
--         ->  Seq Scan on users u           ← RED FLAG
--               Filter: (tier = 'pro')
--               Rows Removed by Filter: 190800  ← scanning 200K!
--
-- Execution Time: 87.619 ms

-- Fix 1: composite index for status + date range
CREATE INDEX idx_orders_status_created
    ON orders(status, created_at DESC);

-- Fix 2: partial index for tier filter
CREATE INDEX idx_users_tier
    ON users(tier) WHERE tier IN ('pro', 'enterprise');

-- Fix 3: covering index (avoid heap lookups entirely)
CREATE INDEX idx_orders_covering
    ON orders(user_id, status, created_at DESC)
    INCLUDE (total);

-- After fixes:
-- Index Only Scan (no heap access)
-- Buffers: shared hit=X read=0 (all from cache)
-- Execution time: 87ms -> 2-5ms`,
          notes: [
            "shared hit = from Postgres buffer cache (fast)",
            "shared read = from disk (slow — increase shared_buffers)",
            "'Rows Removed by Filter: N' — if N >> actual rows, wrong index",
            "cost= is estimated (arbitrary units). actual time= is real ms",
          ]
        },
        {
          title: "Window Functions & Analytics Queries",
          lang: "sql",
          filename: "window_functions.sql",
          desc: "Window functions for running totals, rankings, moving averages, and top-N per group patterns.",
          code: `-- Running total per user (keeps individual rows)
SELECT
    user_id,
    created_at,
    total,
    SUM(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
        ROWS UNBOUNDED PRECEDING
    ) AS running_total,

    RANK() OVER (
        PARTITION BY user_id ORDER BY total DESC
    ) AS value_rank,

    ROW_NUMBER() OVER (
        PARTITION BY user_id ORDER BY created_at
    ) AS nth_order,

    LAG(total, 1) OVER (
        PARTITION BY user_id ORDER BY created_at
    ) AS prev_order_total,

    AVG(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7
FROM orders
WHERE status = 'completed'
ORDER BY user_id, created_at;

-- Top 3 orders per user
WITH ranked AS (
    SELECT user_id, id, total, created_at,
        ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY total DESC
        ) AS rn
    FROM orders WHERE status = 'completed'
)
SELECT * FROM ranked WHERE rn <= 3;

-- DISTINCT ON: most recent order per user (Postgres-only)
SELECT DISTINCT ON (user_id)
    user_id, id AS order_id, total, created_at
FROM orders
WHERE status = 'completed'
ORDER BY user_id, created_at DESC;

-- Cohort analysis: monthly revenue by signup month
WITH user_cohorts AS (
    SELECT id AS user_id,
        DATE_TRUNC('month', created_at) AS cohort_month
    FROM users
)
SELECT
    c.cohort_month,
    DATE_TRUNC('month', o.created_at) AS order_month,
    COUNT(DISTINCT c.user_id) AS users,
    SUM(o.total) AS revenue
FROM user_cohorts c
JOIN orders o ON o.user_id = c.user_id
    AND o.status = 'completed'
GROUP BY c.cohort_month, DATE_TRUNC('month', o.created_at)
ORDER BY c.cohort_month, order_month;`,
          notes: [
            "PARTITION BY is like GROUP BY but doesn't collapse rows",
            "RANK() has gaps (1,1,3); DENSE_RANK() no gaps; ROW_NUMBER() unique",
            "Window functions run AFTER WHERE/GROUP BY, BEFORE ORDER BY/LIMIT",
            "DISTINCT ON (Postgres-only) is faster than window + filter for 'latest per group'",
          ]
        },
        {
          title: "JSONB, Full-Text Search, CTEs, LATERAL",
          lang: "sql",
          filename: "advanced_queries.sql",
          desc: "Advanced PostgreSQL features: JSONB operations, full-text search with ranking, recursive CTEs, and LATERAL joins.",
          code: `-- ═══ JSONB Operations ═══
-- Containment query (uses GIN index)
SELECT * FROM orders
WHERE metadata @> '{"source": "mobile", "campaign": "summer"}';

-- Access nested values
SELECT id,
    metadata->>'source' AS source,
    (metadata->'cart_size')::int AS items
FROM orders
WHERE metadata ? 'coupon_code';

-- Update nested JSONB (without replacing entire column)
UPDATE orders
SET metadata = jsonb_set(metadata, '{refund_reason}', '"customer_request"')
WHERE status = 'refunded';

-- ═══ Full-Text Search with Ranking ═══
SELECT
    name, category, price,
    ts_rank(search_vec, query) AS rank,
    ts_headline('english', description, query,
        'StartSel=<b>, StopSel=</b>, MaxWords=35'
    ) AS snippet
FROM products,
     to_tsquery('english', 'wireless & mechanical & keyboard') AS query
WHERE search_vec @@ query
ORDER BY rank DESC
LIMIT 20;

-- Prefix search (autocomplete)
SELECT name, price
FROM products
WHERE search_vec @@ to_tsquery('english', 'mech:*')
ORDER BY ts_rank(search_vec, to_tsquery('english', 'mech:*')) DESC
LIMIT 10;

-- ═══ Recursive CTE: Category Tree ═══
CREATE TABLE categories (
    id        INT PRIMARY KEY,
    parent_id INT REFERENCES categories(id),
    name      TEXT NOT NULL
);

WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 1 AS depth,
           name::TEXT AS path
    FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id,
           t.depth + 1,
           t.path || ' > ' || c.name
    FROM categories c
    JOIN tree t ON c.parent_id = t.id
    WHERE t.depth < 10
)
SELECT * FROM tree ORDER BY path;

-- ═══ LATERAL Join: Top 3 Recent Orders per User ═══
SELECT u.id, u.email, o.*
FROM users u
CROSS JOIN LATERAL (
    SELECT id AS order_id, total, status, created_at
    FROM orders
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 3
) o
WHERE u.is_active = true
ORDER BY u.id, o.created_at DESC;`,
          notes: [
            "@> containment uses GIN index; -> returns JSONB; ->> returns TEXT",
            "ts_headline generates HTML-highlighted search snippets",
            "Recursive CTEs need base case + recursive step with UNION ALL",
            "LATERAL subquery can reference columns from the outer table",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: SQLAlchemy Async — Models, Sessions, Migrations
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "sqlalchemy-patterns",
      icon: "🔗",
      title: "SQLAlchemy Async: Models, Sessions, Migrations",
      items: [
        {
          title: "Async Engine + FastAPI Dependencies",
          lang: "python",
          filename: "database.py",
          desc: "Production-ready SQLAlchemy async setup with separate read/write engines, health check, and FastAPI dependency injection.",
          code: `from sqlalchemy.ext.asyncio import (
    AsyncSession, create_async_engine, async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

class Base(DeclarativeBase):
    pass

def make_engine(url: str, pool_size: int = 10):
    return create_async_engine(
        url,
        pool_size=pool_size,
        max_overflow=5,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False,
    )

primary_engine = make_engine(
    "postgresql+asyncpg://user:pass@primary:5432/db"
)
replica_engine = make_engine(
    "postgresql+asyncpg://user:pass@replica:5432/db",
    pool_size=20,
)

WriteSession = async_sessionmaker(
    primary_engine, expire_on_commit=False
)
ReadSession = async_sessionmaker(
    replica_engine, expire_on_commit=False
)

# Write dependency (auto commit/rollback)
async def get_db() -> AsyncSession:
    async with WriteSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Read-only dependency
async def get_read_db() -> AsyncSession:
    async with ReadSession() as session:
        yield session

# Health check
async def ping_db() -> bool:
    try:
        async with WriteSession() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False`,
          notes: [
            "expire_on_commit=False prevents lazy load errors in async",
            "pool_pre_ping adds ~0.1ms per checkout but avoids stale connection errors",
            "Separate read/write engines let you scale reads via replicas",
            "pool_recycle=1800 closes connections older than 30 min (handles DB restarts)",
          ]
        },
        {
          title: "Model Definitions with Relationships",
          lang: "python",
          filename: "models.py",
          desc: "SQLAlchemy 2.0 mapped_column style with typed relationships, JSONB, UUID, partial indexes.",
          code: `from __future__ import annotations
from datetime import datetime
from decimal import Decimal
import uuid
from sqlalchemy import (
    String, Numeric, ForeignKey, DateTime, Boolean,
    Integer, Text, Index, CheckConstraint, text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID
from database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_email_active", "email",
              postgresql_where=text("is_active = true")),
    )

    id:         Mapped[int]      = mapped_column(primary_key=True)
    email:      Mapped[str]      = mapped_column(
                    String(255), unique=True)
    name:       Mapped[str]      = mapped_column(String(255))
    tier:       Mapped[str]      = mapped_column(
                    String(50), server_default="free")
    is_active:  Mapped[bool]     = mapped_column(
                    server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
                    DateTime(timezone=True),
                    server_default=text("NOW()"))

    orders: Mapped[list[Order]] = relationship(
        back_populates="user", lazy="raise")

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_orders_user_status", "user_id", "status"),
        Index("idx_orders_metadata", "metadata",
              postgresql_using="gin"),
        CheckConstraint("total >= 0",
                        name="ck_orders_positive"),
    )

    id:         Mapped[uuid.UUID] = mapped_column(
                    UUID(as_uuid=True), primary_key=True,
                    default=uuid.uuid4)
    user_id:    Mapped[int]       = mapped_column(
                    ForeignKey("users.id"))
    status:     Mapped[str]       = mapped_column(
                    String(50), server_default="pending")
    total:      Mapped[Decimal]   = mapped_column(
                    Numeric(12, 2))
    metadata_:  Mapped[dict]      = mapped_column(
                    "metadata", JSONB,
                    server_default=text("'{}'"))
    created_at: Mapped[datetime]  = mapped_column(
                    DateTime(timezone=True),
                    server_default=text("NOW()"))
    updated_at: Mapped[datetime]  = mapped_column(
                    DateTime(timezone=True),
                    server_default=text("NOW()"))

    user:  Mapped[User]            = relationship(
        back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", lazy="raise",
        cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id:         Mapped[int]       = mapped_column(primary_key=True)
    order_id:   Mapped[uuid.UUID] = mapped_column(
                    ForeignKey("orders.id"))
    product_id: Mapped[int]       = mapped_column(
                    ForeignKey("products.id"))
    quantity:   Mapped[int]       = mapped_column(Integer)
    unit_price: Mapped[Decimal]   = mapped_column(
                    Numeric(10, 2))

    order: Mapped[Order] = relationship(back_populates="items")`,
          notes: [
            "lazy='raise' forces explicit eager loading — prevents N+1 in async",
            "server_default runs in DB; default runs in Python",
            "UUID primary keys prevent sequential ID enumeration",
            "__table_args__ keeps index definitions co-located with the model",
          ]
        },
        {
          title: "Repository Pattern: CRUD + Complex Queries",
          lang: "python",
          filename: "repositories.py",
          desc: "Encapsulate all DB access. Keeps routes thin and makes testing easy with mock repositories.",
          code: `from typing import Sequence
from uuid import UUID
from decimal import Decimal
from sqlalchemy import select, update, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from models import User, Order, OrderItem

class OrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, order_id: UUID) -> Order | None:
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self, user_id: int,
        status: str | None = None,
        limit: int = 20, offset: int = 0,
    ) -> Sequence[Order]:
        query = (
            select(Order)
            .where(Order.user_id == user_id)
        )
        if status:
            query = query.where(Order.status == status)
        query = (
            query.order_by(Order.created_at.desc())
            .limit(limit).offset(offset)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(
        self, user_id: int, total: Decimal,
        items: list[dict],
    ) -> Order:
        order = Order(user_id=user_id, total=total)
        self.db.add(order)
        await self.db.flush()  # get order.id without commit

        for item in items:
            self.db.add(OrderItem(
                order_id=order.id,
                product_id=item["product_id"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
            ))
        await self.db.flush()
        return order

    async def update_status(
        self, order_id: UUID, new_status: str,
    ) -> bool:
        result = await self.db.execute(
            update(Order)
            .where(and_(
                Order.id == order_id,
                Order.status != new_status,
            ))
            .values(status=new_status)
        )
        return result.rowcount > 0

    async def get_user_stats(self, user_id: int) -> dict:
        result = await self.db.execute(
            select(
                func.count(Order.id).label("total_orders"),
                func.sum(Order.total).label("total_spend"),
                func.max(Order.total).label("largest_order"),
            ).where(and_(
                Order.user_id == user_id,
                Order.status == "completed",
            ))
        )
        row = result.one()
        return {
            "total_orders": row.total_orders or 0,
            "total_spend": float(row.total_spend or 0),
            "largest_order": float(row.largest_order or 0),
        }

# Usage in FastAPI
from fastapi import Depends
from database import get_db

@app.post("/orders")
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
):
    repo = OrderRepository(db)
    order = await repo.create(
        user_id=payload.user_id,
        total=payload.total,
        items=[i.model_dump() for i in payload.items],
    )
    return {"order_id": str(order.id)}`,
          notes: [
            "selectinload() uses 2 queries — better than joinedload for collections",
            "flush() sends SQL within the transaction without committing",
            "Repository pattern decouples business logic from DB details",
            "Bulk update via update().where().values() is a single SQL statement",
          ]
        },
        {
          title: "Alembic Migration: Safe Production Schema Change",
          lang: "python",
          filename: "migrations/versions/001_add_refund.py",
          desc: "Real Alembic migration with data backfill, concurrent index creation, and safe rollback.",
          code: `"""Add refunded_at and refund_reason to orders

Revision ID: a1b2c3d4e5f6
Revises: 9z8y7x6w5v4u
Create Date: 2024-02-15 09:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '9z8y7x6w5v4u'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Step 1: Add nullable columns (no table lock)
    op.add_column('orders',
        sa.Column('refunded_at',
                  sa.DateTime(timezone=True),
                  nullable=True))
    op.add_column('orders',
        sa.Column('refund_reason', sa.Text,
                  nullable=True))

    # Step 2: Backfill existing data
    op.execute("""
        UPDATE orders
        SET refunded_at = updated_at,
            refund_reason = 'Legacy refund'
        WHERE status = 'refunded'
          AND refunded_at IS NULL
    """)

    # Step 3: Index CONCURRENTLY (no write lock)
    with op.get_context().autocommit_block():
        op.execute(sa.text(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
            "idx_orders_refunded_at "
            "ON orders(refunded_at) "
            "WHERE status = 'refunded'"
        ))

def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(sa.text(
            "DROP INDEX CONCURRENTLY IF EXISTS "
            "idx_orders_refunded_at"
        ))
    op.drop_column('orders', 'refund_reason')
    op.drop_column('orders', 'refunded_at')`,
          notes: [
            "CREATE INDEX CONCURRENTLY doesn't lock writes — safe for production",
            "CONCURRENTLY can't run in a transaction — use autocommit_block()",
            "Always backfill before adding NOT NULL constraints",
            "Always review autogenerated migrations — they miss partial indexes and CHECK constraints",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: Connection Pooling & Replication
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "pooling-replication",
      icon: "🔄",
      title: "Connection Pooling & Replication Setup",
      items: [
        {
          title: "PgBouncer Configuration",
          lang: "ini",
          filename: "pgbouncer.ini",
          desc: "Production PgBouncer config: transaction pooling mode, connection limits, timeouts.",
          code: `[databases]
; Format: logical_name = connection_string
mydb = host=postgres-primary port=5432 dbname=mydb
mydb_ro = host=postgres-replica port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; ── Pool Mode ────────────────────────────────────
; transaction: return connection after each transaction
; session: dedicate connection per client session
; statement: return after each statement (no transactions)
pool_mode = transaction

; ── Pool Sizes ───────────────────────────────────
default_pool_size = 20     ; connections per user/db pair
min_pool_size = 5          ; keep warm connections
reserve_pool_size = 5      ; extra for burst
reserve_pool_timeout = 3   ; seconds before using reserve

; ── Connection Limits ────────────────────────────
max_client_conn = 1000     ; accept up to 1000 clients
max_db_connections = 50    ; max connections to each DB

; ── Timeouts ─────────────────────────────────────
server_idle_timeout = 600  ; close idle PG conn after 10 min
client_idle_timeout = 0    ; never close idle clients
query_timeout = 30         ; kill queries > 30s
client_login_timeout = 60  ; auth timeout

; ── Monitoring ───────────────────────────────────
stats_period = 60          ; log stats every 60s
admin_users = pgbouncer_admin

; ── Logging ──────────────────────────────────────
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1`,
          notes: [
            "Transaction mode: 1000 clients share 50 PG connections efficiently",
            "In transaction mode: no prepared statements, no SET, no LISTEN/NOTIFY",
            "For asyncpg: set statement_cache_size=0 to disable prepared statements",
            "Monitor via: psql -p 6432 -U pgbouncer_admin pgbouncer -c 'SHOW POOLS'",
          ]
        },
        {
          title: "Docker Compose: Primary + Replica + PgBouncer",
          lang: "yaml",
          filename: "docker-compose.yml",
          desc: "Complete PostgreSQL replication setup with primary, replica, and PgBouncer in Docker Compose.",
          code: `services:
  postgres-primary:
    image: postgres:16
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypass
      POSTGRES_DB: mydb
    volumes:
      - pg_primary_data:/var/lib/postgresql/data
      - ./init-primary.sh:/docker-entrypoint-initdb.d/init.sh
    command: >
      postgres
        -c wal_level=replica
        -c max_wal_senders=5
        -c max_replication_slots=5
        -c hot_standby=on
        -c shared_buffers=256MB
        -c effective_cache_size=768MB
        -c work_mem=16MB
        -c maintenance_work_mem=128MB
        -c checkpoint_completion_target=0.9
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d mydb"]
      interval: 5s
      timeout: 5s
      retries: 5

  postgres-replica:
    image: postgres:16
    environment:
      PGUSER: replicator
      PGPASSWORD: replicator_pass
    volumes:
      - pg_replica_data:/var/lib/postgresql/data
    depends_on:
      postgres-primary:
        condition: service_healthy
    # Replica initialized via pg_basebackup
    # (see init-replica.sh)

  pgbouncer:
    image: bitnami/pgbouncer:latest
    environment:
      PGBOUNCER_DATABASE: mydb
      PGBOUNCER_PORT: "6432"
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: "1000"
      PGBOUNCER_DEFAULT_POOL_SIZE: "20"
      POSTGRESQL_HOST: postgres-primary
      POSTGRESQL_PORT: "5432"
      POSTGRESQL_USERNAME: myuser
      POSTGRESQL_PASSWORD: mypass
      POSTGRESQL_DATABASE: mydb
    ports:
      - "6432:6432"
    depends_on:
      postgres-primary:
        condition: service_healthy

volumes:
  pg_primary_data:
  pg_replica_data:`,
          notes: [
            "wal_level=replica enables streaming replication",
            "shared_buffers=256MB is 25% of 1GB container memory",
            "checkpoint_completion_target=0.9 spreads I/O over 90% of interval",
            "pg_basebackup creates the initial replica from primary",
          ]
        },
        {
          title: "Monitoring Queries: Connection & Replication Health",
          lang: "sql",
          filename: "monitoring.sql",
          desc: "Essential monitoring queries for connections, replication lag, table bloat, and unused indexes.",
          code: `-- ═══ Connection Monitoring ═══
-- Active connections by state
SELECT state, COUNT(*) AS connections,
    MAX(EXTRACT(EPOCH FROM NOW() - state_change))::int
        AS longest_sec
FROM pg_stat_activity
WHERE datname = 'mydb'
GROUP BY state ORDER BY connections DESC;

-- Detect "idle in transaction" (holds locks, wastes pool)
SELECT pid, usename, state,
    NOW() - xact_start AS transaction_duration,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
    AND xact_start < NOW() - INTERVAL '1 minute'
ORDER BY xact_start;

-- Connection limit check
SELECT setting::int AS max_connections,
    (SELECT COUNT(*) FROM pg_stat_activity) AS used,
    setting::int - (SELECT COUNT(*) FROM pg_stat_activity)
        AS available
FROM pg_settings WHERE name = 'max_connections';

-- ═══ Replication Monitoring ═══
-- Replication lag on primary
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
    pg_size_pretty(
        pg_wal_lsn_diff(sent_lsn, replay_lsn)
    ) AS replay_lag_pretty
FROM pg_stat_replication;

-- Replication lag on replica (run on replica)
SELECT NOW() - pg_last_xact_replay_timestamp()
    AS replication_delay;

-- ═══ Table Bloat & Vacuum Health ═══
SELECT relname AS table_name,
    n_live_tup, n_dead_tup,
    ROUND(n_dead_tup::numeric /
        NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1)
        AS dead_pct,
    last_autovacuum,
    pg_size_pretty(pg_total_relation_size(relid))
        AS total_size
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 10;

-- ═══ Unused Indexes (waste write overhead) ═══
SELECT indexrelname AS index_name,
    relname AS table_name,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
JOIN pg_index USING (indexrelid)
WHERE idx_scan = 0
    AND NOT indisprimary AND NOT indisunique
ORDER BY pg_relation_size(indexrelid) DESC;`,
          notes: [
            "'idle in transaction' connections hold locks — kill or set idle_in_transaction_session_timeout",
            "replay_lag_bytes > 10MB means replica is falling behind — check I/O",
            "dead_pct > 20% means autovacuum can't keep up — tune per-table settings",
            "Unused indexes waste disk and slow writes — drop them after confirming they're not needed",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: MongoDB — ODM, Aggregation, Atlas Search
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "mongodb-code",
      icon: "🍃",
      title: "MongoDB: ODM, Aggregation, Atlas Search",
      items: [
        {
          title: "Motor + Beanie ODM Setup",
          lang: "python",
          filename: "mongodb_setup.py",
          desc: "Async MongoDB with Motor driver and Beanie ODM — Pydantic-based document models for FastAPI.",
          code: `from beanie import Document, Indexed, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import Field
from datetime import datetime
from typing import Optional
import uuid

class Product(Document):
    sku: Indexed(str, unique=True)
    name: str
    category: Indexed(str)
    price: float
    attrs: dict = {}  # flexible per-category attributes
    description: Optional[str] = None
    created_at: datetime = Field(
        default_factory=datetime.utcnow)

    class Settings:
        name = "products"
        indexes = [
            [("name", "text"), ("category", "text")],
        ]

class Order(Document):
    order_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: Indexed(str) = "pending"
    total: float
    items: list[dict] = []   # embedded line items
    shipping: Optional[dict] = None
    created_at: datetime = Field(
        default_factory=datetime.utcnow)

    class Settings:
        name = "orders"
        indexes = [
            [("user_id", 1), ("status", 1),
             ("created_at", -1)],
        ]

# FastAPI lifespan initialization
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncIOMotorClient(
        "mongodb://localhost:27017",
        maxPoolSize=10, minPoolSize=2,
        serverSelectionTimeoutMS=5000,
    )
    await init_beanie(
        database=client["shopai"],
        document_models=[Product, Order],
    )
    yield

app = FastAPI(lifespan=lifespan)

# CRUD operations
@app.get("/products")
async def list_products(
    category: str = None, limit: int = 20
):
    query = (Product.find(Product.category == category)
             if category else Product.find())
    return await (query.sort(-Product.created_at)
                  .limit(limit).to_list())

@app.get("/products/search")
async def search_products(q: str, limit: int = 20):
    return await (Product.find({"$text": {"$search": q}})
                  .limit(limit).to_list())`,
          notes: [
            "Beanie wraps Motor with Pydantic models — natural for FastAPI",
            "Indexed() creates the index automatically on startup",
            "Embedded items avoid JOINs but mind the 16MB document limit",
            "Use separate collections for unbounded or independently queried data",
          ]
        },
        {
          title: "Aggregation Pipeline: Revenue Analytics",
          lang: "python",
          filename: "analytics.py",
          desc: "Real analytics pipelines: revenue by category, hourly error rates, user impact analysis.",
          code: `from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta

async def revenue_by_category(
    db: AsyncIOMotorDatabase, days: int = 30
) -> list[dict]:
    """Revenue breakdown by product category."""
    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {
            "status": "completed",
            "created_at": {"$gte": since},
        }},
        {"$unwind": "$items"},
        {"$lookup": {
            "from": "products",
            "localField": "items.product_id",
            "foreignField": "sku",
            "as": "product",
        }},
        {"$unwind": "$product"},
        {"$group": {
            "_id": "$product.category",
            "revenue": {"$sum": {
                "$multiply": [
                    "$items.qty", "$items.price"
                ]
            }},
            "orders": {"$sum": 1},
            "products": {"$addToSet": "$product.sku"},
        }},
        {"$addFields": {
            "product_count": {"$size": "$products"},
        }},
        {"$project": {
            "category": "$_id", "_id": 0,
            "revenue": {"$round": ["$revenue", 2]},
            "orders": 1, "product_count": 1,
        }},
        {"$sort": {"revenue": -1}},
    ]

    return await (db["orders"]
                  .aggregate(pipeline)
                  .to_list(length=100))

async def hourly_error_rate(
    db: AsyncIOMotorDatabase, hours: int = 24
) -> list[dict]:
    """Error count by hour for monitoring dashboard."""
    since = datetime.utcnow() - timedelta(hours=hours)

    pipeline = [
        {"$match": {
            "timestamp": {"$gte": since},
            "level": {"$in": ["ERROR", "CRITICAL"]},
        }},
        {"$group": {
            "_id": {
                "hour": {"$dateToString": {
                    "format": "%Y-%m-%dT%H:00:00Z",
                    "date": "$timestamp",
                }},
                "level": "$level",
            },
            "count": {"$sum": 1},
            "affected_users": {"$addToSet": "$user_id"},
            "sample": {"$first": "$message"},
        }},
        {"$addFields": {
            "user_count": {"$size": "$affected_users"},
        }},
        {"$project": {"affected_users": 0}},
        {"$sort": {"_id.hour": 1}},
    ]

    return await (db["logs"]
                  .aggregate(pipeline)
                  .to_list(length=hours * 5))`,
          notes: [
            "Always put $match first — MongoDB can use indexes for filtering",
            "$unwind flattens arrays — one document per array element",
            "$lookup is a LEFT JOIN — returns array of matched docs",
            "$addToSet collects unique values — useful for counting distinct",
          ]
        },
        {
          title: "Change Streams + Atlas Search",
          lang: "python",
          filename: "realtime_search.py",
          desc: "Real-time order notifications via change streams and full-text product search.",
          code: `import json
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["shopai"]

# ═══ Change Streams: React to data changes ═══
async def watch_order_updates():
    """Push notifications when orders change status."""
    pipeline = [
        {"$match": {
            "operationType": {"$in": ["update", "insert"]},
            "fullDocument.status": {
                "$in": ["completed", "shipped", "cancelled"]
            },
        }}
    ]
    async with db["orders"].watch(
        pipeline, full_document="updateLookup"
    ) as stream:
        async for change in stream:
            doc = change["fullDocument"]
            event = {
                "order_id": doc["order_id"],
                "status": doc["status"],
                "user_id": doc["user_id"],
            }
            if doc["status"] == "completed":
                await send_confirmation(event)
            elif doc["status"] == "shipped":
                await send_tracking(event)
            elif doc["status"] == "cancelled":
                await process_refund(event)

# ═══ Atlas Search (managed MongoDB only) ═══
# Requires search index defined in Atlas:
# {
#   "mappings": {
#     "fields": {
#       "name": {"type": "string", "analyzer": "lucene.english"},
#       "description": {"type": "string"},
#       "category": {"type": "stringFacet"},
#       "price": {"type": "number"}
#     }
#   }
# }

async def search_products(
    query: str,
    min_price: float = 0,
    max_price: float = 99999,
    limit: int = 20,
) -> list[dict]:
    """Full-text search with fuzzy matching."""
    pipeline = [
        {"$search": {
            "index": "product_search",
            "compound": {
                "must": [{
                    "text": {
                        "query": query,
                        "path": ["name", "description"],
                        "fuzzy": {"maxEdits": 1},
                    }
                }],
                "filter": [{
                    "range": {
                        "path": "price",
                        "gte": min_price,
                        "lte": max_price,
                    }
                }],
            },
            "highlight": {
                "path": ["name", "description"]
            },
        }},
        {"$project": {
            "name": 1, "price": 1, "category": 1,
            "score": {"$meta": "searchScore"},
            "highlights": {"$meta": "searchHighlights"},
        }},
        {"$limit": limit},
    ]
    return await (db["products"]
                  .aggregate(pipeline)
                  .to_list(length=limit))`,
          notes: [
            "Change streams are resumable — store resume token for crash recovery",
            "full_document='updateLookup' fetches the complete doc on updates",
            "Atlas Search uses Lucene — same engine as Elasticsearch",
            "fuzzy maxEdits: 1 handles single-char typos",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5: Redis — Caching, Rate Limiting, Locks, Pub/Sub
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "redis-patterns-code",
      icon: "⚡",
      title: "Redis: Caching, Rate Limiting, Locks, Pub/Sub",
      items: [
        {
          title: "Cache-Aside Pattern for FastAPI",
          lang: "python",
          filename: "cache.py",
          desc: "Decorator-based caching with TTL, automatic invalidation, and cache stampede protection.",
          code: `import json
import hashlib
import functools
import asyncio
from typing import Callable
import redis.asyncio as redis

r = redis.from_url(
    "redis://localhost:6379", decode_responses=True
)

def cache(ttl: int = 300, prefix: str = ""):
    """Decorator: cache async function results in Redis."""
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            parts = [prefix or func.__name__]
            parts.extend(
                str(a) for a in args
                if not hasattr(a, '__dict__')
            )
            parts.extend(
                f"{k}={v}"
                for k, v in sorted(kwargs.items())
            )
            key = ":".join(parts)

            # Check cache
            cached = await r.get(key)
            if cached is not None:
                return json.loads(cached)

            # Cache miss: call function
            result = await func(*args, **kwargs)
            if result is not None:
                await r.setex(
                    key, ttl,
                    json.dumps(result, default=str),
                )
            return result
        return wrapper
    return decorator

# Cache stampede protection with lock
async def get_with_lock(
    key: str,
    fetch_fn,
    ttl: int = 300,
    lock_ttl: int = 10,
):
    """Only one request refreshes; others wait."""
    cached = await r.get(key)
    if cached:
        return json.loads(cached)

    lock_key = f"lock:{key}"
    acquired = await r.set(
        lock_key, "1", nx=True, ex=lock_ttl
    )

    if acquired:
        try:
            result = await fetch_fn()
            await r.setex(
                key, ttl,
                json.dumps(result, default=str),
            )
            return result
        finally:
            await r.delete(lock_key)
    else:
        # Another request is refreshing — wait and retry
        for _ in range(lock_ttl * 10):
            await asyncio.sleep(0.1)
            cached = await r.get(key)
            if cached:
                return json.loads(cached)
        # Fallback: fetch directly
        return await fetch_fn()

# Cache invalidation (safe pattern using SCAN)
async def invalidate(pattern: str):
    """Delete all keys matching pattern."""
    cursor = 0
    while True:
        cursor, keys = await r.scan(
            cursor, match=pattern, count=100
        )
        if keys:
            await r.delete(*keys)
        if cursor == 0:
            break

# Usage
@cache(ttl=60, prefix="product")
async def get_product(product_id: int):
    async with ReadSession() as db:
        p = await db.get(Product, product_id)
        if not p: return None
        return {"id": p.id, "name": p.name,
                "price": float(p.price)}

# After update:
async def update_product(pid: int, updates: dict):
    # ... update DB ...
    await invalidate(f"product:{pid}*")`,
          notes: [
            "SCAN is safe for production (non-blocking); never use KEYS *",
            "Cache stampede: lock ensures one request refreshes, others wait",
            "json.dumps(default=str) handles datetime and Decimal",
            "Consider msgpack for ~2x faster serialization on large payloads",
          ]
        },
        {
          title: "Sliding Window Rate Limiter",
          lang: "python",
          filename: "rate_limiter.py",
          desc: "Atomic sliding window rate limiting with Redis sorted sets and Lua scripts.",
          code: `import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis

r = redis.from_url("redis://localhost:6379")

RATE_LIMIT_LUA = """
local key     = KEYS[1]
local now     = tonumber(ARGV[1])
local window  = tonumber(ARGV[2])
local limit   = tonumber(ARGV[3])
local req_id  = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, req_id)
    redis.call('EXPIRE', key, window + 1)
    return {1, limit - count - 1}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local reset_at = tonumber(oldest[2]) + window
    return {0, 0, reset_at}
end
"""

async def check_rate_limit(
    key: str, limit: int = 100, window: int = 60
) -> tuple[bool, dict]:
    now = time.time()
    result = await r.eval(
        RATE_LIMIT_LUA, 1, key,
        now, window, limit, str(uuid.uuid4())
    )
    allowed = bool(result[0])
    remaining = int(result[1])
    headers = {
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Window": str(window),
    }
    if not allowed and len(result) > 2:
        headers["X-RateLimit-Reset"] = str(int(result[2]))
    return allowed, headers

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health", "/metrics"}:
            return await call_next(request)

        user_id = getattr(request.state, "user_id", None)
        ident = (f"user:{user_id}" if user_id
                 else f"ip:{request.client.host}")

        if "/inference" in request.url.path:
            limit, window = 10, 60   # AI: 10/min
        else:
            limit, window = 100, 60  # General: 100/min

        allowed, headers = await check_rate_limit(
            f"rl:{ident}", limit, window
        )
        if not allowed:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                headers={
                    **headers,
                    "Content-Type": "application/json",
                },
            )
        response = await call_next(request)
        response.headers.update(headers)
        return response`,
          notes: [
            "Sliding window is more accurate than fixed window — no burst at boundary",
            "ZREMRANGEBYSCORE removes expired entries, keeping memory bounded",
            "Lua script is atomic — no race conditions between concurrent requests",
            "Per-endpoint limits protect expensive AI routes more aggressively",
          ]
        },
        {
          title: "Distributed Lock with Retry",
          lang: "python",
          filename: "locking.py",
          desc: "Production distributed lock with ownership verification via Lua and exponential backoff.",
          code: `import asyncio
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import redis.asyncio as redis

r = redis.from_url("redis://localhost:6379")

# Atomic release: only delete if WE own the lock
RELEASE_LUA = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

# Atomic extend: renew TTL only if we still own it
EXTEND_LUA = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
else
    return 0
end
"""

class LockNotAcquired(Exception):
    pass

@asynccontextmanager
async def distributed_lock(
    resource: str,
    ttl_seconds: int = 30,
    retry_times: int = 3,
    retry_delay: float = 0.1,
) -> AsyncGenerator[str, None]:
    lock_key = f"lock:{resource}"
    lock_token = str(uuid.uuid4())

    acquired = False
    for attempt in range(retry_times):
        acquired = await r.set(
            lock_key, lock_token, nx=True, ex=ttl_seconds
        )
        if acquired:
            break
        if attempt < retry_times - 1:
            delay = retry_delay * (2 ** attempt)
            await asyncio.sleep(delay)

    if not acquired:
        raise LockNotAcquired(
            f"Could not acquire lock: {resource}"
        )

    try:
        yield lock_token
    finally:
        await r.eval(RELEASE_LUA, 1, lock_key, lock_token)

# Usage: idempotent payment processing
async def process_payment(
    payment_id: str, amount: float
) -> dict:
    try:
        async with distributed_lock(
            f"payment:{payment_id}", ttl_seconds=60
        ):
            # Check idempotency
            if await r.exists(f"paid:{payment_id}"):
                return {"status": "already_processed"}

            result = await charge_card(payment_id, amount)

            # Mark processed (24h idempotency window)
            await r.setex(
                f"paid:{payment_id}", 86400, "1"
            )
            return {"status": "success", "result": result}

    except LockNotAcquired:
        return {"status": "in_progress", "retry_after": 5}`,
          notes: [
            "Lua release script prevents releasing another worker's lock",
            "TTL must be longer than the work — if work takes 30s, set TTL to 60+",
            "If lock expires while held, another worker may start — design for idempotency",
            "For multi-node Redis HA, use Redlock (N/2+1 locks across N nodes)",
          ]
        },
        {
          title: "Session Store, Leaderboard, Streams",
          lang: "python",
          filename: "redis_patterns.py",
          desc: "Session storage with sliding expiry, real-time leaderboard, and durable event streams with consumer groups.",
          code: `import json
import uuid
from datetime import datetime
import redis.asyncio as redis

r = redis.from_url(
    "redis://localhost:6379", decode_responses=True
)

# ═══ Session Store (Hash + TTL) ═══

async def create_session(
    user_id: int, user_data: dict
) -> str:
    session_id = str(uuid.uuid4())
    key = f"session:{session_id}"
    await r.hset(key, mapping={
        "user_id": str(user_id),
        "email": user_data["email"],
        "tier": user_data.get("tier", "free"),
        "created": datetime.utcnow().isoformat(),
    })
    await r.expire(key, 86400 * 7)  # 7 days
    # Track user's sessions (for "log out all devices")
    await r.sadd(f"user:{user_id}:sessions", session_id)
    return session_id

async def get_session(session_id: str) -> dict | None:
    key = f"session:{session_id}"
    data = await r.hgetall(key)
    if not data:
        return None
    # Sliding expiry: extend on activity
    await r.expire(key, 86400 * 7)
    return data

async def logout_all(user_id: int):
    sids = await r.smembers(f"user:{user_id}:sessions")
    if sids:
        pipe = r.pipeline()
        for sid in sids:
            pipe.delete(f"session:{sid}")
        pipe.delete(f"user:{user_id}:sessions")
        await pipe.execute()

# ═══ Real-time Leaderboard (Sorted Set) ═══

LB_KEY = "leaderboard:global"

async def add_score(user_id: str, points: float):
    return await r.zincrby(LB_KEY, points, user_id)

async def get_rank(user_id: str) -> int | None:
    rank = await r.zrevrank(LB_KEY, user_id)
    return rank + 1 if rank is not None else None

async def top_players(n: int = 10) -> list[dict]:
    results = await r.zrevrange(
        LB_KEY, 0, n - 1, withscores=True
    )
    return [
        {"user_id": uid, "score": score, "rank": i + 1}
        for i, (uid, score) in enumerate(results)
    ]

# ═══ Streams: Durable Event Processing ═══

async def emit_event(stream: str, data: dict):
    await r.xadd(stream, data, maxlen=100000)

async def consume_events(
    stream: str, group: str, consumer: str
):
    # Create group if not exists
    try:
        await r.xgroup_create(
            stream, group, id="0", mkstream=True
        )
    except redis.ResponseError:
        pass  # group already exists

    while True:
        entries = await r.xreadgroup(
            group, consumer,
            {stream: ">"}, count=10, block=5000,
        )
        for s, messages in entries:
            for msg_id, data in messages:
                yield msg_id, data
                await r.xack(stream, group, msg_id)`,
          notes: [
            "Pipeline batches commands — fewer round trips, much faster",
            "Sorted sets: O(log N) for ZADD/ZRANK — handles millions of players",
            "Streams with XREADGROUP give Kafka-like consumer groups in Redis",
            "maxlen=100000 keeps stream bounded — old entries auto-trimmed",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 6: Multi-Database Integration
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "multi-db-integration",
      icon: "🏗️",
      title: "Multi-Database Architecture: Putting It All Together",
      items: [
        {
          title: "E-Commerce Backend: PG + Redis + MongoDB",
          lang: "python",
          filename: "app.py",
          desc: "FastAPI app using PostgreSQL for orders, Redis for cache/sessions, and MongoDB for product catalog.",
          code: `from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis_client
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Database clients (initialized in lifespan)
redis_conn: redis_client.Redis = None
mongo_db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_conn, mongo_db

    # PostgreSQL: handled by SQLAlchemy engine
    # (already configured in database.py)

    # Redis
    redis_conn = redis_client.from_url(
        "redis://localhost:6379",
        decode_responses=True,
    )

    # MongoDB
    mongo_client = AsyncIOMotorClient(
        "mongodb://localhost:27017"
    )
    mongo_db = mongo_client["shopai"]
    await init_beanie(
        database=mongo_db,
        document_models=[Product],
    )

    yield

    # Cleanup
    await redis_conn.close()
    mongo_client.close()

app = FastAPI(lifespan=lifespan)

# ── Product search (MongoDB) ──────────────────
@app.get("/products/search")
async def search_products(q: str, limit: int = 20):
    # Try cache first
    cache_key = f"search:{q}:{limit}"
    cached = await redis_conn.get(cache_key)
    if cached:
        return json.loads(cached)

    # MongoDB full-text search
    results = await (
        Product.find({"$text": {"$search": q}})
        .sort([("score", {"$meta": "textScore"})])
        .limit(limit)
        .to_list()
    )
    data = [r.model_dump() for r in results]

    # Cache for 5 minutes
    await redis_conn.setex(
        cache_key, 300, json.dumps(data, default=str)
    )
    return data

# ── Create order (PostgreSQL + Redis) ─────────
from database import get_db
from repositories import OrderRepository

@app.post("/orders")
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
):
    repo = OrderRepository(db)

    # Check inventory with distributed lock
    async with distributed_lock(
        f"inventory:{payload.product_id}"
    ):
        # ... check and decrement stock in PG ...
        order = await repo.create(
            user_id=payload.user_id,
            total=payload.total,
            items=[i.model_dump() for i in payload.items],
        )

    # Invalidate relevant caches
    await redis_conn.delete(
        f"user:{payload.user_id}:orders"
    )

    # Emit event for async processing
    await redis_conn.xadd("events:orders", {
        "order_id": str(order.id),
        "user_id": str(payload.user_id),
        "event": "created",
        "total": str(payload.total),
    })

    return {"order_id": str(order.id)}

# ── Session middleware (Redis) ─────────────────
@app.middleware("http")
async def session_middleware(request: Request, call_next):
    session_id = request.cookies.get("session_id")
    if session_id:
        session = await redis_conn.hgetall(
            f"session:{session_id}"
        )
        if session:
            request.state.user_id = session.get("user_id")
            request.state.tier = session.get("tier")
    return await call_next(request)`,
          notes: [
            "PostgreSQL: source of truth for users, orders, inventory (ACID)",
            "MongoDB: product catalog with flexible attributes per category",
            "Redis: caching, sessions, distributed locks, event streams",
            "Each database handles what it's best at — polyglot persistence",
          ]
        },
        {
          title: "Docker Compose: Full Database Stack",
          lang: "yaml",
          filename: "docker-compose.yml",
          desc: "Complete development stack: PostgreSQL + PgBouncer + Redis + MongoDB with health checks.",
          code: `services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypass
      POSTGRES_DB: shopai
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    command: >
      postgres
        -c shared_buffers=256MB
        -c effective_cache_size=768MB
        -c work_mem=16MB
        -c max_connections=100
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser"]
      interval: 5s
      timeout: 5s
      retries: 5

  pgbouncer:
    image: bitnami/pgbouncer:latest
    environment:
      PGBOUNCER_DATABASE: shopai
      PGBOUNCER_PORT: "6432"
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: "200"
      PGBOUNCER_DEFAULT_POOL_SIZE: "20"
      POSTGRESQL_HOST: postgres
      POSTGRESQL_PORT: "5432"
      POSTGRESQL_USERNAME: myuser
      POSTGRESQL_PASSWORD: mypass
      POSTGRESQL_DATABASE: shopai
    ports:
      - "6432:6432"
    depends_on:
      postgres:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    command: >
      redis-server
        --maxmemory 256mb
        --maxmemory-policy allkeys-lru
        --appendonly yes
        --appendfsync everysec
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpass
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Application
  api:
    build: .
    environment:
      DATABASE_URL: "postgresql+asyncpg://myuser:mypass@pgbouncer:6432/shopai"
      REDIS_URL: "redis://redis:6379"
      MONGO_URL: "mongodb://root:rootpass@mongodb:27017"
    ports:
      - "8000:8000"
    depends_on:
      pgbouncer:
        condition: service_started
      redis:
        condition: service_healthy
      mongodb:
        condition: service_healthy

volumes:
  pg_data:
  redis_data:
  mongo_data:`,
          notes: [
            "API connects to PgBouncer (6432), not Postgres directly (5432)",
            "Redis: allkeys-lru evicts least-recently-used when memory is full",
            "Redis: appendonly + appendfsync everysec balances durability and speed",
            "Health checks ensure services are ready before API starts",
          ]
        },
        {
          title: "Database Health Check Dashboard",
          lang: "python",
          filename: "health.py",
          desc: "Health check endpoint that monitors all three databases and reports connection pool status.",
          code: `from fastapi import APIRouter
from sqlalchemy import text
from database import WriteSession, write_engine
import redis.asyncio as redis_client
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
async def health_check():
    checks = {}

    # PostgreSQL
    try:
        async with WriteSession() as db:
            result = await db.execute(text("""
                SELECT
                    (SELECT COUNT(*)
                     FROM pg_stat_activity
                     WHERE datname = current_database()) AS conns,
                    (SELECT setting::int
                     FROM pg_settings
                     WHERE name = 'max_connections') AS max_conns
            """))
            row = result.one()
            pool = write_engine.pool
            checks["postgres"] = {
                "status": "healthy",
                "connections": row.conns,
                "max_connections": row.max_conns,
                "pool_size": pool.size(),
                "pool_checkedin": pool.checkedin(),
                "pool_overflow": pool.overflow(),
            }
    except Exception as e:
        checks["postgres"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # Redis
    try:
        info = await redis_conn.info("memory")
        checks["redis"] = {
            "status": "healthy",
            "used_memory_human": info["used_memory_human"],
            "maxmemory_human": info.get(
                "maxmemory_human", "unlimited"
            ),
            "connected_clients": (
                await redis_conn.info("clients")
            )["connected_clients"],
        }
    except Exception as e:
        checks["redis"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # MongoDB
    try:
        result = await mongo_db.command("ping")
        stats = await mongo_db.command("dbStats")
        checks["mongodb"] = {
            "status": "healthy",
            "collections": stats["collections"],
            "data_size": stats.get("dataSize", 0),
            "storage_size": stats.get("storageSize", 0),
        }
    except Exception as e:
        checks["mongodb"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    overall = all(
        c["status"] == "healthy"
        for c in checks.values()
    )
    return {
        "status": "healthy" if overall else "degraded",
        "checks": checks,
    }`,
          notes: [
            "Report pool_checkedin and pool_overflow to detect pool exhaustion",
            "Redis used_memory vs maxmemory shows how close to eviction",
            "Return 'degraded' not 'unhealthy' if some DBs are down but others work",
            "Add this to /health endpoint for Kubernetes readiness probes",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
