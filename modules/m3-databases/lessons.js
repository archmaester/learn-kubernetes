// Patches the Databases module (m3) with full tutorial lesson content.
// Loaded after curriculum.js and db-examples.js.
// COMPLETE REWRITE — 10 lessons building from zero to Staff-level depth.
(function patchDatabaseLessons() {
  const m = CURRICULUM.phases[0].modules[2]; // phase-1, third module (m3)

  m.presentation = "modules/m3-databases/presentation.html";

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1: Why Databases Matter
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "why-databases-matter",
      title: "Why Databases Matter — Choosing the Right Tool for the Job",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Every production system you build has data at its core. User accounts, orders, ML model predictions, feature vectors, session tokens, event logs — all of it lives in databases. The difference between a junior and a senior engineer is not knowing <em>how</em> to query a database. It's knowing <em>which</em> database to pick, <em>why</em>, and understanding the trade-offs you're making."
        },
        {
          type: "text",
          text: "In this module, we'll cover three databases that appear in nearly every production backend: <strong>PostgreSQL</strong> (relational, ACID-compliant, your source of truth), <strong>MongoDB</strong> (document store, flexible schema, great for event data and catalogs), and <strong>Redis</strong> (in-memory, sub-millisecond, your caching and coordination layer). By the end, you'll know when to use each, how to use them well, and how they work together in real systems."
        },
        {
          type: "heading",
          text: "The Data Layer Problem",
          level: 2
        },
        {
          type: "text",
          text: "Let's say you're building an AI-powered e-commerce platform. You need to store user profiles, orders with line items, product catalogs, ML feature vectors for recommendations, user sessions, rate-limiting counters, real-time analytics events, and search indexes. No single database handles all of these well."
        },
        {
          type: "text",
          text: "This is the <strong>polyglot persistence</strong> reality of modern backends. Each database type has strengths shaped by its data model, storage engine, consistency guarantees, and query capabilities. Choosing wrong means either fighting the tool constantly or discovering at scale that your data layer can't keep up."
        },
        {
          type: "heading",
          text: "SQL vs NoSQL: The Real Decision Tree",
          level: 2
        },
        {
          type: "text",
          text: "The SQL vs NoSQL debate is often framed as relational vs non-relational. That framing is wrong. The real question is: <strong>what guarantees do you need, and what shape is your data?</strong>"
        },
        {
          type: "comparison",
          headers: ["Question", "If Yes → SQL (PostgreSQL)", "If Yes → NoSQL"],
          rows: [
            ["Do you need transactions across multiple tables?", "ACID transactions with BEGIN/COMMIT", "MongoDB has multi-doc transactions (slower), Redis has none"],
            ["Is your schema well-defined and stable?", "Relational schema with constraints", "Document store if schema varies per record"],
            ["Do you need complex JOINs and aggregations?", "SQL excels at multi-table joins", "MongoDB aggregation works but is more verbose"],
            ["Is your data deeply nested or varies per record?", "JSONB column for semi-structured parts", "MongoDB's native document model is more natural"],
            ["Do you need sub-millisecond reads?", "Not without caching", "Redis in-memory store"],
            ["Will you shard across many nodes?", "Postgres sharding is complex (Citus)", "MongoDB has native sharding built in"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "The Pragmatic Default",
          text: "Start with PostgreSQL for everything until you have a specific reason not to. Postgres handles relational data, JSONB documents, full-text search, and even vector embeddings (pgvector). Add Redis when you need caching or coordination. Add MongoDB only when you genuinely have document-shaped data that doesn't fit a relational model — event logs, content management, catalogs with wildly different attributes per product."
        },
        {
          type: "heading",
          text: "ACID vs BASE: Two Consistency Models",
          level: 2
        },
        {
          type: "text",
          text: "These are the two philosophies that underpin all database design decisions. Understanding them is essential for system design interviews."
        },
        {
          type: "comparison",
          headers: ["Property", "ACID (PostgreSQL)", "BASE (NoSQL systems)"],
          rows: [
            ["Atomicity", "All or nothing — transaction fully completes or fully rolls back", "Operations may partially complete"],
            ["Consistency", "DB always moves from one valid state to another", "Basically Available — system stays up"],
            ["Isolation", "Concurrent transactions don't interfere", "Soft state — data may be temporarily inconsistent"],
            ["Durability", "Committed data survives crashes", "Eventually consistent — converges over time"],
          ]
        },
        {
          type: "text",
          text: "ACID is a contract: the database guarantees your data is always correct, even during crashes and concurrent access. The cost is performance — maintaining these guarantees requires locking, write-ahead logs, and synchronization."
        },
        {
          type: "text",
          text: "BASE trades correctness for availability and speed. A shopping cart in DynamoDB might show slightly stale data for a few hundred milliseconds — but the system never goes down and handles millions of writes per second. For an inventory count that must never oversell, you need ACID. For a user activity feed, BASE is fine."
        },
        {
          type: "heading",
          text: "The Three Databases We'll Master",
          level: 2
        },
        {
          type: "diagram",
          title: "Database Architecture in a Typical AI Backend",
          content: `  ┌──────────────────────────────────────────────────────────────┐
  │                      Application Layer                      │
  │              FastAPI / Background Workers / ML Pipeline      │
  └─────┬──────────────┬────────────────────┬──────────────────┘
        │              │                    │
        ▼              ▼                    ▼
  ┌───────────┐  ┌───────────┐      ┌───────────┐
  │ PostgreSQL│  │  MongoDB  │      │   Redis   │
  │           │  │           │      │           │
  │ • Users   │  │ • Events  │      │ • Cache   │
  │ • Orders  │  │ • Logs    │      │ • Sessions│
  │ • Products│  │ • Catalog │      │ • Locks   │
  │ • Features│  │ • Content │      │ • Counters│
  │ • Vectors │  │ • Metrics │      │ • Pub/Sub │
  │           │  │           │      │ • Queues  │
  │ Source of │  │ Flexible  │      │ In-memory │
  │ truth     │  │ schema    │      │ speed     │
  │ ACID      │  │ Horizontal│      │ Ephemeral │
  │ Relational│  │ scale     │      │ data      │
  └───────────┘  └───────────┘      └───────────┘`
        },
        {
          type: "heading",
          text: "PostgreSQL — Your Source of Truth",
          level: 3
        },
        {
          type: "text",
          text: "PostgreSQL is a 35-year-old project that keeps getting better. It handles OLTP (transactional workloads) brilliantly, supports advanced features like JSONB, full-text search, window functions, recursive CTEs, and has an extension ecosystem that includes pgvector for AI embeddings. Most importantly, it has rock-solid ACID compliance. When data <em>must</em> be correct — user balances, order totals, inventory counts — Postgres is the answer."
        },
        {
          type: "heading",
          text: "MongoDB — Flexible Document Storage",
          level: 3
        },
        {
          type: "text",
          text: "MongoDB stores data as BSON documents (binary JSON). Each document can have a different structure, which makes it natural for event logs, content management systems, and product catalogs where attributes vary wildly. It has built-in sharding for horizontal scale and a powerful aggregation pipeline. Since v4.0, it supports multi-document transactions, narrowing the gap with SQL databases."
        },
        {
          type: "heading",
          text: "Redis — In-Memory Speed Layer",
          level: 3
        },
        {
          type: "text",
          text: "Redis is not just a cache. It's an in-memory data structure server that supports strings, lists, sets, sorted sets, hashes, streams, and HyperLogLog. With sub-millisecond latency, it's perfect for caching, session storage, rate limiting, distributed locks, real-time leaderboards, and pub/sub messaging. It's the coordination fabric that ties your other databases together."
        },
        {
          type: "heading",
          text: "What This Module Covers",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Lessons 2-5</strong>: PostgreSQL deep dive — internals (MVCC, WAL, VACUUM), transactions & isolation, indexes & query optimization, advanced SQL",
            "<strong>Lesson 6</strong>: SQLAlchemy async ORM + Alembic migrations — the Python layer on top of Postgres",
            "<strong>Lesson 7</strong>: Connection pooling & replication — scaling reads and surviving failures",
            "<strong>Lesson 8</strong>: MongoDB — document model, aggregation pipeline, Atlas Search",
            "<strong>Lesson 9</strong>: Redis — data structures, caching, locks, rate limiting, pub/sub",
            "<strong>Lesson 10</strong>: System design — multi-database architectures, sharding, CQRS, real-world patterns",
          ]
        },
        {
          type: "callout",
          variant: "info",
          title: "Interview Relevance",
          text: "Database knowledge is tested in every backend interview. Expect questions on: ACID vs BASE, isolation levels, index types, query optimization, caching strategies, and system design questions where you choose between databases. We'll prepare you for all of these."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2: PostgreSQL Internals
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "postgresql-internals",
      title: "PostgreSQL Internals — How Postgres Actually Works",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "You can use Postgres for years without understanding its internals — until something goes wrong. A query that used to take 5ms now takes 5 seconds. Disk usage doubles overnight. Autovacuum is consuming all your I/O. Understanding how Postgres stores and retrieves data turns these mysteries into diagnosable problems."
        },
        {
          type: "heading",
          text: "Architecture Overview",
          level: 2
        },
        {
          type: "text",
          text: "PostgreSQL uses a <strong>process-per-connection</strong> model. When a client connects, the postmaster process forks a new backend process to handle that connection. This is simple and robust — a crash in one backend doesn't affect others — but it means each connection costs about 5-10 MB of memory. That's why connection pooling matters (Lesson 7)."
        },
        {
          type: "diagram",
          title: "PostgreSQL Process Architecture",
          content: `  Client Connections
  ┌────┐ ┌────┐ ┌────┐
  │App1│ │App2│ │App3│
  └──┬─┘ └──┬─┘ └──┬─┘
     │      │      │
     ▼      ▼      ▼
  ┌──────────────────────────────────────┐
  │          Postmaster (PID 1)          │
  │   Forks a backend per connection     │
  └──┬──────────┬──────────┬────────────┘
     │          │          │
     ▼          ▼          ▼
  ┌──────┐  ┌──────┐  ┌──────┐    Background Workers:
  │Back- │  │Back- │  │Back- │    ┌─────────────────┐
  │end 1 │  │end 2 │  │end 3 │    │ WAL Writer      │
  └──┬───┘  └──┬───┘  └──┬───┘    │ Checkpointer    │
     │         │         │         │ Autovacuum      │
     └─────────┴─────────┘         │ BG Writer       │
              │                    │ Stats Collector  │
              ▼                    └─────────────────┘
  ┌──────────────────────┐
  │   Shared Memory      │
  │  ┌────────────────┐  │
  │  │ Shared Buffers  │  │    ← pages cached in RAM
  │  │ (default 128MB) │  │
  │  ├────────────────┤  │
  │  │ WAL Buffers     │  │    ← write-ahead log buffer
  │  ├────────────────┤  │
  │  │ Lock Tables     │  │    ← row/table lock state
  │  └────────────────┘  │
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │     Disk (pgdata)    │
  │  base/ → table files │
  │  pg_wal/ → WAL segs  │
  │  pg_xact/ → tx state │
  └──────────────────────┘`
        },
        {
          type: "heading",
          text: "Heap Storage: How Tables Are Stored on Disk",
          level: 2
        },
        {
          type: "text",
          text: "A PostgreSQL table is stored as a collection of 8 KB <strong>pages</strong> (also called blocks). Each page contains a header, an array of item pointers, and the actual tuple (row) data growing from the end of the page toward the pointers. When you INSERT a row, Postgres finds a page with enough free space and appends the tuple."
        },
        {
          type: "diagram",
          title: "PostgreSQL Page Layout (8 KB)",
          content: `  ┌──────────────────────────────────────┐  Byte 0
  │          Page Header (24 bytes)      │
  │  pd_lsn, pd_flags, pd_lower,        │
  │  pd_upper, pd_special                │
  ├──────────────────────────────────────┤
  │  Item Pointer 1  →  offset to Tuple 1│
  │  Item Pointer 2  →  offset to Tuple 2│
  │  Item Pointer 3  →  offset to Tuple 3│
  │  ... (grows downward)                │
  ├──────────────────────────────────────┤  pd_lower
  │                                      │
  │          Free Space                  │
  │                                      │
  ├──────────────────────────────────────┤  pd_upper
  │  Tuple 3 (newest)                    │
  │  Tuple 2                             │
  │  Tuple 1 (oldest)                    │
  │  ... (tuples grow upward)            │
  └──────────────────────────────────────┘  Byte 8191`
        },
        {
          type: "text",
          text: "Each tuple has a header containing the transaction IDs that created and deleted it (<code>xmin</code> and <code>xmax</code>), null bitmap, and data columns. This per-row versioning information is how MVCC works."
        },
        {
          type: "heading",
          text: "MVCC: Multi-Version Concurrency Control",
          level: 2
        },
        {
          type: "text",
          text: "This is the most important concept in PostgreSQL internals. MVCC is how Postgres handles concurrent reads and writes without readers blocking writers or writers blocking readers."
        },
        {
          type: "text",
          text: "The key idea: <strong>Postgres never overwrites data in place.</strong> When you UPDATE a row, Postgres doesn't modify the existing tuple. Instead, it marks the old tuple as deleted (sets <code>xmax</code>) and inserts a <em>new</em> tuple with the updated values. Both the old and new versions coexist on disk. Each transaction sees only the version that was valid at the time it started."
        },
        {
          type: "code",
          lang: "sql",
          filename: "mvcc_demo.sql",
          code: `-- Session 1: Start a long-running transaction
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;  -- Returns 1000

-- Session 2: Update the same row (this creates a NEW tuple)
UPDATE accounts SET balance = 800 WHERE id = 1;
COMMIT;

-- Session 1: Read again — still sees 1000!
-- Why? Session 1's snapshot was taken at BEGIN.
-- The old tuple (balance=1000) still exists on disk.
-- Session 1 can see it because its xmin < session 1's snapshot.
SELECT balance FROM accounts WHERE id = 1;  -- Still 1000

COMMIT;

-- Now after committing, a new SELECT sees 800.
SELECT balance FROM accounts WHERE id = 1;  -- 800

-- The old tuple (balance=1000) is now "dead" —
-- no active transaction can see it anymore.
-- VACUUM will eventually reclaim this space.`
        },
        {
          type: "callout",
          variant: "warning",
          title: "MVCC Means Dead Tuples Accumulate",
          text: "Every UPDATE creates a new version and leaves a dead tuple behind. Every DELETE marks a tuple as dead but doesn't remove it. Over time, dead tuples pile up, tables bloat, and queries slow down because Postgres must skip over dead tuples during sequential scans. This is why VACUUM exists."
        },
        {
          type: "heading",
          text: "WAL: Write-Ahead Logging",
          level: 2
        },
        {
          type: "text",
          text: "When you COMMIT a transaction, Postgres does NOT immediately write the changed data pages to their table files on disk. That would be random I/O — slow and inefficient. Instead, it writes a sequential log entry to the <strong>Write-Ahead Log (WAL)</strong>. This is fast sequential I/O."
        },
        {
          type: "text",
          text: "The WAL is the foundation of durability. As long as the WAL record is flushed to disk before COMMIT returns, the transaction is durable — even if the server crashes before the actual table data files are updated. On recovery, Postgres replays the WAL to reconstruct any changes that didn't make it to the table files."
        },
        {
          type: "diagram",
          title: "Write Path: WAL First, Then Data Files",
          content: `  Application: COMMIT
       │
       ▼
  ┌──────────────────┐
  │  1. Write to WAL  │ ← Sequential I/O (fast)
  │     Buffer        │   Log record: "page 42, offset 300,
  └────────┬─────────┘   old=(1000), new=(800)"
           │
           ▼
  ┌──────────────────┐
  │  2. fsync WAL to  │ ← Guarantees durability
  │     disk (pg_wal/) │   COMMIT returns to client here
  └────────┬─────────┘
           │
           ▼  (later, asynchronously)
  ┌──────────────────┐
  │  3. Checkpoint:   │ ← Random I/O (slow, batched)
  │  Write dirty      │   Flushes modified pages from
  │  pages to disk    │   shared buffers to table files
  └──────────────────┘

  If crash happens after step 2 but before step 3:
  → Recovery replays WAL entries to restore data files`
        },
        {
          type: "text",
          text: "WAL is also the backbone of replication. Streaming replication works by shipping WAL records from the primary to replicas, which replay them to stay in sync. This is why you'll hear \"WAL-based replication\" — it's not a separate mechanism, it's the same WAL used for crash recovery."
        },
        {
          type: "heading",
          text: "Shared Buffers: The Page Cache",
          level: 2
        },
        {
          type: "text",
          text: "Shared buffers are PostgreSQL's internal page cache in shared memory. When a query needs a page, Postgres first checks shared buffers. If the page is there (a <strong>buffer hit</strong>), no disk I/O is needed. If not (a <strong>buffer miss</strong>), the page is read from disk into shared buffers, evicting an old page if necessary."
        },
        {
          type: "code",
          lang: "sql",
          filename: "shared_buffers.sql",
          code: `-- Check current setting
SHOW shared_buffers;  -- default: 128MB (way too low for production)

-- Production recommendation: 25% of total RAM
-- For a 64GB server: shared_buffers = 16GB
-- For a 16GB server: shared_buffers = 4GB

-- See buffer hit ratio (should be > 99%)
SELECT
    sum(blks_hit) AS buffer_hits,
    sum(blks_read) AS disk_reads,
    round(
        sum(blks_hit)::numeric /
        nullif(sum(blks_hit) + sum(blks_read), 0) * 100, 2
    ) AS hit_ratio_pct
FROM pg_stat_database
WHERE datname = current_database();

-- If hit ratio < 99%, increase shared_buffers
-- Requires a Postgres restart (not just reload)`
        },
        {
          type: "heading",
          text: "VACUUM: Cleaning Up Dead Tuples",
          level: 2
        },
        {
          type: "text",
          text: "VACUUM is the garbage collector for PostgreSQL's MVCC system. It does three critical things: (1) reclaims space from dead tuples so it can be reused by future INSERTs, (2) updates the visibility map so index-only scans work efficiently, and (3) prevents transaction ID wraparound — a catastrophic failure mode."
        },
        {
          type: "comparison",
          headers: ["VACUUM Type", "What It Does", "Locks", "When to Use"],
          rows: [
            ["VACUUM (standard)", "Marks dead tuple space as reusable within the page. Does NOT return space to the OS.", "No exclusive lock — reads/writes continue", "Autovacuum handles this automatically"],
            ["VACUUM FULL", "Rewrites the entire table, compacting it. Returns space to OS.", "EXCLUSIVE lock — blocks ALL reads/writes", "Only when table is heavily bloated and you can afford downtime"],
            ["VACUUM ANALYZE", "VACUUM + update statistics for the query planner", "No exclusive lock", "After bulk data loads or major updates"],
          ]
        },
        {
          type: "code",
          lang: "sql",
          filename: "vacuum_monitoring.sql",
          code: `-- Check dead tuple ratio per table
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup,
    n_dead_tup,
    round(n_dead_tup::numeric / nullif(n_live_tup + n_dead_tup, 0) * 100, 2)
        AS dead_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- If dead_pct > 20%, autovacuum may be falling behind
-- Tune autovacuum parameters:
-- autovacuum_vacuum_scale_factor = 0.1   (default 0.2)
-- autovacuum_vacuum_cost_delay = 2ms     (default 2ms, lower = faster)
-- autovacuum_max_workers = 5             (default 3)

-- For high-churn tables, set per-table autovacuum:
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_cost_limit = 1000
);`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Transaction ID Wraparound — The Silent Killer",
          text: "PostgreSQL uses 32-bit transaction IDs (about 4 billion). After ~2 billion transactions, old transaction IDs wrap around and can't be compared correctly. VACUUM must freeze old tuples (mark them as visible to all future transactions) before this happens. If autovacuum falls too far behind, Postgres will <em>shut itself down</em> to prevent data corruption. This is rare but catastrophic. Monitor <code>pg_stat_activity</code> for long-running transactions and ensure autovacuum is healthy."
        },
        {
          type: "heading",
          text: "TOAST: Handling Large Values",
          level: 2
        },
        {
          type: "text",
          text: "PostgreSQL pages are 8 KB, but what if a row has a 500 KB JSONB column? <strong>TOAST</strong> (The Oversized Attribute Storage Technique) automatically compresses and/or moves large values to a separate TOAST table. The original tuple stores a pointer. This happens transparently — you don't need to do anything special."
        },
        {
          type: "text",
          text: "TOAST has four strategies: <code>PLAIN</code> (never compress or move — for fixed-width types), <code>EXTENDED</code> (compress first, then move if still too big — the default for variable-length types), <code>EXTERNAL</code> (move without compression — good for pre-compressed data), and <code>MAIN</code> (try to keep in-line, compress if needed, move only as last resort)."
        },
        {
          type: "heading",
          text: "Checkpoint Process",
          level: 2
        },
        {
          type: "text",
          text: "A checkpoint flushes all dirty pages from shared buffers to disk and writes a checkpoint record to the WAL. After a checkpoint, all WAL files before that point can be recycled. Checkpoints happen at intervals (<code>checkpoint_timeout</code>, default 5 min) or when a certain amount of WAL has been written (<code>max_wal_size</code>, default 1 GB)."
        },
        {
          type: "text",
          text: "Checkpoints trade off recovery time against I/O load. Frequent checkpoints = faster recovery but more I/O spikes. Spread checkpoints over time with <code>checkpoint_completion_target = 0.9</code> (write dirty pages over 90% of the checkpoint interval instead of all at once)."
        },
        {
          type: "heading",
          text: "Key Takeaways",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>MVCC</strong>: Updates create new tuple versions, never overwrite. Dead tuples accumulate until VACUUM reclaims them",
            "<strong>WAL</strong>: All changes written to the write-ahead log first. Guarantees durability and enables replication",
            "<strong>Shared buffers</strong>: Postgres's page cache. Set to 25% of RAM. Monitor hit ratio — should be >99%",
            "<strong>VACUUM</strong>: Garbage collector for dead tuples. Autovacuum handles it, but monitor and tune for high-churn tables",
            "<strong>Pages</strong>: All storage is in 8 KB pages. TOAST handles values larger than ~2 KB by compressing or moving them",
            "These internals explain <em>why</em> things go wrong: table bloat (VACUUM too slow), slow queries after updates (dead tuple scans), replication lag (WAL replay falling behind)",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3: Transactions & Isolation
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "transactions-and-isolation",
      title: "Transactions & Isolation — Making Concurrent Access Safe",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "A web application isn't one user at a time. It's hundreds or thousands of concurrent requests, all reading and writing the same data. Two users buying the last item in stock. Multiple API workers updating the same user's balance. A reporting query running while data is being modified. Transactions and isolation levels are how PostgreSQL keeps all of this safe."
        },
        {
          type: "heading",
          text: "ACID: The Four Guarantees",
          level: 2
        },
        {
          type: "text",
          text: "ACID is the contract that PostgreSQL makes with you. Every transaction, no matter how simple, provides all four guarantees."
        },
        {
          type: "comparison",
          headers: ["Property", "What It Guarantees", "What Breaks Without It"],
          rows: [
            ["Atomicity", "All statements in a transaction succeed, or none do", "Transfer $100: debit succeeds but credit fails. Money vanishes."],
            ["Consistency", "DB moves from one valid state to another. Constraints always hold.", "Balance goes negative despite a CHECK (balance >= 0) constraint"],
            ["Isolation", "Concurrent transactions don't see each other's uncommitted changes", "Reading a half-written order: 3 of 5 line items visible"],
            ["Durability", "Once COMMIT returns, data survives power loss, crashes, anything", "COMMIT returns OK, server crashes, data is gone on restart"],
          ]
        },
        {
          type: "heading",
          text: "Transactions in Practice",
          level: 2
        },
        {
          type: "text",
          text: "Every SQL statement in PostgreSQL runs inside a transaction, even without an explicit BEGIN. A standalone <code>UPDATE</code> is an implicit single-statement transaction. Explicit transactions wrap multiple statements into an atomic unit."
        },
        {
          type: "code",
          lang: "sql",
          filename: "transactions.sql",
          code: `-- Explicit transaction: transfer money between accounts
BEGIN;

-- Debit source account (with balance check)
UPDATE accounts
SET balance = balance - 100.00
WHERE id = 1 AND balance >= 100.00;

-- Check that the debit actually happened (1 row affected)
-- In application code: if rowcount == 0, ROLLBACK

-- Credit destination account
UPDATE accounts
SET balance = balance + 100.00
WHERE id = 2;

-- Record the transfer
INSERT INTO transfers (from_id, to_id, amount, created_at)
VALUES (1, 2, 100.00, NOW());

COMMIT;  -- All three changes are visible atomically

-- If anything fails between BEGIN and COMMIT:
-- ROLLBACK undoes everything — balance stays unchanged

-- SAVEPOINT: partial rollback within a transaction
BEGIN;
INSERT INTO orders (user_id, total) VALUES (1, 50.00);
SAVEPOINT before_items;

INSERT INTO order_items (order_id, product_id, qty) VALUES (1, 999, 1);
-- Oops, product 999 doesn't exist (FK violation)
ROLLBACK TO SAVEPOINT before_items;
-- Order is still created, but the bad item insert is undone

INSERT INTO order_items (order_id, product_id, qty) VALUES (1, 42, 1);
COMMIT;`
        },
        {
          type: "heading",
          text: "Isolation Levels: The Concurrency Spectrum",
          level: 2
        },
        {
          type: "text",
          text: "Isolation determines what a transaction can see of other transactions' changes. Stricter isolation prevents more anomalies but causes more contention (transactions blocking or aborting each other). PostgreSQL implements three of the four SQL standard levels — it treats READ UNCOMMITTED the same as READ COMMITTED."
        },
        {
          type: "comparison",
          headers: ["Level", "Dirty Read", "Non-Repeatable Read", "Phantom Read", "Serialization Anomaly"],
          rows: [
            ["READ COMMITTED (default)", "Prevented", "Possible", "Possible", "Possible"],
            ["REPEATABLE READ", "Prevented", "Prevented", "Prevented*", "Possible"],
            ["SERIALIZABLE", "Prevented", "Prevented", "Prevented", "Prevented"],
          ]
        },
        {
          type: "callout",
          variant: "info",
          title: "Postgres REPEATABLE READ Is Stronger Than SQL Standard",
          text: "The SQL standard says REPEATABLE READ allows phantom reads. But Postgres implements it using snapshot isolation, which prevents phantoms too. The difference from SERIALIZABLE is that REPEATABLE READ doesn't detect serialization anomalies — situations where the result differs from running the transactions one at a time."
        },
        {
          type: "heading",
          text: "READ COMMITTED: The Default",
          level: 3
        },
        {
          type: "text",
          text: "Each <em>statement</em> within a transaction sees the latest committed data at the time that statement starts. If another transaction commits between your two SELECT statements, you'll see different results. This is fine for most web applications."
        },
        {
          type: "code",
          lang: "sql",
          filename: "read_committed.sql",
          code: `-- Session A                          -- Session B
BEGIN;                                 BEGIN;
SELECT count(*) FROM orders
WHERE status = 'pending';
-- Returns: 5

                                       INSERT INTO orders (...) VALUES (...);
                                       COMMIT;

SELECT count(*) FROM orders
WHERE status = 'pending';
-- Returns: 6  ← Different! This is a non-repeatable read.
-- READ COMMITTED re-evaluates each statement against
-- the latest committed state.
COMMIT;`
        },
        {
          type: "heading",
          text: "REPEATABLE READ: Snapshot Isolation",
          level: 3
        },
        {
          type: "text",
          text: "The transaction takes a snapshot at BEGIN. All reads within the transaction see data as it was at that moment, regardless of what other transactions do. If another transaction modifies a row you're trying to update, your UPDATE will fail with a serialization error and you must retry."
        },
        {
          type: "code",
          lang: "sql",
          filename: "repeatable_read.sql",
          code: `-- Session A                              -- Session B
BEGIN ISOLATION LEVEL REPEATABLE READ;    BEGIN;

SELECT balance FROM accounts
WHERE id = 1;
-- Returns: 1000

                                          UPDATE accounts
                                          SET balance = 800
                                          WHERE id = 1;
                                          COMMIT;

SELECT balance FROM accounts
WHERE id = 1;
-- Still returns: 1000 ← Snapshot!
-- Session A sees the world as it was at BEGIN.

-- But if Session A tries to UPDATE the same row:
UPDATE accounts SET balance = balance - 200 WHERE id = 1;
-- ERROR: could not serialize access due to concurrent update
-- Session A must ROLLBACK and retry the entire transaction.
ROLLBACK;`
        },
        {
          type: "heading",
          text: "SERIALIZABLE: Full Safety",
          level: 3
        },
        {
          type: "text",
          text: "SERIALIZABLE guarantees that the result is the same as if transactions ran one at a time (serially). PostgreSQL uses a technique called <strong>Serializable Snapshot Isolation (SSI)</strong> — it starts with REPEATABLE READ's snapshot and adds dependency tracking to detect serialization anomalies. The trade-off: some transactions may be aborted with serialization failures and must be retried."
        },
        {
          type: "code",
          lang: "sql",
          filename: "serializable.sql",
          code: `-- Classic write skew anomaly: on-call scheduling
-- Rule: at least one doctor must be on call at all times
-- Currently: Dr. A and Dr. B are both on call

-- Session A (SERIALIZABLE)              -- Session B (SERIALIZABLE)
BEGIN ISOLATION LEVEL SERIALIZABLE;      BEGIN ISOLATION LEVEL SERIALIZABLE;

SELECT count(*) FROM on_call             SELECT count(*) FROM on_call
WHERE shift = 'tonight';                 WHERE shift = 'tonight';
-- Returns: 2 (A and B)                  -- Returns: 2 (A and B)

-- "2 on call, safe to remove myself"    -- "2 on call, safe to remove myself"
DELETE FROM on_call                      DELETE FROM on_call
WHERE doctor = 'A'                       WHERE doctor = 'B'
AND shift = 'tonight';                   AND shift = 'tonight';

COMMIT;  -- succeeds                     COMMIT;  -- ERROR: serialization failure
                                         -- Postgres detected the write skew!
                                         -- Without SERIALIZABLE, both commits
                                         -- would succeed → zero doctors on call.`
        },
        {
          type: "heading",
          text: "Locking: Pessimistic vs Optimistic",
          level: 2
        },
        {
          type: "text",
          text: "When two transactions compete for the same resource, you have two strategies."
        },
        {
          type: "comparison",
          headers: ["Strategy", "How It Works", "Best For"],
          rows: [
            ["Pessimistic (SELECT ... FOR UPDATE)", "Lock the row before reading. Other transactions wait.", "High contention, short transactions (payments, inventory)"],
            ["Optimistic (version column check)", "Read without locking. On write, check version hasn't changed.", "Low contention, longer transactions (user profile edits)"],
          ]
        },
        {
          type: "code",
          lang: "sql",
          filename: "locking_patterns.sql",
          code: `-- ═══ Pessimistic Locking: SELECT FOR UPDATE ═══
-- Use when: high contention, critical operations

BEGIN;
-- Lock the row — other transactions block here until we COMMIT
SELECT * FROM products
WHERE id = 42
FOR UPDATE;

-- Safe to decrement — no one else can modify this row
UPDATE products
SET stock = stock - 1
WHERE id = 42 AND stock > 0;

COMMIT;  -- Lock released

-- FOR UPDATE SKIP LOCKED: skip locked rows instead of waiting
-- Perfect for job queues
SELECT id, payload
FROM tasks
WHERE status = 'pending'
ORDER BY priority DESC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- FOR UPDATE NOWAIT: error immediately if locked
-- Good when you'd rather fail fast than wait
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;

-- ═══ Optimistic Locking: Version Column ═══
-- Use when: low contention, reads >> writes

-- Table has a version column
-- Read: SELECT id, name, version FROM users WHERE id = 1;
-- Returns: id=1, name='Alice', version=3

-- Update with version check
UPDATE users
SET name = 'Alice Smith', version = version + 1
WHERE id = 1 AND version = 3;

-- If rowcount = 0, someone else updated first → retry
-- If rowcount = 1, update succeeded

-- ═══ Advisory Locks: Application-Level Coordination ═══
-- Lock a resource by arbitrary integer key
SELECT pg_advisory_lock(12345);      -- Blocks until acquired
-- ... do exclusive work ...
SELECT pg_advisory_unlock(12345);    -- Release

-- Try-lock variant (non-blocking)
SELECT pg_try_advisory_lock(12345);  -- Returns true/false immediately

-- Session-level: held until session ends or explicitly released
-- Transaction-level: released on COMMIT/ROLLBACK
SELECT pg_advisory_xact_lock(12345);`
        },
        {
          type: "heading",
          text: "Deadlocks",
          level: 2
        },
        {
          type: "text",
          text: "A deadlock occurs when two transactions each hold a lock the other needs. Transaction A locks row 1 and waits for row 2. Transaction B locks row 2 and waits for row 1. Neither can proceed."
        },
        {
          type: "text",
          text: "PostgreSQL detects deadlocks automatically (every <code>deadlock_timeout</code>, default 1 second) and aborts one of the transactions with an error. The application must catch this error and retry."
        },
        {
          type: "code",
          lang: "sql",
          filename: "deadlock_prevention.sql",
          code: `-- DEADLOCK SCENARIO:
-- Session A: UPDATE accounts SET ... WHERE id = 1; (holds lock on 1)
--            UPDATE accounts SET ... WHERE id = 2; (waits for 2)
-- Session B: UPDATE accounts SET ... WHERE id = 2; (holds lock on 2)
--            UPDATE accounts SET ... WHERE id = 1; (waits for 1)
-- → DEADLOCK DETECTED

-- PREVENTION: Always lock rows in the same order
-- Sort by primary key before updating
BEGIN;
-- Lock both rows in PK order
SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
-- Now safe to update in any order
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;`
        },
        {
          type: "heading",
          text: "Choosing the Right Isolation Level",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>READ COMMITTED</strong> (default): Use for most web applications. Simple, fast, rarely causes contention. Accept that reads within a transaction might see different committed states.",
            "<strong>REPEATABLE READ</strong>: Use for reporting queries that need a consistent snapshot (e.g., generating an invoice mid-transaction). Be ready to handle serialization errors.",
            "<strong>SERIALIZABLE</strong>: Use for financial operations, inventory management, or any logic where write skew could cause business rule violations. Always implement retry logic.",
            "Don't use SERIALIZABLE everywhere \"just to be safe\" — it increases abort rates and retry overhead. Use the minimum level that prevents your specific anomaly.",
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview Answer: Isolation Levels",
          text: "\"I use READ COMMITTED for most endpoints because it's the right balance of performance and safety. For financial operations like balance transfers, I use SELECT FOR UPDATE (pessimistic locking) within READ COMMITTED, which gives me strong consistency on the specific rows I'm modifying. I reserve SERIALIZABLE for cases where I need to prevent write skew across multiple rows — like scheduling constraints or inventory allocation across multiple warehouses.\""
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4: Indexes & Query Optimization
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "indexes-and-query-optimization",
      title: "Indexes & Query Optimization — Making Queries Fast",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "A query that takes 200ms on 100K rows will take 20 seconds on 10M rows if it's doing a sequential scan. Indexes are how you keep queries fast as data grows. But indexes aren't free — every index slows down writes and uses disk space. The skill is knowing <em>which</em> indexes to create, understanding <em>why</em> the query planner chose its plan, and reading EXPLAIN ANALYZE output like a pro."
        },
        {
          type: "heading",
          text: "How Indexes Work: The Library Analogy",
          level: 2
        },
        {
          type: "text",
          text: "A table without an index is a library without a catalog — to find a specific book, you walk through every shelf. An index is the card catalog: an ordered data structure that maps lookup values to physical row locations. PostgreSQL supports several index types, each optimized for different query patterns."
        },
        {
          type: "heading",
          text: "B-tree: The Default Workhorse",
          level: 2
        },
        {
          type: "text",
          text: "B-tree (balanced tree) indexes handle equality (<code>=</code>), range queries (<code><</code>, <code>></code>, <code>BETWEEN</code>), <code>ORDER BY</code>, <code>IS NULL</code>, and pattern matching with a left-anchored <code>LIKE 'prefix%'</code>. They're the default for a reason — they cover 90% of use cases."
        },
        {
          type: "diagram",
          title: "B-tree Index Structure",
          content: `  B-tree on users(email):

                    ┌──────────────────┐
                    │  Root: [M]        │
                    └──┬────────────┬──┘
                       │            │
            ┌──────────┘            └──────────┐
            ▼                                  ▼
  ┌─────────────────┐              ┌─────────────────┐
  │ Internal: [D, H] │              │ Internal: [R, V] │
  └─┬─────┬─────┬──┘              └─┬─────┬─────┬──┘
    │     │     │                    │     │     │
    ▼     ▼     ▼                    ▼     ▼     ▼
  ┌───┐ ┌───┐ ┌───┐              ┌───┐ ┌───┐ ┌───┐
  │A-C│ │D-G│ │H-L│              │M-Q│ │R-U│ │V-Z│
  │→→→│→│→→→│→│→→→│ ←linked→    │→→→│→│→→→│→│→→→│
  └───┘ └───┘ └───┘              └───┘ └───┘ └───┘
  Leaf pages: sorted, doubly linked for range scans

  Lookup: email = 'kate@...'
  1. Root: 'K' < 'M' → go left
  2. Internal: 'H' < 'K' < 'M' → third child
  3. Leaf: binary search → found!
  Total: 3 page reads for millions of rows`
        },
        {
          type: "code",
          lang: "sql",
          filename: "btree_indexes.sql",
          code: `-- Simple B-tree (most common)
CREATE INDEX idx_users_email ON users(email);

-- Unique index (also enforces constraint)
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Composite index: column order matters!
-- This index serves: WHERE user_id = X AND status = Y
--                    WHERE user_id = X (leftmost prefix)
-- Does NOT serve:    WHERE status = Y (not leftmost)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Descending index for ORDER BY ... DESC queries
CREATE INDEX idx_orders_created_desc ON orders(created_at DESC);

-- Partial index: only index rows matching a condition
-- Smaller index → faster lookups, less disk, less write overhead
CREATE INDEX idx_orders_pending ON orders(created_at)
    WHERE status = 'pending';
-- Only useful when your query has WHERE status = 'pending'

-- Covering index (INCLUDE): add columns to avoid heap lookup
CREATE INDEX idx_orders_covering ON orders(user_id, status)
    INCLUDE (total, created_at);
-- Index-only scan: Postgres reads everything from the index
-- without touching the heap table at all`
        },
        {
          type: "heading",
          text: "GIN: Full-Text, JSONB, and Arrays",
          level: 2
        },
        {
          type: "text",
          text: "GIN (Generalized Inverted Index) maps <em>values inside</em> a composite type to the rows containing them. It's like the index at the back of a textbook — for each keyword, it lists every page that mentions it. GIN is essential for JSONB containment queries, array operations, and full-text search."
        },
        {
          type: "code",
          lang: "sql",
          filename: "gin_indexes.sql",
          code: `-- JSONB containment: find orders with metadata containing a key
CREATE INDEX idx_orders_metadata ON orders USING GIN(metadata);
-- Query: SELECT * FROM orders WHERE metadata @> '{"source": "mobile"}';

-- Array containment: find products with specific tags
CREATE INDEX idx_products_tags ON products USING GIN(tags);
-- Query: SELECT * FROM products WHERE tags @> ARRAY['wireless'];

-- Full-text search
CREATE INDEX idx_products_search ON products USING GIN(
    to_tsvector('english', name || ' ' || description)
);
-- Query: SELECT * FROM products
--        WHERE to_tsvector('english', name || ' ' || description)
--              @@ to_tsquery('english', 'wireless & keyboard');

-- GIN with jsonb_path_ops: smaller index, faster @> queries
-- But only supports @> operator (not ?, ?|, ?& etc.)
CREATE INDEX idx_orders_meta_path ON orders
    USING GIN(metadata jsonb_path_ops);`
        },
        {
          type: "callout",
          variant: "info",
          title: "GIN vs GiST for Full-Text Search",
          text: "GIN is faster for lookups but slower to update (each new document updates many index entries). GiST is faster to update but slower for lookups and can produce false matches that need rechecking. Use GIN for read-heavy workloads (most production systems). Use GiST only if your write rate is extremely high and you can tolerate slower reads."
        },
        {
          type: "heading",
          text: "BRIN: For Time-Series and Naturally Ordered Data",
          level: 2
        },
        {
          type: "text",
          text: "BRIN (Block Range INdex) stores min/max summaries per block range (default 128 pages). It's tiny — a BRIN index on a 100GB table might be only 100 KB. The catch: it only works well when the physical order of rows correlates with the index column. This naturally happens with append-only tables where rows are inserted in order — like time-series data, event logs, or any table with a monotonically increasing <code>created_at</code>."
        },
        {
          type: "code",
          lang: "sql",
          filename: "brin_index.sql",
          code: `-- BRIN for time-series: events always inserted in order
CREATE INDEX idx_events_created_brin ON events
    USING BRIN(created_at)
    WITH (pages_per_range = 64);

-- Size comparison on 100M rows:
-- B-tree on created_at:  ~2.1 GB
-- BRIN on created_at:    ~0.5 MB  ← 4000x smaller!

-- BRIN works by: "rows in pages 1-128 have created_at between
-- 2024-01-01 and 2024-01-15. Pages 129-256 have 2024-01-15
-- to 2024-01-30." etc.
-- Query for last 7 days → skip all block ranges outside that window.

-- WARNING: BRIN fails if rows are inserted out of order
-- or if UPDATEs change the indexed column
-- Check correlation:
SELECT correlation FROM pg_stats
WHERE tablename = 'events' AND attname = 'created_at';
-- Close to 1.0 = good for BRIN. Close to 0 = useless.`
        },
        {
          type: "heading",
          text: "Hash Indexes",
          level: 2
        },
        {
          type: "text",
          text: "Hash indexes only support equality lookups (<code>=</code>). They're slightly faster than B-tree for pure equality but don't support range queries, ordering, or partial matching. Since PostgreSQL 10, they're crash-safe and WAL-logged. Use them only when you're certain you'll never need anything beyond equality — which is rare, so B-tree is almost always the better choice."
        },
        {
          type: "heading",
          text: "EXPLAIN ANALYZE: Reading Query Plans",
          level: 2
        },
        {
          type: "text",
          text: "EXPLAIN shows the <em>planned</em> execution strategy. EXPLAIN ANALYZE actually <em>runs</em> the query and shows real execution times. Always use ANALYZE — the planner's estimates can be wildly wrong."
        },
        {
          type: "code",
          lang: "sql",
          filename: "explain_analyze.sql",
          code: `-- Always use ANALYZE, BUFFERS, and FORMAT TEXT
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.email, COUNT(o.id) AS orders, SUM(o.total) AS spend
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.status = 'completed'
  AND o.created_at > NOW() - INTERVAL '90 days'
  AND u.tier = 'pro'
GROUP BY u.email
ORDER BY spend DESC
LIMIT 20;

-- Reading the output:
--
-- Limit  (cost=8500..8501 rows=20 width=50)
--        (actual time=87.6..87.7 rows=20 loops=1)
--
--   → Sort  (cost=8500..8502 rows=85)
--           (actual time=87.5..87.6 rows=20 loops=1)
--       Sort Key: (sum(o.total)) DESC
--       Sort Method: top-N heapsort  Memory: 27kB
--
--     → HashAggregate  (cost=8400..8490 rows=85)
--                      (actual time=85.2..85.8 rows=72 loops=1)
--
--       → Hash Join  (cost=1500..8200 rows=85)
--                    (actual time=23.4..84.1 rows=72 loops=1)
--           Hash Cond: (o.user_id = u.id)
--           Buffers: shared hit=1240 read=3892
--
--           → Index Scan using idx_orders_user_status on orders o
--               Index Cond: (status = 'completed')
--               Filter: (created_at > ...)
--               Rows Removed by Filter: 45820         ← RED FLAG
--               Buffers: shared hit=200 read=3800      ← lots of disk
--
--           → Hash  (actual rows=9200)
--               → Seq Scan on users u                  ← RED FLAG
--                   Filter: (tier = 'pro')
--                   Rows Removed by Filter: 190800     ← scanning 200K!`
        },
        {
          type: "heading",
          text: "The EXPLAIN Cheat Sheet",
          level: 3
        },
        {
          type: "comparison",
          headers: ["What to Look For", "Problem", "Fix"],
          rows: [
            ["Seq Scan on large table", "Full table scan — reads every row", "Add an index on the filtered column"],
            ["Rows Removed by Filter: large N", "Index returns too many rows, then filters", "Add a more selective index (composite or partial)"],
            ["Buffers: shared read=large N", "Pages read from disk, not cache", "Increase shared_buffers or add covering index"],
            ["Sort Method: external merge Disk", "Sort spills to disk", "Increase work_mem or add index matching ORDER BY"],
            ["Nested Loop with large inner table", "O(N*M) join strategy", "Add index on join column, or increase work_mem for hash join"],
            ["actual rows >> estimated rows", "Planner's statistics are stale", "Run ANALYZE on the table"],
          ]
        },
        {
          type: "heading",
          text: "Fixing the Slow Query",
          level: 3
        },
        {
          type: "code",
          lang: "sql",
          filename: "fix_slow_query.sql",
          code: `-- Problem 1: Index scans orders by (user_id, status) but then
-- filters 45K rows by created_at → wrong index for this query

-- Fix: composite index matching all WHERE conditions
CREATE INDEX idx_orders_status_created
    ON orders(status, created_at DESC);
-- Now: Index Scan with both conditions → no Rows Removed by Filter

-- Problem 2: Seq Scan on users filtering by tier
CREATE INDEX idx_users_tier ON users(tier)
    WHERE tier IN ('pro', 'enterprise');  -- partial: skip 'free' users

-- Problem 3: Still doing heap lookups for SUM(total)
-- Fix: covering index includes the aggregated column
CREATE INDEX idx_orders_covering ON orders(status, created_at DESC)
    INCLUDE (user_id, total);
-- Now: Index Only Scan — never touches the heap

-- After adding indexes, verify:
-- • "Index Only Scan" instead of "Index Scan" or "Seq Scan"
-- • "Buffers: shared hit=X read=0" (no disk reads)
-- • "Rows Removed by Filter: 0" or very small
-- • Execution time: 87ms → 2-5ms`
        },
        {
          type: "heading",
          text: "Index Anti-Patterns",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Over-indexing</strong>: Every index slows INSERT/UPDATE/DELETE. A table with 15 indexes on 5 columns is a maintenance nightmare. Only index columns that appear in WHERE, JOIN, or ORDER BY of actual queries.",
            "<strong>Indexing low-cardinality columns</strong>: An index on a boolean column (2 values) is rarely useful — Postgres will choose a sequential scan anyway because the index doesn't narrow results enough. Exception: partial index on the rare value (<code>WHERE is_active = false</code>).",
            "<strong>Wrong column order in composite indexes</strong>: <code>CREATE INDEX ON orders(status, user_id)</code> serves <code>WHERE status = X</code> and <code>WHERE status = X AND user_id = Y</code> but NOT <code>WHERE user_id = Y</code> alone. Put the most selective column first, or the column used in equality conditions.",
            "<strong>Functions on indexed columns</strong>: <code>WHERE LOWER(email) = 'test@...'</code> can't use a B-tree index on <code>email</code>. Create a functional index: <code>CREATE INDEX ON users(LOWER(email))</code>.",
            "<strong>Forgetting ANALYZE after bulk loads</strong>: The planner uses statistics to choose the best plan. After inserting millions of rows, run <code>ANALYZE tablename</code> to update statistics. Otherwise, the planner may choose terrible plans based on old data distribution.",
          ]
        },
        {
          type: "heading",
          text: "Index Strategy for a Typical Backend",
          level: 2
        },
        {
          type: "code",
          lang: "sql",
          filename: "index_strategy.sql",
          code: `-- 1. Primary keys: automatic B-tree unique index
-- 2. Foreign keys: ALWAYS index them (Postgres doesn't auto-index FKs!)
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 3. Columns in WHERE clauses of frequent queries
CREATE INDEX idx_orders_status ON orders(status);

-- 4. Composite indexes for multi-column filters
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 5. Partial indexes for hot queries on specific subsets
CREATE INDEX idx_orders_pending ON orders(created_at)
    WHERE status = 'pending';

-- 6. Covering indexes for dashboard queries (avoid heap lookups)
CREATE INDEX idx_users_dashboard ON users(tier, created_at DESC)
    INCLUDE (email, name);

-- 7. GIN for JSONB and full-text search
CREATE INDEX idx_products_search ON products USING GIN(search_vec);

-- 8. BRIN for time-series (if data is physically ordered)
CREATE INDEX idx_events_ts ON events USING BRIN(created_at);

-- Monitor unused indexes (waste of write overhead):
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview Answer: Index Types",
          text: "\"B-tree is the default — handles equality, ranges, and ordering. I use GIN for JSONB containment queries and full-text search because it indexes values <em>inside</em> composite types. For time-series tables with billions of rows, I use BRIN — it's 1000x smaller than B-tree because it only stores min/max per block range. Partial indexes are my secret weapon for queries that always filter on a specific status — the index is tiny and the planner uses it instantly.\""
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5: Advanced SQL
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "advanced-sql",
      title: "Advanced SQL — Window Functions, CTEs, JSONB, Full-Text Search",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Basic SQL gets you CRUD. Advanced SQL is what separates the engineers who pull data out of databases from the engineers who make databases <em>do the work</em>. Window functions, CTEs, recursive queries, JSONB, and full-text search let you solve complex problems in a single query instead of pulling data into Python and processing it there."
        },
        {
          type: "heading",
          text: "Window Functions: Analytics Without Collapsing Rows",
          level: 2
        },
        {
          type: "text",
          text: "GROUP BY collapses rows — you get one row per group. Window functions compute aggregates <em>across a set of rows related to the current row</em> without collapsing. You keep every individual row AND get computed values like running totals, ranks, and moving averages."
        },
        {
          type: "code",
          lang: "sql",
          filename: "window_functions.sql",
          code: `-- Running total per user (keeps individual order rows)
SELECT
    user_id,
    created_at,
    total,
    -- Cumulative spend
    SUM(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
        ROWS UNBOUNDED PRECEDING
    ) AS running_total,

    -- Rank orders by value per user
    RANK() OVER (
        PARTITION BY user_id
        ORDER BY total DESC
    ) AS value_rank,

    -- Order sequence number
    ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY created_at
    ) AS nth_order,

    -- Previous and next order amounts
    LAG(total, 1) OVER (
        PARTITION BY user_id ORDER BY created_at
    ) AS prev_order,
    LEAD(total, 1) OVER (
        PARTITION BY user_id ORDER BY created_at
    ) AS next_order,

    -- 7-order moving average
    AVG(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7

FROM orders
WHERE status = 'completed'
ORDER BY user_id, created_at;`
        },
        {
          type: "callout",
          variant: "info",
          title: "Window Function Execution Order",
          text: "Window functions execute AFTER WHERE, GROUP BY, and HAVING — but BEFORE ORDER BY and LIMIT. This means you can't filter on a window function result in the same query level. Wrap it in a CTE or subquery to filter: <code>WITH ranked AS (SELECT ..., RANK() OVER (...) AS rk FROM ...) SELECT * FROM ranked WHERE rk <= 3;</code>"
        },
        {
          type: "heading",
          text: "Ranking Functions: RANK vs DENSE_RANK vs ROW_NUMBER",
          level: 3
        },
        {
          type: "comparison",
          headers: ["Function", "Behavior for Ties", "Example: Scores 100, 90, 90, 80"],
          rows: [
            ["ROW_NUMBER()", "No ties — arbitrary assignment", "1, 2, 3, 4"],
            ["RANK()", "Same rank for ties, skip next", "1, 2, 2, 4 (skips 3)"],
            ["DENSE_RANK()", "Same rank for ties, no skip", "1, 2, 2, 3 (no gap)"],
          ]
        },
        {
          type: "code",
          lang: "sql",
          filename: "practical_windows.sql",
          code: `-- Top 3 orders per user (common interview question)
WITH ranked AS (
    SELECT
        user_id,
        id AS order_id,
        total,
        ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY total DESC
        ) AS rn
    FROM orders
    WHERE status = 'completed'
)
SELECT * FROM ranked WHERE rn <= 3;

-- Percentage of total per category
SELECT
    category,
    product_name,
    revenue,
    ROUND(
        revenue * 100.0 / SUM(revenue) OVER (PARTITION BY category),
        1
    ) AS pct_of_category,
    ROUND(
        revenue * 100.0 / SUM(revenue) OVER (),  -- no PARTITION = whole table
        1
    ) AS pct_of_total
FROM product_sales;

-- Detect gaps in sequential data (e.g., missing invoice numbers)
SELECT
    invoice_number,
    LEAD(invoice_number) OVER (ORDER BY invoice_number) AS next_num,
    LEAD(invoice_number) OVER (ORDER BY invoice_number) - invoice_number AS gap
FROM invoices
HAVING gap > 1;

-- DISTINCT ON: Postgres-specific, faster than window + filter
-- Get most recent order per user
SELECT DISTINCT ON (user_id)
    user_id, id AS order_id, total, created_at
FROM orders
WHERE status = 'completed'
ORDER BY user_id, created_at DESC;`
        },
        {
          type: "heading",
          text: "CTEs: Common Table Expressions",
          level: 2
        },
        {
          type: "text",
          text: "CTEs let you give names to subqueries, making complex queries readable. They're also the only way to write recursive queries in SQL."
        },
        {
          type: "code",
          lang: "sql",
          filename: "ctes.sql",
          code: `-- Named subqueries for readability
WITH
active_users AS (
    SELECT id, email, tier
    FROM users
    WHERE is_active = true
      AND created_at > NOW() - INTERVAL '1 year'
),
user_spend AS (
    SELECT
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spend,
        MAX(created_at) AS last_order
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
),
user_segments AS (
    SELECT
        u.id, u.email, u.tier,
        COALESCE(s.order_count, 0) AS orders,
        COALESCE(s.total_spend, 0) AS spend,
        CASE
            WHEN s.total_spend > 10000 THEN 'whale'
            WHEN s.total_spend > 1000  THEN 'power_user'
            WHEN s.total_spend > 0     THEN 'active'
            ELSE 'dormant'
        END AS segment
    FROM active_users u
    LEFT JOIN user_spend s ON s.user_id = u.id
)
SELECT segment, COUNT(*) AS users, SUM(spend) AS revenue
FROM user_segments
GROUP BY segment
ORDER BY revenue DESC;`
        },
        {
          type: "heading",
          text: "Recursive CTEs: Walking Trees and Graphs",
          level: 3
        },
        {
          type: "text",
          text: "Recursive CTEs have two parts: a <strong>base case</strong> (anchor) and a <strong>recursive step</strong> joined with UNION ALL. They're essential for hierarchical data — org charts, category trees, comment threads, bill of materials."
        },
        {
          type: "code",
          lang: "sql",
          filename: "recursive_cte.sql",
          code: `-- Category tree: Electronics > Computers > Laptops > Gaming Laptops
CREATE TABLE categories (
    id        INT PRIMARY KEY,
    parent_id INT REFERENCES categories(id),
    name      TEXT NOT NULL
);

-- Walk the tree from roots to leaves
WITH RECURSIVE tree AS (
    -- Base case: root categories (no parent)
    SELECT id, name, parent_id, 1 AS depth,
           name::TEXT AS path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive: children of current level
    SELECT c.id, c.name, c.parent_id,
           t.depth + 1,
           t.path || ' > ' || c.name
    FROM categories c
    JOIN tree t ON c.parent_id = t.id
    WHERE t.depth < 10  -- safety limit to prevent infinite recursion
)
SELECT * FROM tree ORDER BY path;

-- Result:
-- Electronics
-- Electronics > Computers
-- Electronics > Computers > Laptops
-- Electronics > Computers > Laptops > Gaming Laptops

-- Find all subordinates of a manager (org chart)
WITH RECURSIVE reports AS (
    SELECT id, name, manager_id, 0 AS level
    FROM employees
    WHERE id = 42  -- starting manager

    UNION ALL

    SELECT e.id, e.name, e.manager_id, r.level + 1
    FROM employees e
    JOIN reports r ON e.manager_id = r.id
    WHERE r.level < 20
)
SELECT * FROM reports ORDER BY level, name;`
        },
        {
          type: "heading",
          text: "JSONB: Semi-Structured Data in PostgreSQL",
          level: 2
        },
        {
          type: "text",
          text: "JSONB stores JSON in a decomposed binary format that supports indexing, efficient querying, and in-place updates. It bridges the gap between rigid relational schema and flexible document storage. Use JSONB columns for metadata, preferences, feature flags — data that varies per row but doesn't warrant its own columns."
        },
        {
          type: "code",
          lang: "sql",
          filename: "jsonb_operations.sql",
          code: `-- Store flexible metadata alongside structured columns
CREATE TABLE products (
    id       BIGSERIAL PRIMARY KEY,
    name     TEXT NOT NULL,
    category TEXT NOT NULL,
    price    NUMERIC(10,2) NOT NULL,
    attrs    JSONB NOT NULL DEFAULT '{}'
);

-- Insert with varied attributes per product
INSERT INTO products (name, category, price, attrs) VALUES
('MacBook Pro', 'laptop', 2499.00,
 '{"cpu": "M3 Max", "ram_gb": 64, "storage_gb": 1000,
   "ports": ["thunderbolt", "hdmi", "magsafe"]}'),
('AirPods Pro', 'audio', 249.00,
 '{"noise_cancellation": true, "battery_hours": 6,
   "connectivity": "bluetooth 5.3"}');

-- Access nested values
SELECT name, attrs->>'cpu' AS cpu, (attrs->>'ram_gb')::int AS ram
FROM products WHERE category = 'laptop';

-- Containment query (uses GIN index)
SELECT * FROM products WHERE attrs @> '{"noise_cancellation": true}';

-- Check key existence
SELECT * FROM products WHERE attrs ? 'ports';

-- JSONB path queries (PostgreSQL 12+)
SELECT name, jsonb_path_query_array(attrs, '$.ports[*]') AS all_ports
FROM products
WHERE jsonb_path_exists(attrs, '$.ram_gb ? (@ > 32)');

-- Update nested value (without replacing entire JSONB)
UPDATE products
SET attrs = jsonb_set(attrs, '{ram_gb}', '128')
WHERE id = 1;

-- Remove a key
UPDATE products
SET attrs = attrs - 'storage_gb'
WHERE id = 1;

-- Aggregate JSONB: build a summary object
SELECT jsonb_object_agg(category, cnt) AS category_counts
FROM (
    SELECT category, COUNT(*) AS cnt
    FROM products GROUP BY category
) sub;
-- Result: {"laptop": 5, "audio": 12, "phone": 8}`
        },
        {
          type: "callout",
          variant: "warning",
          title: "JSONB vs Separate Columns",
          text: "Don't put everything in JSONB. If you query a field in WHERE, JOIN, or ORDER BY frequently, it should be a real column with a proper type and index. JSONB is for fields that vary per row, are rarely filtered on, or change schema frequently. A JSONB column with 50 fields that you query individually is a sign you should normalize into proper columns."
        },
        {
          type: "heading",
          text: "Full-Text Search",
          level: 2
        },
        {
          type: "text",
          text: "PostgreSQL has built-in full-text search that handles stemming, ranking, and phrase matching. For many applications, it eliminates the need for Elasticsearch. It works by converting text to <code>tsvector</code> (a sorted list of normalized words with positions) and queries to <code>tsquery</code> (a boolean expression of search terms)."
        },
        {
          type: "code",
          lang: "sql",
          filename: "full_text_search.sql",
          code: `-- Generated column: auto-updated search vector
ALTER TABLE products ADD COLUMN search_vec TSVECTOR
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', name), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B')
    ) STORED;

-- GIN index on the search vector
CREATE INDEX idx_products_fts ON products USING GIN(search_vec);

-- Basic search
SELECT name, description,
       ts_rank(search_vec, query) AS rank
FROM products,
     to_tsquery('english', 'wireless & mechanical & keyboard') AS query
WHERE search_vec @@ query
ORDER BY rank DESC
LIMIT 20;

-- Phrase search (words must be adjacent)
SELECT * FROM products
WHERE search_vec @@ phraseto_tsquery('english', 'gaming laptop');

-- Prefix matching (autocomplete)
SELECT * FROM products
WHERE search_vec @@ to_tsquery('english', 'key:*');
-- Matches: keyboard, keychain, keypad, etc.

-- Headline: highlighted search result snippets
SELECT name,
    ts_headline('english', description, query,
        'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15'
    ) AS snippet
FROM products,
     to_tsquery('english', 'noise & cancellation') AS query
WHERE search_vec @@ query
ORDER BY ts_rank(search_vec, query) DESC;`
        },
        {
          type: "heading",
          text: "Generated Columns",
          level: 2
        },
        {
          type: "text",
          text: "PostgreSQL 12+ supports <code>GENERATED ALWAYS AS ... STORED</code> columns. The value is computed on INSERT/UPDATE and stored on disk. Useful for derived values you query frequently — search vectors, computed prices, normalized names. You can't INSERT or UPDATE a generated column directly."
        },
        {
          type: "code",
          lang: "sql",
          filename: "generated_columns.sql",
          code: `-- Computed discount price
ALTER TABLE products ADD COLUMN discounted_price NUMERIC(10,2)
    GENERATED ALWAYS AS (
        CASE
            WHEN discount_pct > 0 THEN price * (1 - discount_pct / 100.0)
            ELSE price
        END
    ) STORED;

-- Normalized email for case-insensitive lookups
ALTER TABLE users ADD COLUMN email_lower TEXT
    GENERATED ALWAYS AS (LOWER(email)) STORED;
CREATE UNIQUE INDEX idx_users_email_lower ON users(email_lower);
-- Now: WHERE email_lower = 'test@example.com' uses the index
-- without needing LOWER() in every query`
        },
        {
          type: "heading",
          text: "Lateral Joins: Correlated Subqueries Done Right",
          level: 2
        },
        {
          type: "text",
          text: "A <code>LATERAL</code> join lets the right side of the join reference columns from the left side. It's like a for-each loop in SQL — for each row on the left, evaluate the subquery on the right. This is the cleanest way to get the \"top N per group\" pattern."
        },
        {
          type: "code",
          lang: "sql",
          filename: "lateral_join.sql",
          code: `-- Top 3 most recent orders per user (LATERAL approach)
SELECT u.id, u.email, o.id AS order_id, o.total, o.created_at
FROM users u
CROSS JOIN LATERAL (
    SELECT id, total, created_at
    FROM orders
    WHERE user_id = u.id AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 3
) o
WHERE u.is_active = true;

-- Why LATERAL? The subquery references u.id from the outer table.
-- Without LATERAL, you'd need a window function + filter.
-- LATERAL is often faster because it can use an index on
-- orders(user_id, created_at DESC) directly.`
        },
        {
          type: "heading",
          text: "Key Takeaways",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Window functions</strong>: Use for running totals, rankings, moving averages. They don't collapse rows like GROUP BY. Always wrap in a CTE to filter on window results.",
            "<strong>CTEs</strong>: Make complex queries readable. Recursive CTEs are the only way to walk trees in SQL. Always add a depth limit for safety.",
            "<strong>JSONB</strong>: Use for flexible metadata columns. Index with GIN for containment queries. Don't replace proper columns with JSONB for frequently queried fields.",
            "<strong>Full-text search</strong>: PostgreSQL's built-in FTS handles most search needs. Use setweight() to boost title matches over body matches. Consider Elasticsearch only for very advanced search requirements.",
            "<strong>LATERAL joins</strong>: The cleanest pattern for \"top N per group\" queries. Pairs well with indexes on the correlated column.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6: SQLAlchemy & Alembic
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "sqlalchemy-and-alembic",
      title: "SQLAlchemy & Alembic — The Python Database Layer",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "Raw SQL is powerful, but in a production Python application you need an abstraction layer that handles connection management, type safety, and schema migrations. SQLAlchemy is the de facto Python ORM — not because it hides SQL, but because it gives you a Pythonic interface <em>while still letting you think in SQL</em>. Alembic handles schema migrations — the process of evolving your database schema safely in production."
        },
        {
          type: "heading",
          text: "SQLAlchemy 2.0: The Modern API",
          level: 2
        },
        {
          type: "text",
          text: "SQLAlchemy 2.0 (released January 2023) is a major overhaul. The new API uses <code>mapped_column</code>, Python type hints, and <code>select()</code> instead of the old <code>Column()</code>, <code>relationship()</code> patterns, and <code>session.query()</code>. If you see tutorials using <code>Column(Integer, ...)</code> and <code>session.query(User).filter(...)</code> — that's the 1.x legacy style. We'll use 2.0 exclusively."
        },
        {
          type: "heading",
          text: "Async Engine Setup",
          level: 2
        },
        {
          type: "text",
          text: "FastAPI is async, so your database layer should be async too. SQLAlchemy's async support uses <code>asyncpg</code> as the underlying driver. The engine manages a connection pool; the session is a unit of work that tracks changes and commits them in a transaction."
        },
        {
          type: "code",
          lang: "python",
          filename: "database.py",
          code: `from sqlalchemy.ext.asyncio import (
    AsyncSession, create_async_engine, async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

class Base(DeclarativeBase):
    """All models inherit from this."""
    pass

def make_engine(url: str, pool_size: int = 10):
    return create_async_engine(
        url,
        pool_size=pool_size,       # max persistent connections
        max_overflow=5,             # extra connections under load
        pool_timeout=30,            # wait this long for a connection
        pool_recycle=1800,          # close connections older than 30 min
        pool_pre_ping=True,         # verify connection is alive before use
        echo=False,                 # True → log all SQL (dev only)
    )

# Separate engines for reads and writes
write_engine = make_engine(
    "postgresql+asyncpg://user:pass@primary:5432/mydb"
)
read_engine = make_engine(
    "postgresql+asyncpg://user:pass@replica:5432/mydb",
    pool_size=20,  # more read connections — reads are more frequent
)

WriteSession = async_sessionmaker(write_engine, expire_on_commit=False)
ReadSession = async_sessionmaker(read_engine, expire_on_commit=False)

# FastAPI dependency: write session (auto-commit on success)
async def get_db() -> AsyncSession:
    async with WriteSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# FastAPI dependency: read-only session (no commit needed)
async def get_read_db() -> AsyncSession:
    async with ReadSession() as session:
        yield session`
        },
        {
          type: "callout",
          variant: "warning",
          title: "expire_on_commit=False Is Critical for Async",
          text: "When <code>expire_on_commit=True</code> (the default), accessing any attribute after commit triggers a lazy load — which requires a synchronous database call. In async code, this raises an error. Always set <code>expire_on_commit=False</code> for async sessions."
        },
        {
          type: "heading",
          text: "Model Definitions: The 2.0 Way",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "models.py",
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
        Index("idx_users_email_active", "email",
              postgresql_where=text("is_active = true")),
    )

    id:         Mapped[int]      = mapped_column(primary_key=True)
    email:      Mapped[str]      = mapped_column(String(255), unique=True)
    name:       Mapped[str]      = mapped_column(String(255))
    tier:       Mapped[str]      = mapped_column(
                    String(50), server_default="free")
    is_active:  Mapped[bool]     = mapped_column(
                    server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
                    DateTime(timezone=True),
                    server_default=text("NOW()"))

    # lazy="raise" forces explicit eager loading — prevents N+1
    orders: Mapped[list[Order]] = relationship(
        back_populates="user", lazy="raise"
    )

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_orders_user_status", "user_id", "status"),
        Index("idx_orders_metadata", "metadata",
              postgresql_using="gin"),
        CheckConstraint("total >= 0", name="ck_orders_positive"),
    )

    id:         Mapped[uuid.UUID] = mapped_column(
                    UUID(as_uuid=True), primary_key=True,
                    default=uuid.uuid4)
    user_id:    Mapped[int]       = mapped_column(
                    ForeignKey("users.id"))
    status:     Mapped[str]       = mapped_column(
                    String(50), server_default="pending")
    total:      Mapped[Decimal]   = mapped_column(Numeric(12, 2))
    metadata_:  Mapped[dict]      = mapped_column(
                    "metadata", JSONB,
                    server_default=text("'{}'"))
    created_at: Mapped[datetime]  = mapped_column(
                    DateTime(timezone=True),
                    server_default=text("NOW()"))

    user: Mapped[User] = relationship(back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", lazy="raise",
        cascade="all, delete-orphan"
    )

class OrderItem(Base):
    __tablename__ = "order_items"

    id:         Mapped[int]       = mapped_column(primary_key=True)
    order_id:   Mapped[uuid.UUID] = mapped_column(
                    ForeignKey("orders.id"))
    product_id: Mapped[int]       = mapped_column(
                    ForeignKey("products.id"))
    quantity:   Mapped[int]       = mapped_column(Integer)
    unit_price: Mapped[Decimal]   = mapped_column(Numeric(10, 2))

    order: Mapped[Order] = relationship(back_populates="items")`
        },
        {
          type: "heading",
          text: "Querying: The Select API",
          level: 2
        },
        {
          type: "text",
          text: "SQLAlchemy 2.0 uses <code>select()</code> statements that mirror SQL structure. The session executes them and returns result objects. This is more explicit than the old <code>session.query()</code> style and works naturally with async."
        },
        {
          type: "code",
          lang: "python",
          filename: "queries.py",
          code: `from sqlalchemy import select, func, and_, update, delete
from sqlalchemy.orm import selectinload, joinedload

# Basic select with filter
async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()

# Eager load relationships (prevent N+1)
async def get_order_with_items(db: AsyncSession, order_id: UUID):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))  # 2 queries total
        .where(Order.id == order_id)
    )
    return result.scalar_one_or_none()

# joinedload for single objects (many-to-one)
async def get_order_with_user(db: AsyncSession, order_id: UUID):
    result = await db.execute(
        select(Order)
        .options(joinedload(Order.user))  # single JOIN query
        .where(Order.id == order_id)
    )
    return result.scalar_one_or_none()

# Aggregation with group by
async def spend_by_tier(db: AsyncSession):
    result = await db.execute(
        select(
            User.tier,
            func.count(Order.id).label("orders"),
            func.sum(Order.total).label("revenue"),
        )
        .join(Order, Order.user_id == User.id)
        .where(Order.status == "completed")
        .group_by(User.tier)
        .order_by(func.sum(Order.total).desc())
    )
    return result.all()  # list of Row objects

# Bulk update (single SQL statement, very fast)
async def deactivate_dormant_users(db: AsyncSession, days: int):
    await db.execute(
        update(User)
        .where(
            and_(
                User.is_active == True,
                User.created_at < func.now()
                    - func.make_interval(0, 0, 0, days),
            )
        )
        .values(is_active=False)
    )

# Pagination with keyset (cursor-based, no OFFSET)
async def list_orders_cursor(
    db: AsyncSession, user_id: int, after_id: UUID | None = None, limit: int = 20
):
    query = (
        select(Order)
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(limit)
    )
    if after_id:
        # Fetch the cursor order's created_at for comparison
        cursor = await db.get(Order, after_id)
        if cursor:
            query = query.where(
                (Order.created_at, Order.id) < (cursor.created_at, cursor.id)
            )
    result = await db.execute(query)
    return result.scalars().all()`
        },
        {
          type: "callout",
          variant: "info",
          title: "selectinload vs joinedload",
          text: "<strong>selectinload</strong>: Runs a second query with <code>WHERE id IN (...)</code>. Best for collections (one-to-many). Avoids cartesian product explosion.<br/><strong>joinedload</strong>: Uses a SQL JOIN. Best for single objects (many-to-one). Fetches everything in one query but can duplicate parent rows for collections.<br/>Default <strong>lazy='raise'</strong> on relationships forces you to choose explicitly — which prevents accidental N+1 queries."
        },
        {
          type: "heading",
          text: "The Repository Pattern",
          level: 2
        },
        {
          type: "text",
          text: "Encapsulate all database access in repository classes. Routes stay thin (validate input, call repo, return response). Testing is easy — mock the repository, not the database. This is the pattern used by most production FastAPI applications."
        },
        {
          type: "code",
          lang: "python",
          filename: "repositories.py",
          code: `class OrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, order_id: UUID) -> Order | None:
        result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self, user_id: int, total: Decimal, items: list[dict]
    ) -> Order:
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

# Route uses repository
@app.post("/orders")
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
):
    repo = OrderRepository(db)
    order = await repo.create(
        user_id=payload.user_id,
        total=payload.total,
        items=[item.model_dump() for item in payload.items],
    )
    return {"order_id": str(order.id)}`
        },
        {
          type: "heading",
          text: "Alembic: Schema Migrations",
          level: 2
        },
        {
          type: "text",
          text: "Alembic is SQLAlchemy's migration tool. It generates migration scripts by comparing your model definitions against the current database schema. Each migration is a Python file with <code>upgrade()</code> and <code>downgrade()</code> functions."
        },
        {
          type: "code",
          lang: "bash",
          filename: "alembic_setup.sh",
          code: `# Install
pip install alembic

# Initialize (creates alembic/ directory and alembic.ini)
alembic init alembic

# Edit alembic/env.py: point to your models
# target_metadata = Base.metadata

# Generate migration from model changes
alembic revision --autogenerate -m "create users and orders tables"

# Apply migrations
alembic upgrade head      # apply all pending
alembic upgrade +1        # apply next one
alembic downgrade -1      # rollback last one
alembic current           # show current revision
alembic history           # show migration history`
        },
        {
          type: "heading",
          text: "Writing Safe Production Migrations",
          level: 3
        },
        {
          type: "code",
          lang: "python",
          filename: "migrations/add_refund_columns.py",
          code: `"""Add refunded_at and refund_reason to orders.

Revision ID: a1b2c3d4e5f6
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '9z8y7x6w5v4u'

def upgrade() -> None:
    # Step 1: Add nullable columns (no lock, instant)
    op.add_column('orders',
        sa.Column('refunded_at', sa.DateTime(timezone=True),
                  nullable=True))
    op.add_column('orders',
        sa.Column('refund_reason', sa.Text, nullable=True))

    # Step 2: Backfill existing data
    op.execute("""
        UPDATE orders
        SET refunded_at = updated_at,
            refund_reason = 'Legacy refund'
        WHERE status = 'refunded'
          AND refunded_at IS NULL
    """)

    # Step 3: Create index CONCURRENTLY (no table lock)
    # CONCURRENTLY can't run inside a transaction
    # Set execution_options to disable transaction wrapping
    with op.get_context().autocommit_block():
        op.execute(sa.text(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
            "idx_orders_refunded_at ON orders(refunded_at) "
            "WHERE status = 'refunded'"
        ))

def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(sa.text(
            "DROP INDEX CONCURRENTLY IF EXISTS "
            "idx_orders_refunded_at"
        ))
    op.drop_column('orders', 'refund_reason')
    op.drop_column('orders', 'refunded_at')`
        },
        {
          type: "heading",
          text: "Zero-Downtime Migration Rules",
          level: 3
        },
        {
          type: "list",
          items: [
            "<strong>Adding a column</strong>: Always add as NULL first. Backfill data. Only then add NOT NULL constraint (or don't — nullable is fine in most cases).",
            "<strong>Removing a column</strong>: First deploy code that stops reading the column. Then drop it in a migration. Never drop a column that code still references.",
            "<strong>Adding an index</strong>: Always use <code>CREATE INDEX CONCURRENTLY</code>. Regular CREATE INDEX locks the table for writes.",
            "<strong>Renaming a column</strong>: Don't. Add a new column, backfill, update code to use new column, drop old column. Three separate deployments.",
            "<strong>Changing column type</strong>: Add a new column with the new type, backfill with CAST, update code, drop old column. ALTER COLUMN ... TYPE locks the table and rewrites it.",
            "<strong>Always test migrations</strong>: Run upgrade AND downgrade on a copy of production data before deploying.",
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview Answer: ORM vs Raw SQL",
          text: "\"I use SQLAlchemy for 90% of queries — it handles connection pooling, parameterized queries (SQL injection protection), and type mapping. For complex analytics queries with window functions and CTEs, I drop to raw SQL via <code>session.execute(text(...))</code> because the ORM's query builder can be more verbose than the SQL itself. The key is: ORM for CRUD operations, raw SQL for analytics and reporting.\""
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 7: Connection Pooling & Replication
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "connection-pooling-replication",
      title: "Connection Pooling & Replication — Scaling the Data Layer",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "A single PostgreSQL connection costs 5-10 MB of memory. If your API has 20 workers and each opens 10 connections, that's 200 connections using 1-2 GB of RAM just for connection overhead. And Postgres performance degrades significantly beyond 200-300 connections because each connection is a separate process. Connection pooling and replication are how you scale beyond this limit."
        },
        {
          type: "heading",
          text: "Why Connection Pooling Matters",
          level: 2
        },
        {
          type: "text",
          text: "Without pooling, every request opens a new TCP connection to Postgres, does a handshake, authenticates, executes a query, and closes the connection. This takes 5-20ms of overhead per request — often more than the query itself. A connection pool maintains a set of pre-established connections that are reused across requests."
        },
        {
          type: "diagram",
          title: "Without vs With Connection Pooling",
          content: `  WITHOUT POOLING:                    WITH POOLING:
  ┌───────┐                           ┌───────┐
  │Worker1│─── open/close ──→ PG      │Worker1│──┐
  │Worker2│─── open/close ──→ PG      │Worker2│──┤
  │Worker3│─── open/close ──→ PG      │Worker3│──┤
  │  ...  │─── open/close ──→ PG      │  ...  │──┤
  │Wkr 200│─── open/close ──→ PG      │Wkr 200│──┤
  └───────┘                           └───────┘  │
  200 PG connections                              │
  200 PG processes (1-2 GB)                       ▼
  5-20ms connect overhead/req         ┌──────────────┐
                                      │ Pool (20 conn)│
                                      └──────┬───────┘
                                             │
                                        ┌────┴────┐
                                        │ PG (20  │
                                        │ backend │
                                        │ procs)  │
                                        └─────────┘
                                      200 MB, 0ms connect`
        },
        {
          type: "heading",
          text: "Layer 1: Application-Level Pooling (SQLAlchemy / asyncpg)",
          level: 2
        },
        {
          type: "text",
          text: "SQLAlchemy's <code>create_async_engine</code> includes a built-in connection pool. This handles connection reuse within a single application process. It's the minimum you should always have."
        },
        {
          type: "code",
          lang: "python",
          filename: "app_pool.py",
          code: `from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost:5432/mydb",

    # Pool configuration
    pool_size=10,          # steady-state connections
    max_overflow=5,        # burst connections (pool_size + max_overflow = max)
    pool_timeout=30,       # seconds to wait for connection from pool
    pool_recycle=1800,     # close and recreate connections after 30 min
                           # (handles Postgres restart, firewall timeouts)
    pool_pre_ping=True,    # test connection before use
                           # (adds ~0.1ms but prevents stale connection errors)
)

# Pool status monitoring
from sqlalchemy import event

@event.listens_for(engine.sync_engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """Connection returned to pool."""
    pass  # Log or metric here

@event.listens_for(engine.sync_engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """Connection taken from pool."""
    pass  # Log or metric here`
        },
        {
          type: "heading",
          text: "Layer 2: External Pooling (PgBouncer)",
          level: 2
        },
        {
          type: "text",
          text: "PgBouncer sits between your application and PostgreSQL as a lightweight proxy. It multiplexes many client connections onto fewer Postgres connections. This is essential when you have multiple application instances (Kubernetes pods) that would otherwise each maintain their own pool."
        },
        {
          type: "comparison",
          headers: ["Pool Mode", "How It Works", "When to Use"],
          rows: [
            ["Session", "Client gets a dedicated PG connection for the entire session", "Only if you use LISTEN/NOTIFY, prepared statements, or SET commands"],
            ["Transaction", "Client gets a PG connection for the duration of one transaction, then it's returned to the pool", "Default choice — best balance of efficiency and compatibility"],
            ["Statement", "Connection returned after every single statement", "Only for simple auto-commit queries (no multi-statement transactions)"],
          ]
        },
        {
          type: "code",
          lang: "ini",
          filename: "pgbouncer.ini",
          code: `[databases]
mydb = host=postgres-primary port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool settings
pool_mode = transaction          ; return conn after each transaction
default_pool_size = 20           ; connections per user/db pair
min_pool_size = 5                ; keep at least 5 connections warm
max_client_conn = 1000           ; accept up to 1000 client connections
max_db_connections = 50          ; max connections to each database

; Timeouts
server_idle_timeout = 600        ; close idle PG connections after 10 min
client_idle_timeout = 0          ; never close idle client connections
query_timeout = 30               ; kill queries running longer than 30s
client_login_timeout = 60        ; time for client to authenticate

; Monitoring
stats_period = 60                ; log stats every 60 seconds
admin_users = pgbouncer_admin    ; who can run SHOW commands`
        },
        {
          type: "text",
          text: "With PgBouncer in transaction mode, 1000 API workers sharing 50 actual Postgres connections is typical. The math works because most workers are waiting for I/O or computing, not actively running queries — so 50 connections serve 1000 workers efficiently."
        },
        {
          type: "callout",
          variant: "warning",
          title: "PgBouncer Transaction Mode Limitations",
          text: "In transaction mode, connection state resets between transactions. This breaks: <strong>prepared statements</strong> (use <code>statement_cache_size=0</code> in asyncpg), <strong>SET commands</strong> (session-level settings don't persist), <strong>LISTEN/NOTIFY</strong> (subscription lost between transactions), and <strong>advisory locks</strong> (session-level locks released). Use session mode if you need these features."
        },
        {
          type: "heading",
          text: "Read Replicas: Scaling Reads",
          level: 2
        },
        {
          type: "text",
          text: "Most applications are read-heavy — 80-90% of queries are SELECTs. Read replicas are copies of the primary database that handle read queries, spreading the load. PostgreSQL uses <strong>WAL-based streaming replication</strong>: the primary streams write-ahead log records to replicas, which replay them to stay in sync."
        },
        {
          type: "diagram",
          title: "Primary-Replica Architecture",
          content: `  Application
  ┌──────────────────────────────────┐
  │  FastAPI Workers                 │
  │  ┌──────────────────────────┐   │
  │  │ Write queries (INSERT,   │───┼──→ PgBouncer ──→ Primary (RW)
  │  │ UPDATE, DELETE)          │   │                    │
  │  └──────────────────────────┘   │                    │ WAL stream
  │  ┌──────────────────────────┐   │                    ▼
  │  │ Read queries (SELECT)    │───┼──→ PgBouncer ──→ Replica 1 (RO)
  │  │                          │   │              ──→ Replica 2 (RO)
  │  └──────────────────────────┘   │
  └──────────────────────────────────┘

  Primary: handles all writes + some reads
  Replicas: handle read queries only
  WAL: changes stream from primary → replicas (~ms delay)`
        },
        {
          type: "heading",
          text: "Synchronous vs Asynchronous Replication",
          level: 3
        },
        {
          type: "comparison",
          headers: ["Mode", "How It Works", "Trade-off"],
          rows: [
            ["Asynchronous (default)", "Primary commits without waiting for replica confirmation. Replica may lag by a few ms to seconds.", "Fastest writes, but replica may serve stale data. Risk of data loss on primary crash."],
            ["Synchronous", "Primary waits for at least one replica to confirm WAL receipt before committing.", "No data loss, consistent reads, but writes are slower (network round-trip to replica)."],
          ]
        },
        {
          type: "text",
          text: "Most systems use asynchronous replication with application-level handling of replication lag. After a write, read from the primary for a few seconds (or use a read-your-writes session), then switch to replicas."
        },
        {
          type: "code",
          lang: "python",
          filename: "read_write_routing.py",
          code: `from sqlalchemy.ext.asyncio import (
    create_async_engine, async_sessionmaker, AsyncSession
)
from fastapi import Depends, Request

# Two engines: primary for writes, replica for reads
write_engine = create_async_engine(
    "postgresql+asyncpg://user:pass@pgbouncer-primary:6432/mydb",
    pool_size=10,
)
read_engine = create_async_engine(
    "postgresql+asyncpg://user:pass@pgbouncer-replica:6432/mydb",
    pool_size=20,
)

WriteSession = async_sessionmaker(write_engine, expire_on_commit=False)
ReadSession = async_sessionmaker(read_engine, expire_on_commit=False)

# Write dependency
async def get_write_db():
    async with WriteSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Read dependency
async def get_read_db():
    async with ReadSession() as session:
        yield session

# Usage: explicitly choose read vs write
@app.get("/orders/{order_id}")
async def get_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_read_db),  # reads from replica
):
    ...

@app.post("/orders")
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_write_db),  # writes to primary
):
    ...`
        },
        {
          type: "heading",
          text: "Failover: What Happens When the Primary Dies?",
          level: 2
        },
        {
          type: "text",
          text: "If the primary crashes, a replica must be promoted to become the new primary. In cloud-managed databases (RDS, Cloud SQL), this is automatic. For self-managed Postgres, tools like <strong>Patroni</strong> (with etcd/ZooKeeper for consensus) handle automatic failover."
        },
        {
          type: "list",
          items: [
            "<strong>Cloud-managed</strong> (RDS, Cloud SQL, Aurora): Automatic failover in 30-60 seconds. The DNS endpoint switches to the new primary.",
            "<strong>Patroni</strong>: Open-source HA solution. Uses DCS (etcd/ZooKeeper) for leader election. Promotes the most up-to-date replica. Failover in 5-30 seconds.",
            "<strong>pg_basebackup + pg_promote</strong>: Manual failover. Use when you need control. Run <code>SELECT pg_promote()</code> on the replica to make it primary.",
          ]
        },
        {
          type: "heading",
          text: "Monitoring Connection Pool Health",
          level: 2
        },
        {
          type: "code",
          lang: "sql",
          filename: "pool_monitoring.sql",
          code: `-- Current connections to Postgres
SELECT
    state,
    COUNT(*) AS connections,
    MAX(EXTRACT(EPOCH FROM NOW() - state_change)) AS longest_seconds
FROM pg_stat_activity
WHERE datname = 'mydb'
GROUP BY state;

-- Useful states:
-- active: running a query right now
-- idle: connected but not doing anything
-- idle in transaction: inside a transaction but not running a query
--   ← RED FLAG if this is high — means app isn't committing

-- Connection limit check
SELECT
    max_conn,
    used,
    max_conn - used AS available
FROM (
    SELECT
        setting::int AS max_conn
    FROM pg_settings WHERE name = 'max_connections'
) AS mc
CROSS JOIN (
    SELECT COUNT(*) AS used FROM pg_stat_activity
) AS uc;

-- PgBouncer monitoring (connect to PgBouncer admin)
-- SHOW POOLS;     -- connections per pool
-- SHOW CLIENTS;   -- client connections
-- SHOW SERVERS;   -- backend PG connections
-- SHOW STATS;     -- request counts, wait times`
        },
        {
          type: "heading",
          text: "Key Takeaways",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>App-level pool</strong>: SQLAlchemy's built-in pool handles connection reuse within one process. Always configure pool_size, max_overflow, and pool_pre_ping.",
            "<strong>PgBouncer</strong>: Essential when you have multiple app instances. Transaction mode is the default — multiplex 1000 clients onto 50 PG connections.",
            "<strong>Read replicas</strong>: WAL-based streaming replication. Use separate engines for reads and writes. Handle replication lag in the application.",
            "<strong>Failover</strong>: Cloud-managed = automatic. Self-managed = use Patroni. Always test your failover procedure before you need it.",
            "Monitor <code>pg_stat_activity</code> for \"idle in transaction\" connections — they hold locks and waste pool slots.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 8: MongoDB
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "mongodb",
      title: "MongoDB — Document Model, Aggregation, and Atlas Search",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "MongoDB stores data as flexible BSON documents (binary JSON). Unlike PostgreSQL's rigid rows-and-columns schema, each document in a MongoDB collection can have a different structure. This makes MongoDB natural for use cases where the data shape varies per record — product catalogs, event logs, content management, user-generated data with optional fields."
        },
        {
          type: "heading",
          text: "When to Choose MongoDB Over PostgreSQL",
          level: 2
        },
        {
          type: "text",
          text: "MongoDB is not a replacement for PostgreSQL. It's a complement for specific use cases. The decision should be driven by your data shape and access patterns, not hype."
        },
        {
          type: "comparison",
          headers: ["Choose MongoDB When", "Stay with PostgreSQL When"],
          rows: [
            ["Schema varies per document (product attrs differ by category)", "Schema is well-defined and stable"],
            ["Data is deeply nested and queried as a unit", "You need JOINs across many tables"],
            ["You need horizontal scaling (sharding) built-in", "Your data fits on one server (<100M rows)"],
            ["Write-heavy workloads with eventual consistency OK", "You need strict ACID transactions"],
            ["Event/log data with high ingestion rate", "Financial data requiring exact consistency"],
          ]
        },
        {
          type: "heading",
          text: "Document Model: Embedding vs Referencing",
          level: 2
        },
        {
          type: "text",
          text: "The most important MongoDB design decision is whether to <strong>embed</strong> related data inside a document or <strong>reference</strong> it in a separate collection. This is the MongoDB equivalent of normalization vs denormalization in relational databases."
        },
        {
          type: "comparison",
          headers: ["Strategy", "When to Use", "Example"],
          rows: [
            ["Embed (subdocument)", "Data is always read together, one-to-few relationship, child doesn't exist independently", "Order with line items, user with addresses, blog post with comments (if few)"],
            ["Reference (foreign key)", "Data is read independently, one-to-many (unbounded), data is updated frequently", "User → orders, product → reviews, author → blog posts"],
          ]
        },
        {
          type: "code",
          lang: "javascript",
          filename: "schema_design.js",
          code: `// EMBEDDED: Order with line items (always read together)
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  status: "completed",
  total: 149.97,
  items: [                          // embedded array
    { product_id: "SKU-001", name: "Keyboard", qty: 1, price: 79.99 },
    { product_id: "SKU-042", name: "Mouse", qty: 1, price: 29.99 },
    { product_id: "SKU-108", name: "Cable", qty: 2, price: 19.99 },
  ],
  shipping: {                       // embedded subdocument
    address: "123 Main St",
    city: "San Francisco",
    state: "CA",
    tracking: "1Z999AA10123456784"
  },
  created_at: ISODate("2024-03-15T10:30:00Z")
}

// REFERENCED: Product catalog (queried independently)
// products collection:
{
  _id: ObjectId("..."),
  sku: "SKU-001",
  name: "Mechanical Keyboard",
  category: "peripherals",
  price: 79.99,
  attrs: {                          // flexible attrs per category
    switch_type: "Cherry MX Blue",
    layout: "TKL",
    rgb: true,
    connectivity: ["USB-C", "Bluetooth"]
  }
}

// reviews collection (separate — unbounded, queried independently):
{
  _id: ObjectId("..."),
  product_id: ObjectId("..."),      // reference to product
  user_id: ObjectId("..."),
  rating: 5,
  text: "Great keyboard for coding",
  created_at: ISODate("2024-03-20T14:00:00Z")
}`
        },
        {
          type: "callout",
          variant: "warning",
          title: "The 16 MB Document Limit",
          text: "A single MongoDB document cannot exceed 16 MB. This means embedding unbounded arrays (like all reviews for a popular product) will eventually hit this limit. Rule of thumb: embed if the array is bounded (addresses, line items). Reference if unbounded (reviews, comments, logs)."
        },
        {
          type: "heading",
          text: "Indexes in MongoDB",
          level: 2
        },
        {
          type: "text",
          text: "MongoDB indexes work similarly to PostgreSQL — B-tree by default, with compound indexes, partial indexes, and text indexes. The key difference: MongoDB can index fields inside nested documents and arrays natively."
        },
        {
          type: "code",
          lang: "javascript",
          filename: "indexes.js",
          code: `// Single field index
db.users.createIndex({ email: 1 }, { unique: true });

// Compound index (order matters, like PostgreSQL)
db.orders.createIndex({ user_id: 1, status: 1, created_at: -1 });

// Index on nested document field
db.products.createIndex({ "attrs.switch_type": 1 });

// Multikey index: automatically indexes each array element
db.products.createIndex({ "attrs.connectivity": 1 });
// Query: db.products.find({ "attrs.connectivity": "Bluetooth" })

// Partial index: only index documents matching a filter
db.orders.createIndex(
  { created_at: -1 },
  { partialFilterExpression: { status: "pending" } }
);

// TTL index: auto-delete documents after expiry
db.sessions.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 86400 }  // delete after 24 hours
);

// Text index for full-text search (basic)
db.products.createIndex(
  { name: "text", description: "text" },
  { weights: { name: 10, description: 5 } }
);`
        },
        {
          type: "heading",
          text: "The Aggregation Pipeline",
          level: 2
        },
        {
          type: "text",
          text: "The aggregation pipeline is MongoDB's answer to SQL's GROUP BY, JOINs, and subqueries. It processes documents through a sequence of stages, where each stage transforms the data. Think of it as a Unix pipe: <code>$match | $group | $sort | $project</code>."
        },
        {
          type: "code",
          lang: "javascript",
          filename: "aggregation.js",
          code: `// Revenue by category for the last 30 days
db.orders.aggregate([
  // Stage 1: Filter (always put $match first for index use)
  { $match: {
    status: "completed",
    created_at: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
  }},

  // Stage 2: Unwind embedded items array (one doc per item)
  { $unwind: "$items" },

  // Stage 3: Lookup product details (like a LEFT JOIN)
  { $lookup: {
    from: "products",
    localField: "items.product_id",
    foreignField: "sku",
    as: "product"
  }},
  { $unwind: "$product" },

  // Stage 4: Group by category
  { $group: {
    _id: "$product.category",
    total_revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
    order_count: { $sum: 1 },
    unique_products: { $addToSet: "$product.sku" },
    avg_order_value: { $avg: { $multiply: ["$items.qty", "$items.price"] } }
  }},

  // Stage 5: Add computed fields
  { $addFields: {
    product_count: { $size: "$unique_products" }
  }},

  // Stage 6: Sort by revenue
  { $sort: { total_revenue: -1 } },

  // Stage 7: Clean up output
  { $project: {
    category: "$_id",
    total_revenue: { $round: ["$total_revenue", 2] },
    order_count: 1,
    product_count: 1,
    avg_order_value: { $round: ["$avg_order_value", 2] },
    _id: 0
  }}
]);`
        },
        {
          type: "heading",
          text: "Python Driver: Motor + Beanie ODM",
          level: 2
        },
        {
          type: "text",
          text: "<strong>Motor</strong> is the async MongoDB driver for Python (wraps PyMongo). <strong>Beanie</strong> is an ODM (Object-Document Mapper) that uses Pydantic models — it integrates naturally with FastAPI."
        },
        {
          type: "code",
          lang: "python",
          filename: "beanie_setup.py",
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
    attrs: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "products"   # collection name
        indexes = [
            [("name", "text"), ("category", "text")],  # text index
        ]

class Order(Document):
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: Indexed(str) = "pending"
    total: float
    items: list[dict] = []
    shipping: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "orders"
        indexes = [
            [("user_id", 1), ("status", 1), ("created_at", -1)],
        ]

# Initialize on FastAPI startup
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(
        database=client["myapp"],
        document_models=[Product, Order],
    )
    yield

app = FastAPI(lifespan=lifespan)

# CRUD with Beanie
@app.post("/products")
async def create_product(product: Product):
    await product.insert()
    return product

@app.get("/products")
async def list_products(category: str = None, limit: int = 20):
    query = Product.find(Product.category == category) if category else Product.find()
    return await query.sort(-Product.created_at).limit(limit).to_list()`
        },
        {
          type: "heading",
          text: "Atlas Search",
          level: 2
        },
        {
          type: "text",
          text: "MongoDB Atlas Search is a full Lucene-based search engine integrated into MongoDB Atlas (the managed service). It supports fuzzy matching, faceted search, autocomplete, and relevance scoring — capabilities that would otherwise require Elasticsearch. For self-hosted MongoDB, you're limited to the basic <code>$text</code> operator."
        },
        {
          type: "code",
          lang: "javascript",
          filename: "atlas_search.js",
          code: `// Atlas Search with fuzzy matching and highlighting
db.products.aggregate([
  { $search: {
    index: "product_search",
    compound: {
      must: [{
        text: {
          query: "wireless mechanical keyboard",
          path: ["name", "description"],
          fuzzy: { maxEdits: 1 },         // handles typos
        }
      }],
      filter: [{
        range: { path: "price", gte: 50, lte: 500 }
      }]
    },
    highlight: { path: ["name", "description"] },
    count: { type: "total" }
  }},
  { $project: {
    name: 1, price: 1, category: 1,
    score: { $meta: "searchScore" },
    highlights: { $meta: "searchHighlights" }
  }},
  { $limit: 20 }
]);`
        },
        {
          type: "heading",
          text: "Change Streams: Reacting to Data Changes",
          level: 2
        },
        {
          type: "text",
          text: "Change streams let you watch a collection for real-time changes (inserts, updates, deletes). They're built on MongoDB's oplog and are the foundation for event-driven architectures, cache invalidation, and real-time notifications."
        },
        {
          type: "code",
          lang: "python",
          filename: "change_stream.py",
          code: `from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["myapp"]

async def watch_orders():
    """React to order status changes in real-time."""
    pipeline = [
        {"$match": {
            "operationType": {"$in": ["update", "insert"]},
            "fullDocument.status": {"$in": ["completed", "cancelled"]}
        }}
    ]
    async with db["orders"].watch(
        pipeline, full_document="updateLookup"
    ) as stream:
        async for change in stream:
            doc = change["fullDocument"]
            if doc["status"] == "completed":
                await send_confirmation_email(doc["user_id"])
            elif doc["status"] == "cancelled":
                await refund_payment(doc["order_id"])`
        },
        {
          type: "heading",
          text: "Key Takeaways",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Document model</strong>: Embed when data is read together and bounded. Reference when data is queried independently or unbounded.",
            "<strong>Aggregation pipeline</strong>: Always put $match first (for index use). $unwind flattens arrays. $lookup is a LEFT JOIN. $group is GROUP BY.",
            "<strong>Indexes</strong>: Compound indexes, multikey (array) indexes, TTL indexes for auto-expiry, partial indexes for subsets.",
            "<strong>Atlas Search</strong>: Full Lucene-powered search in Atlas. For self-hosted, basic $text search is available.",
            "<strong>Change streams</strong>: Real-time event processing. Use for cache invalidation, notifications, and event-driven workflows.",
            "Don't use MongoDB as a general-purpose SQL replacement. Use it for genuinely document-shaped data.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 9: Redis
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "redis",
      title: "Redis — In-Memory Speed, Data Structures, and Patterns",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "Redis is an in-memory data structure server. That description undersells it dramatically. Redis is the Swiss Army knife that appears in every production architecture — as a cache, session store, rate limiter, message broker, leaderboard engine, distributed lock coordinator, and more. Its sub-millisecond latency and rich data structure support make it irreplaceable."
        },
        {
          type: "heading",
          text: "Why Redis Is So Fast",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>In-memory</strong>: All data lives in RAM. No disk I/O for reads. A Redis GET takes ~0.1ms vs ~1-5ms for a PostgreSQL SELECT.",
            "<strong>Single-threaded event loop</strong>: No locking overhead. Operations are atomic by design. This seems like a limitation but it simplifies everything.",
            "<strong>Efficient data structures</strong>: Sorted sets use skip lists, hashes use zip lists for small sizes. Redis is heavily optimized for common access patterns.",
            "<strong>I/O multiplexing</strong>: Uses epoll/kqueue to handle thousands of concurrent connections on a single thread.",
          ]
        },
        {
          type: "heading",
          text: "Data Structures: Not Just Key-Value",
          level: 2
        },
        {
          type: "text",
          text: "Redis supports 10+ data types. Each has specific commands and time complexities. Choosing the right data structure is the key to using Redis effectively."
        },
        {
          type: "comparison",
          headers: ["Type", "Use Case", "Key Commands", "Complexity"],
          rows: [
            ["String", "Cache, counters, flags", "GET, SET, INCR, SETEX, MGET", "O(1)"],
            ["Hash", "Object storage, sessions", "HGET, HSET, HMGET, HGETALL", "O(1) per field"],
            ["List", "Queues, recent items", "LPUSH, RPOP, LRANGE, LTRIM", "O(1) push/pop"],
            ["Set", "Unique collections, tags", "SADD, SMEMBERS, SINTER, SUNION", "O(1) add/check"],
            ["Sorted Set", "Leaderboards, ranking, scheduling", "ZADD, ZRANGE, ZRANK, ZINCRBY", "O(log N)"],
            ["Stream", "Event log, message queue", "XADD, XREAD, XREADGROUP", "O(1) add, O(N) read"],
            ["HyperLogLog", "Cardinality estimation", "PFADD, PFCOUNT", "O(1), ~0.81% error"],
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "redis_data_structures.py",
          code: `import redis.asyncio as redis

r = redis.from_url("redis://localhost:6379", decode_responses=True)

# ── Strings: Cache + Counters ──────────────────────────────────
await r.setex("user:1:profile", 3600, '{"name":"Alice","tier":"pro"}')
profile = await r.get("user:1:profile")

# Atomic counter
await r.incr("page:home:views")           # +1
await r.incrby("api:requests:today", 5)   # +5
count = await r.get("page:home:views")     # "42"

# ── Hashes: Object-like storage ────────────────────────────────
await r.hset("session:abc123", mapping={
    "user_id": "1",
    "email": "alice@example.com",
    "tier": "pro",
    "login_at": "2024-03-15T10:00:00Z",
})
await r.expire("session:abc123", 86400)  # 24h TTL
email = await r.hget("session:abc123", "email")
all_fields = await r.hgetall("session:abc123")

# ── Lists: Queue + Recent Items ────────────────────────────────
# Task queue (producer-consumer pattern)
await r.lpush("queue:emails", '{"to":"alice@...","subject":"Welcome"}')
task = await r.brpop("queue:emails", timeout=5)  # blocking pop

# Recent activity feed (keep last 100 items)
await r.lpush("user:1:activity", "Purchased Keyboard")
await r.ltrim("user:1:activity", 0, 99)  # keep only last 100
recent = await r.lrange("user:1:activity", 0, 9)  # last 10

# ── Sets: Tags + Unique Collections ───────────────────────────
await r.sadd("product:1:tags", "wireless", "mechanical", "rgb")
await r.sadd("product:2:tags", "wireless", "ergonomic")
# Products with BOTH wireless AND mechanical:
common = await r.sinter("product:1:tags", "product:2:tags")  # {"wireless"}

# ── Sorted Sets: Leaderboard ──────────────────────────────────
await r.zadd("leaderboard", {"alice": 2500, "bob": 1800, "charlie": 3200})
await r.zincrby("leaderboard", 150, "alice")  # alice now 2650
top_3 = await r.zrevrange("leaderboard", 0, 2, withscores=True)
rank = await r.zrevrank("leaderboard", "alice")  # 0-indexed

# ── HyperLogLog: Count unique visitors (probabilistic) ────────
await r.pfadd("unique:2024-03-15", "user:1", "user:2", "user:1")
count = await r.pfcount("unique:2024-03-15")  # ~2 (deduped)`
        },
        {
          type: "heading",
          text: "Pattern 1: Cache-Aside (Read-Through Caching)",
          level: 2
        },
        {
          type: "text",
          text: "The most common Redis pattern. Check Redis first. On miss, query the database, store in Redis, return. On write, invalidate the cache. This is called \"cache-aside\" because the application manages the cache explicitly."
        },
        {
          type: "code",
          lang: "python",
          filename: "cache_aside.py",
          code: `import json
from typing import Any

async def get_product(product_id: int) -> dict | None:
    cache_key = f"product:{product_id}"

    # 1. Check cache
    cached = await r.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Cache miss → query database
    async with ReadSession() as db:
        result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            return None

    # 3. Store in cache with TTL
    data = {"id": product.id, "name": product.name,
            "price": float(product.price)}
    await r.setex(cache_key, 3600, json.dumps(data))

    return data

async def update_product(product_id: int, updates: dict):
    # 1. Update database
    async with WriteSession() as db:
        await db.execute(
            update(Product)
            .where(Product.id == product_id)
            .values(**updates)
        )
        await db.commit()

    # 2. Invalidate cache (don't update — avoids race conditions)
    await r.delete(f"product:{product_id}")`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Cache Stampede Prevention",
          text: "When a popular cache key expires, hundreds of concurrent requests all miss the cache and hit the database simultaneously. This is a <strong>cache stampede</strong>. Solutions: (1) use a distributed lock so only one request refreshes the cache, (2) set a short \"stale\" TTL where the old value is served while one request refreshes in the background, (3) never expire hot keys — refresh them proactively with a background job."
        },
        {
          type: "heading",
          text: "Pattern 2: Rate Limiting (Sliding Window)",
          level: 2
        },
        {
          type: "text",
          text: "Rate limiting protects your API from abuse. The sliding window algorithm using sorted sets is the gold standard — it's more accurate than fixed windows because there's no burst at window boundaries."
        },
        {
          type: "code",
          lang: "python",
          filename: "rate_limiter.py",
          code: `import time
import uuid

# Lua script for atomic sliding window rate limit
RATE_LIMIT_SCRIPT = """
local key     = KEYS[1]
local now     = tonumber(ARGV[1])
local window  = tonumber(ARGV[2])
local limit   = tonumber(ARGV[3])
local req_id  = ARGV[4]

-- Remove entries outside the window
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

-- Count remaining entries
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, req_id)
    redis.call('EXPIRE', key, window + 1)
    return {1, limit - count - 1}   -- allowed, remaining
else
    return {0, 0}                    -- denied, remaining
end
"""

async def check_rate_limit(
    identifier: str,
    limit: int = 100,
    window: int = 60,
) -> tuple[bool, int]:
    """Returns (allowed, remaining)."""
    key = f"ratelimit:{identifier}"
    now = time.time()
    result = await r.eval(
        RATE_LIMIT_SCRIPT, 1, key,
        now, window, limit, str(uuid.uuid4())
    )
    return bool(result[0]), int(result[1])`
        },
        {
          type: "heading",
          text: "Pattern 3: Distributed Lock",
          level: 2
        },
        {
          type: "text",
          text: "When multiple workers process the same data, you need a distributed lock to prevent duplicate processing. Redis's <code>SET NX EX</code> (set if not exists, with expiry) is the building block. The critical part: release the lock only if you're the one who acquired it — use a Lua script to make this atomic."
        },
        {
          type: "code",
          lang: "python",
          filename: "distributed_lock.py",
          code: `import asyncio
import uuid
from contextlib import asynccontextmanager

# Atomic release: only delete if we own the lock
RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

@asynccontextmanager
async def distributed_lock(
    resource: str,
    ttl: int = 30,
    retries: int = 3,
    retry_delay: float = 0.2,
):
    """Acquire a distributed lock with retry."""
    key = f"lock:{resource}"
    token = str(uuid.uuid4())

    for attempt in range(retries):
        acquired = await r.set(key, token, nx=True, ex=ttl)
        if acquired:
            try:
                yield token
            finally:
                await r.eval(RELEASE_SCRIPT, 1, key, token)
            return
        await asyncio.sleep(retry_delay * (2 ** attempt))

    raise TimeoutError(f"Could not acquire lock: {resource}")

# Usage: prevent duplicate payment processing
async def process_payment(payment_id: str, amount: float):
    async with distributed_lock(f"payment:{payment_id}", ttl=60):
        # Check idempotency
        if await r.exists(f"processed:{payment_id}"):
            return {"status": "already_processed"}

        result = await charge_card(payment_id, amount)

        # Mark as processed (24h idempotency window)
        await r.setex(f"processed:{payment_id}", 86400, "1")
        return {"status": "success"}`
        },
        {
          type: "heading",
          text: "Pattern 4: Pub/Sub and Streams",
          level: 2
        },
        {
          type: "text",
          text: "Redis Pub/Sub is fire-and-forget messaging — subscribers get messages only while connected. Redis Streams are a durable, persistent log (like a lightweight Kafka) with consumer groups, acknowledgments, and replay."
        },
        {
          type: "code",
          lang: "python",
          filename: "pubsub_streams.py",
          code: `# ── Pub/Sub: Real-time notifications ───────────────────────────

# Publisher
async def notify_order_update(order_id: str, status: str):
    await r.publish("orders", json.dumps({
        "order_id": order_id,
        "status": status,
        "timestamp": datetime.utcnow().isoformat()
    }))

# Subscriber (in a background task)
async def listen_order_updates():
    pubsub = r.pubsub()
    await pubsub.subscribe("orders")
    async for message in pubsub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            await push_websocket_notification(data)

# ── Streams: Durable event log with consumer groups ───────────

# Producer: add events to stream
await r.xadd("events:orders", {
    "order_id": "abc123",
    "event": "completed",
    "total": "149.97",
})

# Create consumer group (once)
await r.xgroup_create("events:orders", "email-service", id="0", mkstream=True)

# Consumer: read and acknowledge events
async def consume_events():
    while True:
        entries = await r.xreadgroup(
            "email-service",       # group
            "worker-1",            # consumer name
            {"events:orders": ">"}, # read new entries
            count=10,
            block=5000,            # block 5s if no new entries
        )
        for stream, messages in entries:
            for msg_id, data in messages:
                await send_order_email(data)
                # Acknowledge: message won't be redelivered
                await r.xack("events:orders", "email-service", msg_id)`
        },
        {
          type: "heading",
          text: "Persistence: RDB vs AOF",
          level: 2
        },
        {
          type: "text",
          text: "Redis is in-memory, but it can persist data to disk. Two mechanisms:"
        },
        {
          type: "comparison",
          headers: ["Mechanism", "How It Works", "Trade-off"],
          rows: [
            ["RDB (snapshots)", "Periodic point-in-time snapshots. Fork + write to disk.", "Fast recovery, but lose data since last snapshot (typically 5 min)"],
            ["AOF (append-only file)", "Log every write command. Replay on restart.", "Minimal data loss (configurable: every sec or every command), but slower recovery and larger files"],
            ["RDB + AOF (recommended)", "Use AOF for durability, RDB for fast restarts and backups.", "Best of both worlds. Redis uses AOF for recovery if both exist."],
          ]
        },
        {
          type: "callout",
          variant: "info",
          title: "Redis Is Not a Primary Database",
          text: "Even with persistence, Redis should not be your source of truth. Use it as a cache and coordination layer. If Redis loses data, the application should be able to rebuild state from PostgreSQL or MongoDB. Design your system so Redis loss causes a performance degradation, not data loss."
        },
        {
          type: "heading",
          text: "Redis Cluster and Sentinel",
          level: 2
        },
        {
          type: "text",
          text: "<strong>Redis Sentinel</strong> provides high availability — it monitors a primary and replicas, and automatically promotes a replica if the primary fails. <strong>Redis Cluster</strong> provides horizontal scaling — it shards data across multiple nodes using hash slots (16384 slots distributed across nodes). Use Sentinel for HA with a single dataset that fits in memory. Use Cluster when your data exceeds one node's RAM."
        },
        {
          type: "heading",
          text: "Key Takeaways",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Data structures</strong>: Use the right one — strings for simple cache, hashes for objects, sorted sets for leaderboards, streams for event logs. Don't just use strings for everything.",
            "<strong>Caching</strong>: Cache-aside is the default pattern. Invalidate on write (don't update). Prevent cache stampedes with locks or stale serving.",
            "<strong>Rate limiting</strong>: Sliding window with sorted sets and Lua scripts. Atomic operations prevent race conditions.",
            "<strong>Distributed locks</strong>: SET NX EX + Lua release script. TTL must exceed work duration. Design for idempotency in case lock expires.",
            "<strong>Pub/Sub vs Streams</strong>: Pub/Sub for fire-and-forget real-time messages. Streams for durable event processing with consumer groups.",
            "<strong>Persistence</strong>: Use RDB + AOF. But Redis is a cache, not a primary database — always be able to rebuild from your source of truth.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 10: System Design — Database Architecture at Scale
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "database-system-design",
      title: "System Design — Database Architecture at Scale",
      readTime: "22 min",
      content: [
        {
          type: "text",
          text: "In system design interviews and real production systems, database choices are where architecture decisions have the most lasting impact. Changing your API framework is a refactor. Changing your database architecture is a migration that takes months. This lesson covers the patterns, trade-offs, and decision frameworks you'll need for both interviews and production."
        },
        {
          type: "heading",
          text: "Pattern 1: The Standard Web Backend",
          level: 2
        },
        {
          type: "text",
          text: "Most applications start here and many never need to leave. One PostgreSQL instance handles all reads and writes. Redis sits in front for caching. This architecture handles surprising scale — a well-optimized Postgres can serve 10K queries/second on commodity hardware."
        },
        {
          type: "diagram",
          title: "Standard Web Backend",
          content: `  Clients
     │
     ▼
  ┌─────────┐
  │  API     │
  │  (FastAPI)│
  └──┬────┬──┘
     │    │
     ▼    ▼
  ┌─────┐ ┌─────────┐
  │Redis│ │PostgreSQL│
  │Cache│ │ (single) │
  └─────┘ └─────────┘

  Scale: ~10K QPS
  Data: < 100M rows
  Team: 1-5 engineers`
        },
        {
          type: "heading",
          text: "Pattern 2: Read Replicas + Cache Layer",
          level: 2
        },
        {
          type: "text",
          text: "When reads dominate (80-95% of traffic), add read replicas. Writes still go to the primary. Reads are distributed across replicas. Redis cache reduces database load further by serving hot data entirely from memory."
        },
        {
          type: "diagram",
          title: "Read-Heavy Architecture",
          content: `  Clients
     │
     ▼
  ┌───────────────────────┐
  │   API Layer (FastAPI)  │
  │   Write ──→ Primary    │
  │   Read  ──→ Replicas   │
  └──┬─────────┬──────────┘
     │         │
     ▼         ▼
  ┌─────┐  ┌─────────────────────────┐
  │Redis│  │    PostgreSQL            │
  │     │  │  ┌─────────┐            │
  │ L1  │  │  │ Primary │──WAL──→ Replica 1
  │Cache│  │  │  (RW)   │──WAL──→ Replica 2
  │     │  │  └─────────┘──WAL──→ Replica 3
  └─────┘  └─────────────────────────┘

  Scale: ~50K QPS reads, ~5K QPS writes
  Handle replication lag: read-your-writes from primary`
        },
        {
          type: "heading",
          text: "Pattern 3: CQRS (Command Query Responsibility Segregation)",
          level: 2
        },
        {
          type: "text",
          text: "CQRS separates the write model from the read model. Writes go to a normalized PostgreSQL database optimized for consistency. Reads come from a denormalized store (another Postgres instance, Elasticsearch, or Redis) optimized for query speed. An event bus keeps them in sync."
        },
        {
          type: "diagram",
          title: "CQRS Architecture",
          content: `  Commands (writes)              Queries (reads)
       │                              │
       ▼                              ▼
  ┌─────────┐                   ┌─────────────┐
  │ Write   │                   │  Read API    │
  │ Service │                   │  (FastAPI)   │
  └────┬────┘                   └──────┬──────┘
       │                               │
       ▼                               ▼
  ┌─────────┐    Events         ┌─────────────┐
  │PostgreSQL│──→ Kafka ──→     │ Read Store   │
  │(normalized│   or Redis      │ (Denormalized│
  │ source of │   Streams       │  Postgres,   │
  │  truth)  │                  │  Elasticsearch│
  └──────────┘                  │  or Redis)   │
                                └─────────────┘

  Write: normalized, ACID, single source of truth
  Read: denormalized, fast, eventually consistent
  Sync: events propagate changes (1-100ms delay)`
        },
        {
          type: "text",
          text: "CQRS adds complexity. Use it when: (1) read and write patterns are fundamentally different (writes are normalized, reads need denormalized views), (2) you need different scaling for reads and writes, or (3) you need different storage engines for different query types (SQL for transactions, Elasticsearch for search)."
        },
        {
          type: "heading",
          text: "Pattern 4: Sharding",
          level: 2
        },
        {
          type: "text",
          text: "When data exceeds what a single node can handle (typically 1-10 TB), you split it across multiple database instances. Each shard holds a subset of the data, determined by a shard key."
        },
        {
          type: "comparison",
          headers: ["Sharding Strategy", "How It Works", "Pro", "Con"],
          rows: [
            ["Hash-based", "hash(shard_key) % N shards", "Even data distribution", "Range queries hit all shards. Resharding is painful."],
            ["Range-based", "Key ranges: A-M → shard 1, N-Z → shard 2", "Range queries on shard key are efficient", "Hot spots if distribution is uneven"],
            ["Geo-based", "Region determines shard: US → shard-us, EU → shard-eu", "Data locality, compliance (GDPR)", "Cross-region queries are slow"],
            ["Tenant-based", "Each tenant (company) on its own shard", "Strong isolation, easy per-tenant backup/restore", "Uneven shard sizes (large vs small tenants)"],
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "Sharding Is a Last Resort",
          text: "Sharding breaks JOINs across shards, makes transactions much harder, complicates migrations, and adds operational overhead. Before sharding: (1) optimize queries and indexes, (2) add read replicas, (3) partition large tables (PostgreSQL native partitioning), (4) archive old data, (5) use connection pooling. A well-tuned single PostgreSQL instance handles 100M+ rows. Don't shard at 10M rows."
        },
        {
          type: "heading",
          text: "Pattern 5: Polyglot Persistence",
          level: 2
        },
        {
          type: "text",
          text: "Real production systems use multiple databases, each for its strengths. Here's how they fit together in an AI-powered e-commerce platform."
        },
        {
          type: "diagram",
          title: "Polyglot Persistence — AI E-Commerce Platform",
          content: `  ┌─────────────────────────────────────────────────────────┐
  │                   API Gateway                          │
  └──┬──────────┬───────────┬──────────┬─────────────────┘
     │          │           │          │
     ▼          ▼           ▼          ▼
  ┌──────┐  ┌──────┐  ┌────────┐  ┌──────────┐
  │Users │  │Search│  │Recommend│  │Analytics │
  │Orders│  │      │  │ation   │  │          │
  └──┬───┘  └──┬───┘  └────┬───┘  └────┬─────┘
     │         │           │           │
     ▼         ▼           ▼           ▼
  ┌──────┐  ┌──────┐  ┌────────┐  ┌──────────┐
  │Postgres│ │Elastic│ │pgvector│  │ClickHouse│
  │       │  │search │  │(Postgres│  │  or      │
  │Source │  │Full-  │  │extension│  │ MongoDB  │
  │of     │  │text,  │  │for ML  │  │ (event   │
  │truth  │  │facets │  │embeddings│ │  logs)   │
  └───────┘  └──────┘  └────────┘  └──────────┘
      │
      └──────→ Redis (cache + sessions + rate limits + locks)`
        },
        {
          type: "heading",
          text: "CAP Theorem: The Distributed Systems Constraint",
          level: 2
        },
        {
          type: "text",
          text: "CAP theorem states that a distributed system can provide at most two of three guarantees: <strong>Consistency</strong> (every read returns the most recent write), <strong>Availability</strong> (every request gets a response), and <strong>Partition tolerance</strong> (system works despite network failures between nodes). Since network partitions are inevitable in distributed systems, you're choosing between CP and AP."
        },
        {
          type: "comparison",
          headers: ["Choice", "Databases", "Behavior During Partition"],
          rows: [
            ["CP (Consistent)", "PostgreSQL, MongoDB (replica sets), etcd", "Returns error rather than stale data. Writes may block."],
            ["AP (Available)", "Cassandra, DynamoDB, CouchDB", "Returns potentially stale data, accepts all writes. Reconciles later."],
          ]
        },
        {
          type: "text",
          text: "In practice, CAP is a simplification. Real systems make nuanced trade-offs. PostgreSQL with async replicas is CP for the primary but AP for reads from replicas (they may lag). DynamoDB lets you choose strong or eventual consistency per query. The interview answer should acknowledge this nuance."
        },
        {
          type: "heading",
          text: "Event Sourcing",
          level: 2
        },
        {
          type: "text",
          text: "Instead of storing the current state of an entity, store the sequence of events that led to that state. The current state is derived by replaying events. This is the data model behind banking ledgers, Git version control, and Kafka-based architectures."
        },
        {
          type: "code",
          lang: "sql",
          filename: "event_sourcing.sql",
          code: `-- Event store (append-only)
CREATE TABLE account_events (
    id          BIGSERIAL PRIMARY KEY,
    account_id  UUID NOT NULL,
    event_type  TEXT NOT NULL,  -- 'opened', 'deposited', 'withdrawn', 'closed'
    amount      NUMERIC(12, 2),
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only inserts, never updates or deletes
-- Index for replaying events for a specific account
CREATE INDEX idx_events_account ON account_events(account_id, id);

-- Derive current balance by replaying events
SELECT account_id,
    SUM(CASE
        WHEN event_type = 'deposited' THEN amount
        WHEN event_type = 'withdrawn' THEN -amount
        ELSE 0
    END) AS current_balance,
    MAX(created_at) AS last_activity
FROM account_events
WHERE account_id = 'abc-123'
GROUP BY account_id;

-- Materialized view for fast reads (updated periodically)
CREATE MATERIALIZED VIEW account_balances AS
SELECT account_id,
    SUM(CASE
        WHEN event_type = 'deposited' THEN amount
        WHEN event_type = 'withdrawn' THEN -amount
        ELSE 0
    END) AS balance,
    COUNT(*) AS transaction_count,
    MAX(created_at) AS last_activity
FROM account_events
GROUP BY account_id;

REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;`
        },
        {
          type: "heading",
          text: "System Design Interview Framework: Database Questions",
          level: 2
        },
        {
          type: "text",
          text: "When a system design question involves databases, walk through this framework:"
        },
        {
          type: "list",
          items: [
            "<strong>1. Identify data types</strong>: What kinds of data? (structured, semi-structured, time-series, search, cache)",
            "<strong>2. Estimate scale</strong>: How many rows? Read/write ratio? QPS? Data size?",
            "<strong>3. Choose databases</strong>: PostgreSQL for structured + transactions, MongoDB for documents, Redis for cache + coordination, Elasticsearch for search, ClickHouse/TimescaleDB for analytics",
            "<strong>4. Design schema</strong>: Normalized for writes, denormalized for reads. Define primary keys, indexes, constraints.",
            "<strong>5. Address consistency</strong>: Which data needs ACID? Which can be eventually consistent? Where do you need distributed locks?",
            "<strong>6. Plan for scale</strong>: Read replicas, connection pooling, caching layer, partitioning. Sharding only when single-node is exhausted.",
            "<strong>7. Handle failures</strong>: Failover strategy, backup/restore, data loss tolerance per data type.",
          ]
        },
        {
          type: "heading",
          text: "Example: Design the Database Layer for Uber",
          level: 3
        },
        {
          type: "code",
          lang: "text",
          filename: "uber_design.txt",
          code: `Data Types:
├── User profiles, payment methods  → PostgreSQL (ACID, structured)
├── Ride history, receipts          → PostgreSQL (financial data)
├── Driver locations (real-time)    → Redis Geo + sorted sets
├── Ride matching events            → Kafka → Redis (real-time)
├── Surge pricing zones             → Redis (fast reads, updated frequently)
├── Trip logs / analytics           → ClickHouse (columnar, time-series)
├── Search (restaurants, places)    → Elasticsearch (full-text, geo)
└── Session / auth tokens           → Redis (TTL, fast validation)

Scale Decisions:
├── Users table: 100M rows → single Postgres, no sharding needed
├── Rides table: 10B rows → partition by created_at (monthly)
│   with older partitions moved to cold storage
├── Driver locations: 1M active drivers, updates every 3 sec
│   → Redis Geo (GEOADD / GEOSEARCH), not in Postgres
├── Read/write split: 90% reads → 3 read replicas per region
└── Connection pooling: PgBouncer (1000 app connections → 50 PG)

Consistency:
├── Payment: SERIALIZABLE isolation, distributed lock on rider wallet
├── Ride matching: eventual consistency OK (driver can accept/reject)
├── Driver location: last-write-wins in Redis (no conflict resolution)
└── Analytics: eventually consistent (minutes of delay acceptable)`
        },
        {
          type: "heading",
          text: "Key Takeaways",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Start simple</strong>: PostgreSQL + Redis handles most applications up to significant scale. Don't over-engineer on day one.",
            "<strong>Scale reads first</strong>: Read replicas and caching solve 90% of scaling problems. Writes rarely need sharding.",
            "<strong>CQRS when needed</strong>: Separate read and write models when access patterns diverge significantly.",
            "<strong>Shard as a last resort</strong>: Exhaust all other options first. When you do shard, choose the shard key very carefully — it's nearly impossible to change later.",
            "<strong>Polyglot persistence</strong>: Use each database for its strength. PostgreSQL for transactions, Redis for speed, Elasticsearch for search, MongoDB for flexible documents.",
            "<strong>CAP is a spectrum</strong>: Real systems make per-query consistency choices. Know the trade-offs for each database you use.",
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview Answer: Database Architecture",
          text: "\"I start with PostgreSQL as the source of truth for all structured data — users, orders, payments. Redis sits in front as a cache, session store, and rate limiter. For search, I'd add Elasticsearch or use Postgres full-text search depending on requirements. For high-volume event data, I'd use MongoDB or a time-series database. The key principle: each database does what it's best at, and the application layer orchestrates between them. I'd add read replicas before considering sharding, and shard only when single-node options are exhausted.\""
        },
      ]
    },

  ]; // end m.lessons
})();
