// Patches the Databases module (m3) with comprehensive code examples.
// Loaded after curriculum.js and db-lessons.js.
(function patchDatabaseExamples() {
  const m = CURRICULUM.phases[0].modules[2]; // phase-1 (index 0), third module (m3)

  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "postgresql-setup",
      icon: "🐘",
      title: "PostgreSQL: Schema, Indexes, Query Optimization",
      items: [
        {
          title: "Production Schema with Indexes",
          lang: "sql",
          filename: "schema.sql",
          desc: "Complete e-commerce schema with B-tree, partial, composite, and GIN indexes reflecting real-world access patterns.",
          code: `-- Users table
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT NOT NULL,
    name        TEXT NOT NULL,
    tier        TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active   BOOLEAN NOT NULL DEFAULT true
);

-- B-tree unique (used by login lookups)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Partial index: only active users (smaller index, faster auth queries)
CREATE INDEX idx_users_email_active ON users(email) WHERE is_active = true;

-- Orders table
CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     BIGINT NOT NULL REFERENCES users(id),
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
    total       NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite: user_id + status for "show my pending orders"
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Date range queries: "orders in last 30 days"
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Partial index: only pending orders (tiny, very fast)
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

-- GIN on JSONB: enables fast containment queries on metadata
CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata);

-- Products table
CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    sku         TEXT NOT NULL,
    name        TEXT NOT NULL,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category    TEXT NOT NULL,
    tags        TEXT[] NOT NULL DEFAULT '{}',
    search_vec  TSVECTOR GENERATED ALWAYS AS
                    (to_tsvector('english', name || ' ' || category)) STORED,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_tags ON products USING GIN(tags);         -- array contains
CREATE INDEX idx_products_search ON products USING GIN(search_vec); -- full-text search`,
          notes: [
            "gen_random_uuid() requires pgcrypto extension or Postgres 13+",
            "GENERATED ALWAYS AS keeps search_vec in sync automatically — no trigger needed",
            "Partial indexes are invisible to queries that don't match the WHERE clause",
            "GIN indexes support @> (contains), && (overlaps), @@ (text search) operators",
          ]
        },
        {
          title: "EXPLAIN ANALYZE Walkthrough",
          lang: "sql",
          filename: "explain_analyze.sql",
          desc: "Read and interpret query plans. Learn to spot sequential scans, bad row estimates, and disk I/O.",
          code: `-- The query we want to optimize
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    u.email,
    COUNT(o.id)          AS order_count,
    SUM(o.total)         AS lifetime_value
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
--   Buffers: shared hit=1240 read=3892           ← "read" means disk I/O
--
--   ->  Index Scan using idx_orders_user_status  ← ✅ index used
--         on orders o
--         Index Cond: (status = 'completed')
--         Filter: (created_at > ...)
--         Rows Removed by Filter: 45820          ← ⚠️  filtering many rows
--         Buffers: shared hit=200 read=3800       ← mostly disk
--
--   ->  Hash (actual rows=9200)
--         ->  Seq Scan on users u                ← ⚠️  full table scan
--               Filter: (tier = 'pro')
--               Rows Removed by Filter: 190800   ← filtered 190k rows!
--
-- Execution Time: 87.619 ms

-- Fix 1: Add index for the status + created_at combo
CREATE INDEX idx_orders_status_created
    ON orders(status, created_at DESC);

-- Fix 2: Add index for user tier filter
CREATE INDEX idx_users_tier ON users(tier) WHERE tier IN ('pro', 'enterprise');

-- Covering index: avoids heap fetch for the JOIN column
CREATE INDEX idx_orders_user_status_covering
    ON orders(user_id, status, created_at DESC)
    INCLUDE (total);   -- total is in SELECT — now fully index-only scan

-- After indexes, re-run EXPLAIN to verify:
-- "Index Only Scan" and "Buffers: shared hit=X read=0" (no disk reads)
-- Execution time should drop from 87ms → 2-5ms`,
          notes: [
            "shared hit = served from Postgres shared buffer cache (fast)",
            "shared read = fetched from disk (slow — increase shared_buffers if frequent)",
            "Rows Removed by Filter: N — if N is huge compared to actual rows, add an index",
            "cost= is estimated (arbitrary units). actual time= is real milliseconds",
          ]
        },
        {
          title: "Window Functions for Analytics",
          lang: "sql",
          filename: "window_functions.sql",
          desc: "Window functions run calculations across related rows without collapsing them. Essential for ranking, running totals, and cohort analysis.",
          code: `-- Running total per user (without losing individual rows)
SELECT
    user_id,
    created_at,
    total,
    SUM(total) OVER (
        PARTITION BY user_id          -- restart sum for each user
        ORDER BY created_at           -- cumulative
        ROWS UNBOUNDED PRECEDING      -- from start of partition to current row
    ) AS running_total,

    -- Rank orders by value per user
    RANK() OVER (PARTITION BY user_id ORDER BY total DESC) AS order_rank,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS nth_order,

    -- Previous and next order values
    LAG(total, 1)  OVER (PARTITION BY user_id ORDER BY created_at) AS prev_order_total,
    LEAD(total, 1) OVER (PARTITION BY user_id ORDER BY created_at) AS next_order_total,

    -- 7-day moving average
    AVG(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW  -- 7-row sliding window
    ) AS moving_avg_7
FROM orders
WHERE status = 'completed'
ORDER BY user_id, created_at;

-- Find each user's most valuable order (no subquery needed)
SELECT DISTINCT ON (user_id)
    user_id,
    id AS order_id,
    total,
    created_at
FROM orders
WHERE status = 'completed'
ORDER BY user_id, total DESC;   -- DISTINCT ON keeps first row per user_id`,
          notes: [
            "PARTITION BY is like GROUP BY but doesn't collapse rows",
            "RANK() leaves gaps (1,1,3); ROW_NUMBER() never gaps; DENSE_RANK() no gaps",
            "Window functions run AFTER WHERE/GROUP BY but BEFORE ORDER BY/LIMIT",
            "DISTINCT ON (Postgres-only) is often faster than a subquery with MAX()",
          ]
        },
        {
          title: "CTEs and Recursive Queries",
          lang: "sql",
          filename: "ctes.sql",
          desc: "CTEs make complex queries readable and enable recursive queries for hierarchical data (org charts, comment threads, category trees).",
          code: `-- CTE: give subqueries readable names
WITH
active_users AS (
    SELECT id, email, tier
    FROM users
    WHERE is_active = true AND created_at > NOW() - INTERVAL '1 year'
),
user_spend AS (
    SELECT
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spend
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
)
SELECT
    u.email,
    u.tier,
    COALESCE(s.order_count, 0) AS orders,
    COALESCE(s.total_spend, 0) AS total_spend
FROM active_users u
LEFT JOIN user_spend s ON s.user_id = u.id
WHERE COALESCE(s.total_spend, 0) > 500
ORDER BY total_spend DESC;

-- Recursive CTE: walk a tree (category hierarchy)
CREATE TABLE categories (
    id        INT PRIMARY KEY,
    parent_id INT REFERENCES categories(id),
    name      TEXT NOT NULL
);

WITH RECURSIVE category_tree AS (
    -- Base case: root categories (no parent)
    SELECT id, name, parent_id, 1 AS depth, name::TEXT AS path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: children of current level
    SELECT
        c.id,
        c.name,
        c.parent_id,
        ct.depth + 1,
        ct.path || ' > ' || c.name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT id, name, depth, path
FROM category_tree
ORDER BY path;`,
          notes: [
            "CTEs are materialized by default in Postgres 12 and earlier (can be forced with MATERIALIZED / NOT MATERIALIZED)",
            "Postgres 12+ makes CTEs inlined by default unless they contain side effects or RECURSIVE",
            "Recursive CTEs need a base case (anchor) + recursive case joined with UNION ALL",
            "Add a depth/limit check to prevent infinite loops in recursive queries",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "sqlalchemy-patterns",
      icon: "🔗",
      title: "SQLAlchemy Async: Models, Sessions, Migrations",
      items: [
        {
          title: "Full Async Setup with Dependency Injection",
          lang: "python",
          filename: "database.py",
          desc: "Production-ready SQLAlchemy async setup with separate read/write engines, health check, and FastAPI dependencies.",
          code: `from sqlalchemy.ext.asyncio import (
    AsyncSession, create_async_engine, async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from contextlib import asynccontextmanager

class Base(DeclarativeBase):
    pass

def make_engine(url: str, pool_size: int = 10):
    return create_async_engine(
        url,
        pool_size=pool_size,
        max_overflow=5,
        pool_timeout=30,
        pool_recycle=1800,    # recycle after 30 min
        pool_pre_ping=True,   # test before use (handles DB restarts)
        echo=False,           # set True to log all SQL in dev
    )

# Two engines: primary for writes, replica for reads
primary_engine = make_engine("postgresql+asyncpg://user:pass@primary:5432/db")
replica_engine  = make_engine("postgresql+asyncpg://user:pass@replica:5432/db", pool_size=20)

WriteSession = async_sessionmaker(primary_engine, expire_on_commit=False)
ReadSession  = async_sessionmaker(replica_engine,  expire_on_commit=False)

# Write DB dependency (commits on success, rolls back on error)
async def get_db() -> AsyncSession:
    async with WriteSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Read-only DB dependency (no commit needed)
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
            "expire_on_commit=False prevents accessing attributes after commit (avoids lazy load errors in async)",
            "pool_pre_ping=True adds ~0.1ms per checkout but avoids 'connection closed' errors after DB restarts",
            "Separate read/write engines let you scale reads independently via replicas",
          ]
        },
        {
          title: "Model Definitions with Relationships",
          lang: "python",
          filename: "models.py",
          desc: "SQLAlchemy 2.0 mapped_column style with typed relationships, JSONB, UUID, and table-level indexes.",
          code: `from __future__ import annotations
from datetime import datetime
from decimal import Decimal
import uuid
from sqlalchemy import (
    String, Numeric, ForeignKey, DateTime, Boolean,
    Integer, Text, Index, CheckConstraint, text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID, ARRAY
from database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_email_active", "email", postgresql_where=text("is_active = true")),
        Index("idx_users_tier", "tier", postgresql_where=text("tier != 'free'")),
    )

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    email:      Mapped[str]      = mapped_column(String(255), unique=True, nullable=False)
    name:       Mapped[str]      = mapped_column(String(255), nullable=False)
    tier:       Mapped[str]      = mapped_column(String(50), nullable=False, server_default="free")
    is_active:  Mapped[bool]     = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))

    orders: Mapped[list[Order]] = relationship("Order", back_populates="user", lazy="raise")

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_orders_user_status", "user_id", "status"),
        Index("idx_orders_created_at", "created_at", postgresql_ops={"created_at": "DESC"}),
        Index("idx_orders_metadata", "metadata", postgresql_using="gin"),
        CheckConstraint("total >= 0", name="ck_orders_total_positive"),
    )

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:    Mapped[int]       = mapped_column(ForeignKey("users.id"), nullable=False)
    status:     Mapped[str]       = mapped_column(String(50), nullable=False, server_default="pending")
    total:      Mapped[Decimal]   = mapped_column(Numeric(12, 2), nullable=False)
    metadata_:  Mapped[dict]      = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'"))
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=text("NOW()"),
                                                   onupdate=datetime.utcnow)

    user:  Mapped[User]            = relationship("User", back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship("OrderItem", back_populates="order", lazy="raise",
                                                   cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id:         Mapped[int]     = mapped_column(Integer, primary_key=True)
    order_id:   Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False)
    product_id: Mapped[int]     = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity:   Mapped[int]     = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped[Order] = relationship("Order", back_populates="items")`,
          notes: [
            "lazy='raise' forces explicit eager loading — prevents accidental N+1 queries in async context",
            "server_default runs in DB (survives app bugs); default runs in Python (faster for non-DB defaults)",
            "UUID primary keys avoid sequential ID enumeration and simplify distributed ID generation",
            "mapped_column with __table_args__ keeps index definitions co-located with the model",
          ]
        },
        {
          title: "Repository Pattern: CRUD + Complex Queries",
          lang: "python",
          filename: "repositories.py",
          desc: "Encapsulate all DB access in a repository class. Keeps routes thin and makes testing easy with mock repositories.",
          code: `from typing import Sequence
from uuid import UUID
from sqlalchemy import select, update, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from models import User, Order, OrderItem
from decimal import Decimal

class OrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, order_id: UUID) -> Order | None:
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items))  # eager-load items in 2 queries
            .where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: int,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[Order]:
        query = select(Order).where(Order.user_id == user_id)
        if status:
            query = query.where(Order.status == status)
        query = query.order_by(Order.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, user_id: int, total: Decimal, items: list[dict]) -> Order:
        order = Order(user_id=user_id, total=total)
        self.db.add(order)
        await self.db.flush()  # get order.id without committing

        for item in items:
            self.db.add(OrderItem(
                order_id=order.id,
                product_id=item["product_id"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
            ))
        await self.db.flush()
        return order

    async def update_status(self, order_id: UUID, new_status: str) -> bool:
        result = await self.db.execute(
            update(Order)
            .where(and_(Order.id == order_id, Order.status != new_status))
            .values(status=new_status)
        )
        return result.rowcount > 0

    async def get_user_stats(self, user_id: int) -> dict:
        result = await self.db.execute(
            select(
                func.count(Order.id).label("total_orders"),
                func.sum(Order.total).label("total_spend"),
                func.max(Order.total).label("largest_order"),
            )
            .where(and_(Order.user_id == user_id, Order.status == "completed"))
        )
        row = result.one()
        return {
            "total_orders": row.total_orders or 0,
            "total_spend": float(row.total_spend or 0),
            "largest_order": float(row.largest_order or 0),
        }

# Usage in FastAPI route
from fastapi import Depends
from database import get_db

@app.post("/orders")
async def create_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    repo = OrderRepository(db)
    order = await repo.create(
        user_id=payload.user_id,
        total=payload.total,
        items=payload.items,
    )
    return {"order_id": str(order.id)}`,
          notes: [
            "selectinload() executes 2 queries (parent + children in IN clause) — better than joinedload for collections",
            "joinedload() uses a JOIN — better for single related objects (many-to-one)",
            "flush() sends SQL to DB within the transaction but doesn't commit — good for getting auto-generated IDs",
            "Repository pattern decouples business logic from DB implementation",
          ]
        },
        {
          title: "Alembic Migration: Add Column + Index",
          lang: "python",
          filename: "migrations/versions/001_add_refund_columns.py",
          desc: "Real Alembic migration with data backfill, concurrent index creation, and safe rollback.",
          code: `"""Add refunded_at and refund_reason columns to orders

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
    # Step 1: Add nullable columns (safe — no table lock)
    op.add_column('orders',
        sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column('orders',
        sa.Column('refund_reason', sa.Text, nullable=True)
    )

    # Step 2: Backfill data (before adding NOT NULL constraint)
    op.execute("""
        UPDATE orders
        SET refunded_at = updated_at,
            refund_reason = 'Legacy refund'
        WHERE status = 'refunded'
          AND refunded_at IS NULL
    """)

    # Step 3: Partial index on refunded orders (CONCURRENTLY = no lock)
    # Note: can't run CONCURRENTLY inside a transaction — use raw connection
    connection = op.get_bind()
    connection.execute(sa.text(
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_refunded_at "
        "ON orders(refunded_at) WHERE status = 'refunded'"
    ))

def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text("DROP INDEX CONCURRENTLY IF EXISTS idx_orders_refunded_at"))
    op.drop_column('orders', 'refund_reason')
    op.drop_column('orders', 'refunded_at')`,
          notes: [
            "CREATE INDEX CONCURRENTLY doesn't lock the table for reads/writes — safe for production",
            "CONCURRENTLY can't run inside a transaction — access raw connection via op.get_bind()",
            "Always backfill before adding NOT NULL constraints to avoid locking full table scan",
            "Alembic autogenerate misses partial indexes, CHECK constraints — always review generated migrations",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "redis-patterns-code",
      icon: "⚡",
      title: "Redis: Caching, Rate Limiting, Locks, Pub/Sub",
      items: [
        {
          title: "Cache Layer for FastAPI",
          lang: "python",
          filename: "cache.py",
          desc: "Decorator-based caching with automatic serialization, TTL, and cache invalidation for FastAPI routes.",
          code: `import json
import hashlib
import functools
from typing import Any, Callable
import redis.asyncio as redis
from fastapi import Request

r = redis.from_url("redis://localhost:6379", decode_responses=True)

def cache(ttl: int = 300, key_prefix: str = ""):
    """Decorator: cache async function results in Redis."""
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key from function name + args
            cache_parts = [key_prefix or func.__name__]
            cache_parts.extend(str(a) for a in args if not hasattr(a, '__dict__'))
            cache_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(cache_parts)

            # Check cache
            cached = await r.get(cache_key)
            if cached is not None:
                return json.loads(cached)

            # Call function and cache result
            result = await func(*args, **kwargs)
            if result is not None:
                await r.setex(cache_key, ttl, json.dumps(result, default=str))
            return result
        return wrapper
    return decorator

# Cache invalidation: delete all keys matching a pattern
async def invalidate_pattern(pattern: str):
    cursor = 0
    while True:
        cursor, keys = await r.scan(cursor, match=pattern, count=100)
        if keys:
            await r.delete(*keys)
        if cursor == 0:
            break

# Usage
@cache(ttl=60, key_prefix="product")
async def get_product_cached(product_id: int) -> dict | None:
    # Called only on cache miss
    async with AsyncSessionLocal() as db:
        product = await db.get(Product, product_id)
        if not product:
            return None
        return {"id": product.id, "name": product.name, "price": float(product.price)}

# After updating a product:
async def update_product(product_id: int, updates: dict):
    # ... update DB ...
    await invalidate_pattern(f"product:{product_id}*")

# Per-request caching in a FastAPI dependency
async def get_cache(request: Request) -> redis.Redis:
    return r  # could be request-scoped if needed`,
          notes: [
            "Use json.dumps(default=str) to handle datetime and Decimal serialization",
            "SCAN is safe for production (non-blocking). Never use KEYS * in production (blocks Redis)",
            "Cache keys should include version suffix when you change data shape: product:v2:{id}",
            "Consider msgpack instead of JSON for ~2x faster serialization of large payloads",
          ]
        },
        {
          title: "Rate Limiter Middleware",
          lang: "python",
          filename: "middleware/rate_limit.py",
          desc: "Sliding window rate limiter using Redis sorted sets. Applied as FastAPI middleware with per-user and per-IP limits.",
          code: `import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis

r = redis.from_url("redis://localhost:6379")

# Sliding window algorithm using sorted set
# Score = timestamp, Member = unique request ID
SLIDING_WINDOW_SCRIPT = """
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
    return {1, limit - count - 1}   -- {allowed, remaining}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local reset_at = tonumber(oldest[2]) + window
    return {0, 0, reset_at}          -- {denied, remaining, reset_at}
end
"""

async def check_rate_limit(
    key: str,
    limit: int = 100,
    window: int = 60,
) -> tuple[bool, dict]:
    now = time.time()
    req_id = str(uuid.uuid4())

    result = await r.eval(SLIDING_WINDOW_SCRIPT, 1, key, now, window, limit, req_id)
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
        # Skip health checks
        if request.url.path in {"/health", "/metrics"}:
            return await call_next(request)

        # Use authenticated user ID if available, else IP
        user_id = getattr(request.state, "user_id", None)
        identifier = f"user:{user_id}" if user_id else f"ip:{request.client.host}"

        # Different limits by endpoint type
        if request.url.path.startswith("/api/v1/inference"):
            limit, window = 10, 60    # 10 AI calls per minute
        else:
            limit, window = 100, 60   # 100 general calls per minute

        allowed, headers = await check_rate_limit(
            key=f"ratelimit:{identifier}:{request.url.path.split('/')[3] if len(request.url.path.split('/')) > 3 else 'general'}",
            limit=limit,
            window=window,
        )

        if not allowed:
            return Response(
                content='{"detail": "Rate limit exceeded"}',
                status_code=429,
                headers={**headers, "Content-Type": "application/json"},
            )

        response = await call_next(request)
        response.headers.update(headers)
        return response`,
          notes: [
            "Sliding window is more accurate than fixed window — no burst at window boundary",
            "ZREMRANGEBYSCORE removes expired entries first, keeping memory bounded",
            "Return remaining count and reset time in headers (standard RFC 6585 practice)",
            "Per-endpoint limits let you protect expensive AI routes more aggressively",
          ]
        },
        {
          title: "Distributed Lock with Retry",
          lang: "python",
          filename: "locking.py",
          desc: "Production-ready distributed lock with automatic expiry, ownership verification via Lua, and exponential backoff retry.",
          code: `import asyncio
import uuid
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import redis.asyncio as redis

r = redis.from_url("redis://localhost:6379")

# Atomic release: only delete if WE own the lock (prevents releasing another's lock)
_RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

# Atomic extend: extend TTL only if we still own the lock
_EXTEND_SCRIPT = """
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
    """
    Acquire a distributed lock with retry and exponential backoff.
    Raises LockNotAcquired if lock cannot be obtained.
    """
    lock_key = f"lock:{resource}"
    lock_token = str(uuid.uuid4())

    # Attempt to acquire with retries
    acquired = False
    for attempt in range(retry_times):
        acquired = await r.set(lock_key, lock_token, nx=True, ex=ttl_seconds)
        if acquired:
            break
        if attempt < retry_times - 1:
            # Exponential backoff with jitter
            delay = retry_delay * (2 ** attempt) + (time.time() % 0.05)
            await asyncio.sleep(delay)

    if not acquired:
        raise LockNotAcquired(f"Could not acquire lock for '{resource}' after {retry_times} attempts")

    try:
        yield lock_token
    finally:
        released = await r.eval(_RELEASE_SCRIPT, 1, lock_key, lock_token)
        # released == 0 means lock expired while we held it — log a warning!

# Usage: prevent duplicate payment processing
async def process_payment(payment_id: str, amount: float) -> dict:
    try:
        async with distributed_lock(f"payment:{payment_id}", ttl_seconds=60):
            # Check idempotency key first
            if await r.exists(f"processed:{payment_id}"):
                return {"status": "already_processed"}

            # Process payment (exactly once)
            result = await charge_card(payment_id, amount)

            # Mark as processed (expires in 24h for idempotency window)
            await r.setex(f"processed:{payment_id}", 86400, "1")

            return {"status": "success", "result": result}

    except LockNotAcquired:
        return {"status": "already_processing", "retry_after": 5}`,
          notes: [
            "The Lua script is critical — without it, two workers could both release each other's locks",
            "TTL must be longer than the work inside — if work takes 30s, set TTL to 60+",
            "If lock expires while holding it, another worker may start the same task — design for idempotency",
            "For multi-node Redis HA, use Redlock algorithm (requires N/2+1 locks across N nodes)",
          ]
        },
        {
          title: "Session Store and Leaderboard",
          lang: "python",
          filename: "redis_use_cases.py",
          desc: "Two complete Redis use cases: JWT session storage with refresh tokens, and a real-time game leaderboard.",
          code: `import json
import uuid
from datetime import datetime, timedelta
import redis.asyncio as redis

r = redis.from_url("redis://localhost:6379", decode_responses=True)

# ── Session Store ──────────────────────────────────────────────────────────

async def create_session(user_id: int, user_data: dict) -> str:
    """Create a session, return session token."""
    session_id = str(uuid.uuid4())
    session_key = f"session:{session_id}"

    await r.hset(session_key, mapping={
        "user_id": str(user_id),
        "email": user_data["email"],
        "tier": user_data.get("tier", "free"),
        "created_at": datetime.utcnow().isoformat(),
    })
    await r.expire(session_key, 3600 * 24 * 7)  # 7 days

    # Track all sessions for a user (for "log out all devices")
    await r.sadd(f"user:{user_id}:sessions", session_id)

    return session_id

async def get_session(session_id: str) -> dict | None:
    session_key = f"session:{session_id}"
    data = await r.hgetall(session_key)
    if not data:
        return None
    # Extend session on activity (sliding expiry)
    await r.expire(session_key, 3600 * 24 * 7)
    return data

async def delete_all_sessions(user_id: int):
    """Log out from all devices."""
    session_ids = await r.smembers(f"user:{user_id}:sessions")
    if session_ids:
        pipe = r.pipeline()
        for sid in session_ids:
            pipe.delete(f"session:{sid}")
        pipe.delete(f"user:{user_id}:sessions")
        await pipe.execute()

# ── Real-time Leaderboard ──────────────────────────────────────────────────

LEADERBOARD_KEY = "leaderboard:global"

async def add_score(user_id: str, points: float) -> float:
    """Add points to a user's score. Returns new total score."""
    new_score = await r.zincrby(LEADERBOARD_KEY, points, user_id)
    return new_score

async def get_rank(user_id: str) -> int | None:
    """Get 1-based rank (lower rank = higher score)."""
    rank = await r.zrevrank(LEADERBOARD_KEY, user_id)  # 0-indexed
    return rank + 1 if rank is not None else None

async def get_top_players(n: int = 10) -> list[dict]:
    """Get top N players with scores."""
    results = await r.zrevrange(LEADERBOARD_KEY, 0, n - 1, withscores=True)
    return [{"user_id": uid, "score": score, "rank": i + 1}
            for i, (uid, score) in enumerate(results)]

async def get_player_context(user_id: str, window: int = 5) -> list[dict]:
    """Get N players above and below a given user (for 'you are rank 47')."""
    rank_0 = await r.zrevrank(LEADERBOARD_KEY, user_id)
    if rank_0 is None:
        return []
    start = max(0, rank_0 - window)
    end = rank_0 + window
    results = await r.zrevrange(LEADERBOARD_KEY, start, end, withscores=True)
    return [{"user_id": uid, "score": score, "rank": start + i + 1}
            for i, (uid, score) in enumerate(results)]`,
          notes: [
            "HSET + EXPIRE is not atomic — use a pipeline or consider Lua if you need both in one transaction",
            "Sorted sets keep members ordered by score automatically — O(log N) for ZADD/ZRANK",
            "ZREVRANGE returns highest scores first (desc); ZRANGE returns lowest first (asc)",
            "For leaderboard resets (weekly), use a key with the week number: leaderboard:2024-w07",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "mongodb-code",
      icon: "🍃",
      title: "MongoDB: ODM, Aggregation, Atlas Search",
      items: [
        {
          title: "Motor + Beanie ODM Setup",
          lang: "python",
          filename: "mongodb_setup.py",
          desc: "Async MongoDB with Motor driver and Beanie ODM (Pydantic-based document models for FastAPI).",
          code: `from beanie import Document, Indexed, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import EmailStr, Field
from datetime import datetime
from typing import Optional
import uuid

# ── Document Models (like SQLAlchemy models but for MongoDB) ────────────────

class UserProfile(Document):
    """Embedded document — not a top-level collection."""
    name: str
    tier: str = "free"
    joined: datetime = Field(default_factory=datetime.utcnow)

class Order(Document):
    """Embedded in User — no separate collection needed."""
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total: float
    status: str = "pending"
    items: list[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "orders"   # collection name

class User(Document):
    email: Indexed(EmailStr, unique=True)     # creates unique index
    profile: UserProfile
    recent_orders: list[Order] = []           # embedded (last N orders)
    tags: list[str] = []
    metadata: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

    class Settings:
        name = "users"
        indexes = [
            [("profile.tier", 1)],                    # single field
            [("created_at", -1)],                     # descending
            [("tags", "text"), ("profile.name", "text")],  # text search
        ]

# ── Initialization ─────────────────────────────────────────────────────────

async def init_db():
    client = AsyncIOMotorClient(
        "mongodb://localhost:27017",
        maxPoolSize=10,
        minPoolSize=2,
        serverSelectionTimeoutMS=5000,
    )
    await init_beanie(
        database=client["myapp"],
        document_models=[User],
    )

# ── FastAPI lifespan ───────────────────────────────────────────────────────
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)`,
          notes: [
            "Beanie wraps Motor (async MongoDB driver) with Pydantic models — similar to SQLAlchemy + ORM",
            "Embedded documents avoid JOINs but make it harder to query across embedded data",
            "Use separate collections when: data is large, queried independently, or updated frequently",
            "Indexed() in Beanie creates the index automatically on startup",
          ]
        },
        {
          title: "Aggregation Pipeline: Log Analytics",
          lang: "python",
          filename: "log_analytics.py",
          desc: "Real log analytics pipeline using Motor directly — hourly error rates, top error types, user impact analysis.",
          code: `from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta

async def hourly_error_rate(db: AsyncIOMotorDatabase, hours: int = 24) -> list[dict]:
    """Count errors by hour for the last N hours."""
    since = datetime.utcnow() - timedelta(hours=hours)
    pipeline = [
        { "$match": {
            "timestamp": { "$gte": since },
            "level": { "$in": ["ERROR", "CRITICAL"] }
        }},
        { "$group": {
            "_id": {
                "year":   { "$year": "$timestamp" },
                "month":  { "$month": "$timestamp" },
                "day":    { "$dayOfMonth": "$timestamp" },
                "hour":   { "$hour": "$timestamp" },
                "level":  "$level",
            },
            "count":          { "$sum": 1 },
            "affected_users": { "$addToSet": "$user_id" },
            "services":       { "$addToSet": "$service" },
            "sample_message": { "$first": "$message" },
        }},
        { "$addFields": {
            "affected_user_count": { "$size": "$affected_users" },
            "hour_str": {
                "$dateToString": {
                    "format": "%Y-%m-%dT%H:00:00Z",
                    "date": {
                        "$dateFromParts": {
                            "year": "$_id.year", "month": "$_id.month",
                            "day": "$_id.day", "hour": "$_id.hour"
                        }
                    }
                }
            }
        }},
        { "$project": { "affected_users": 0 } },  # remove large set field
        { "$sort": { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
    ]

    result = await db["logs"].aggregate(pipeline).to_list(length=hours * 5)
    return result

async def top_errors(db: AsyncIOMotorDatabase, limit: int = 10) -> list[dict]:
    """Top error types in last 24 hours with example stack trace."""
    since = datetime.utcnow() - timedelta(hours=24)
    pipeline = [
        { "$match": { "timestamp": { "$gte": since }, "level": "ERROR" } },
        { "$group": {
            "_id": "$error_type",
            "count":      { "$sum": 1 },
            "first_seen": { "$min": "$timestamp" },
            "last_seen":  { "$max": "$timestamp" },
            "services":   { "$addToSet": "$service" },
            "example":    { "$first": "$stack_trace" },
        }},
        { "$sort": { "count": -1 } },
        { "$limit": limit },
        { "$project": {
            "error_type": "$_id",
            "count": 1,
            "first_seen": 1,
            "last_seen": 1,
            "services": 1,
            "example": 1,
            "_id": 0
        }}
    ]
    return await db["logs"].aggregate(pipeline).to_list(length=limit)`,
          notes: [
            "Put $match first (and on indexed fields) — MongoDB can use the index before processing",
            "$addToSet accumulates unique values into an array — remove with $project after computing $size",
            "$first/$last are useful for getting one representative document from each group",
            "to_list(length=N) materializes the cursor — for large results, iterate the cursor instead",
          ]
        },
        {
          title: "Atlas Search / Full-Text Search",
          lang: "javascript",
          filename: "atlas_search.js",
          desc: "MongoDB Atlas Search pipelines for full-text search with facets, highlighting, and fuzzy matching.",
          code: `// Atlas Search requires a Search Index defined in Atlas UI or CLI
// Index definition (atlas_search_index.json):
// {
//   "mappings": {
//     "dynamic": false,
//     "fields": {
//       "title": [{ "type": "string", "analyzer": "lucene.english" }],
//       "body":  [{ "type": "string", "analyzer": "lucene.english" }],
//       "tags":  [{ "type": "string" }],
//       "price": [{ "type": "number" }],
//       "category": [{ "type": "stringFacet" }]
//     }
//   }
// }

// Full-text search with facets and highlighting
db.products.aggregate([
  { $search: {
    index: "product_search",
    compound: {
      must: [{
        text: {
          query: "wireless mechanical keyboard",
          path: ["title", "body"],
          fuzzy: { maxEdits: 1 },     // handles typos
          score: { boost: { value: 2 } }  // title matches weighted higher
        }
      }],
      filter: [{
        range: { path: "price", gte: 50, lte: 500 }
      }]
    },
    highlight: {
      path: ["title", "body"],
      maxCharsToExamine: 500,
      maxNumPassages: 2
    },
    count: { type: "total" }  // total matching docs (for pagination)
  }},

  // Facet stage: category counts alongside results
  { $facet: {
    results: [
      { $limit: 20 },
      { $project: {
        title: 1, price: 1, category: 1,
        score: { $meta: "searchScore" },
        highlights: { $meta: "searchHighlights" }
      }}
    ],
    categories: [
      { $searchMeta: {           // aggregate counts without fetching docs
        facet: {
          operator: { exists: { path: "category" } },
          facets: {
            categoryFacet: { type: "string", path: "category", numBuckets: 10 }
          }
        }
      }}
    ]
  }}
]);`,
          notes: [
            "Atlas Search is built on Apache Lucene — same engine as Elasticsearch",
            "fuzzy maxEdits: 1 handles single-character typos; 2 allows more but is slower",
            "$facet runs multiple sub-pipelines on the same input documents in one pass",
            "For self-hosted MongoDB, use $text search (simpler but less powerful than Atlas Search)",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
