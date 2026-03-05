// Patches the Kafka & Message Queues module (m9) with full tutorial lesson content.
// Loaded after curriculum.js. m9 = CURRICULUM.phases[2].modules[1]
(function patchKafkaLessons() {
  const m = CURRICULUM.phases[2].modules[1]; // phase-3 (index 2), second module (m9)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-architecture",
      title: "Kafka Architecture: How It Works Under the Hood",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Apache Kafka is a distributed event streaming platform built around a deceptively simple idea: append-only, ordered logs. Before Kafka, moving data between systems meant point-to-point integrations — each producer coupled to each consumer. With 10 services, you end up with up to 45 bespoke pipelines. Kafka decouples producers from consumers behind a durable, replayable log, letting you add new consumers without touching producers at all."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why Kafka for AI Backend Engineers?",
          text: "Real-time ML pipelines, feature stores, model monitoring, and RAG ingestion all share one requirement: reliable, high-throughput event streams. Kafka handles 10M+ events/day on modest hardware, retains events for days/weeks so you can replay them for retraining, and integrates natively with Flink, Spark, and Python consumers. It's the connective tissue of modern data infrastructure."
        },
        {
          type: "heading",
          text: "Core Concepts",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Concept", "What it is", "Analogy"],
          rows: [
            ["Event / Message", "An immutable record: key, value, timestamp, headers", "A row appended to a spreadsheet — never overwritten"],
            ["Topic", "A named, ordered, durable log that stores events", "A named spreadsheet — producers append, consumers read"],
            ["Partition", "A topic split into N ordered sublogs, each on a different broker", "N separate spreadsheets, each independently ordered"],
            ["Offset", "A monotonically increasing integer — the position of an event in a partition", "The row number in a spreadsheet"],
            ["Broker", "A Kafka server process; a cluster has 3–12+ brokers", "A database server node"],
            ["Producer", "A client that appends events to topics", "A script that writes rows"],
            ["Consumer", "A client that reads events from topics, tracking its own offset", "A script that reads rows from a bookmark"],
            ["Consumer Group", "Multiple consumers that share a topic's partitions — each partition is owned by one member", "A team of readers, each responsible for a section"],
            ["Retention", "How long (or how much data) Kafka keeps events before deleting them", "The spreadsheet keeps N months of rows then auto-deletes old ones"],
          ]
        },
        {
          type: "heading",
          text: "Physical Architecture",
          level: 2
        },
        {
          type: "diagram",
          code: `  ┌────────────────────────────────────────────────────────────────────────┐
  │                     KAFKA CLUSTER                                      │
  │                                                                        │
  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │
  │  │  Broker 1    │   │  Broker 2    │   │  Broker 3    │               │
  │  │              │   │              │   │              │               │
  │  │ topic-A P0 ◄─┼───┼─ LEADER     │   │ topic-A P0   │               │
  │  │ topic-A P1   │   │ topic-A P1 ◄─┼───┼─ LEADER     │               │
  │  │ topic-B P0   │   │ topic-B P0   │   │ topic-B P0 ◄─┼─ LEADER      │
  │  └──────────────┘   └──────────────┘   └──────────────┘               │
  │           │                                                            │
  │   ┌───────┴──────┐                                                     │
  │   │  KRaft (Raft │  ← cluster metadata, leader election                │
  │   │  Controller) │    (replaces ZooKeeper in Kafka 3.x)                │
  │   └──────────────┘                                                     │
  └────────────────────────────────────────────────────────────────────────┘

  Producer ──► Broker (Leader for partition) ──► Follower brokers replicate
  Consumer ──► Broker (Leader for partition)     (reads always from leader)

  Replication factor = 3 → each partition has 1 leader + 2 followers
  min.insync.replicas = 2 → producer waits for 2 replicas to ack before success`
        },
        {
          type: "heading",
          text: "Partitions: The Unit of Parallelism",
          level: 2
        },
        {
          type: "text",
          text: "Every topic is divided into partitions. Partitions are the key to Kafka's scalability — they let you parallelise both reads and writes across many brokers and consumers simultaneously."
        },
        {
          type: "comparison",
          headers: ["Property", "Detail"],
          rows: [
            ["Ordering", "Ordering is guaranteed WITHIN a partition, NOT across partitions. If you need strict ordering for a user's events, route all events for that user to the same partition using the user ID as the message key."],
            ["Key → Partition mapping", "By default: murmur2(key) % numPartitions. Same key always goes to the same partition (until partition count changes)."],
            ["No key", "Messages with null keys are round-robined across partitions (Kafka 2.4+: sticky partitioner batches them for throughput)."],
            ["Partition count", "Set at topic creation. Increasing partitions later is possible but reshuffles key→partition mapping — plan ahead. Rule of thumb: start with throughput / 10 MB/s partitions."],
            ["Replication factor", "How many brokers store a copy of each partition. 3 is standard for production (tolerates 1 broker failure with no data loss)."],
          ]
        },
        {
          type: "heading",
          text: "KRaft: Kafka Without ZooKeeper",
          level: 2
        },
        {
          type: "text",
          text: "Kafka 3.3+ replaces ZooKeeper with KRaft (Kafka Raft), a built-in metadata quorum. Kafka 4.0 removes ZooKeeper entirely. KRaft stores cluster metadata (topic configs, partition assignments, ACLs) inside Kafka itself using a dedicated metadata topic. This simplifies operations massively: no separate ZooKeeper cluster to manage, fewer processes, faster controller failover (<100 ms vs 30 s with ZooKeeper)."
        },
        {
          type: "callout",
          variant: "warning",
          title: "ZooKeeper vs KRaft — What to Use Today",
          text: "If you are starting a new cluster in 2025, use KRaft mode. The --kraft flag in docker-compose and Helm charts is now standard. If you have an existing ZooKeeper-based cluster, migrate using kafka-storage.sh and the migration guide — do not leave it on ZooKeeper past Kafka 3.x support windows."
        },
        {
          type: "heading",
          text: "Consumer Groups and Partition Assignment",
          level: 2
        },
        {
          type: "diagram",
          code: `  Topic: user-events (6 partitions)

  Consumer Group A (3 consumers) — balanced:
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ Consumer A-1 │   │ Consumer A-2 │   │ Consumer A-3 │
  │  P0, P1      │   │  P2, P3      │   │  P4, P5      │
  └──────────────┘   └──────────────┘   └──────────────┘

  Consumer Group B (1 consumer) — receives ALL partitions:
  ┌─────────────────────────────────────────────────────┐
  │                   Consumer B-1                      │
  │              P0, P1, P2, P3, P4, P5                 │
  └─────────────────────────────────────────────────────┘

  Key rules:
  • Each partition → at most 1 consumer per group
  • More consumers than partitions → idle consumers (no work)
  • Multiple groups → each gets ALL events independently (fan-out)
  • Groups track offsets independently → replay at will per group`
        },
        {
          type: "heading",
          text: "Log Retention: Kafka is Not a Queue",
          level: 2
        },
        {
          type: "text",
          text: "Unlike RabbitMQ (where consumed messages are deleted), Kafka keeps events for a configurable retention period regardless of whether they were consumed. This enables: replaying events to debug consumers, bootstrapping new consumer groups from the beginning of the log, and re-processing historical data for new ML features."
        },
        {
          type: "comparison",
          headers: ["Retention Type", "Config", "When to use"],
          rows: [
            ["Time-based", "retention.ms=604800000 (7 days)", "Standard event streams — you need a rolling window of history"],
            ["Size-based", "retention.bytes=107374182400 (100 GB)", "Disk-constrained environments — keep as much as fits"],
            ["Compaction", "cleanup.policy=compact", "Key-value changelogs — keep only the latest value per key (tombstone = null value = delete)"],
            ["Both", "cleanup.policy=compact,delete + retention.ms", "Hybrid: compaction keeps current state, deletion removes very old tombstones"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Log Compaction for Feature Stores",
          text: "Compacted topics are how Kafka powers changelog-based feature stores (Feast, Tecton). Each feature update is produced with the entity ID as the key. Compaction ensures the topic always reflects the latest feature values — new consumers can read the compacted topic and rebuild full state without reading years of history."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-producers-consumers",
      title: "Producers & Consumers: Delivery Guarantees and Performance",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "The reliability and throughput of your Kafka system is almost entirely determined by producer and consumer configuration. The defaults are safe but conservative — understanding the knobs lets you tune for your specific durability/throughput/latency trade-offs."
        },
        {
          type: "heading",
          text: "Producer Internals",
          level: 2
        },
        {
          type: "diagram",
          code: `  Your code
      │  producer.produce("topic", key=k, value=v)
      ▼
  ┌─────────────────────────────────────────────┐
  │              Producer Client                │
  │                                             │
  │  Serializer  →  Partitioner  →  RecordBatch │
  │  (key/value      (which         (buffer by  │
  │   → bytes)        partition?)    partition) │
  │                                             │
  │  linger.ms: wait up to N ms to fill batch   │
  │  batch.size: max bytes per batch            │
  │  compression.type: none/gzip/snappy/lz4/zstd│
  └──────────────────┬──────────────────────────┘
                     │  TCP (batched)
                     ▼
              Broker (Partition Leader)
                     │
                     ├── Writes to local log segment
                     │
                     └── Replicates to followers
                              │
                              ▼
                         acks received
                              │
                              ▼
                     producer callback / future resolved`
        },
        {
          type: "heading",
          text: "acks: The Durability Dial",
          level: 2
        },
        {
          type: "comparison",
          headers: ["acks value", "Durability", "Latency", "When to use"],
          rows: [
            ["acks=0", "None — fire and forget. Data can be lost.", "Lowest", "Metrics/telemetry where occasional loss is acceptable"],
            ["acks=1", "Leader ack only. Lost if leader crashes before replication.", "Low", "High-throughput logs where some loss is tolerable"],
            ["acks=all (acks=-1)", "All in-sync replicas must ack. No data loss if min.insync.replicas met.", "Higher", "Financial events, order processing, any data you cannot lose"],
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "acks=all alone is not enough",
          text: "You must also set min.insync.replicas=2 (or higher) on the broker/topic. Without it, acks=all only requires the leader to ack even if it's the only in-sync replica — no better than acks=1 during a broker failure. The combination of acks=all + min.insync.replicas=2 + replication.factor=3 is the standard production durability configuration."
        },
        {
          type: "heading",
          text: "Idempotent Producers (enable.idempotence=true)",
          level: 2
        },
        {
          type: "text",
          text: "Network retries can cause duplicate messages. An idempotent producer assigns a sequence number to every message. The broker deduplicates retried messages within a single producer session using (producer_id, partition, sequence_number). Enable with enable.idempotence=true — it automatically forces acks=all and max.in.flight.requests.per.connection=5."
        },
        {
          type: "heading",
          text: "Transactions: Exactly-Once Across Multiple Topics",
          level: 2
        },
        {
          type: "text",
          text: "Idempotence covers duplicates within one producer session. Kafka transactions extend this to atomically write to multiple topics/partitions and commit consumer offsets — giving you exactly-once semantics for read-process-write loops (the Kafka Streams pattern)."
        },
        {
          type: "code",
          lang: "python",
          filename: "transactional_producer.py",
          code: `from confluent_kafka import Producer

producer = Producer({
    "bootstrap.servers": "localhost:9092",
    "transactional.id": "my-transactional-producer-1",  # unique per producer instance
    "enable.idempotence": True,  # implied by transactional.id
})

producer.init_transactions()

try:
    producer.begin_transaction()

    producer.produce("orders", key="order-123", value=b'{"status": "paid"}')
    producer.produce("inventory", key="item-456", value=b'{"delta": -1}')

    # Atomically commit both messages — either both land or neither does
    producer.commit_transaction()

except Exception as e:
    producer.abort_transaction()
    raise`
        },
        {
          type: "heading",
          text: "Consumer: Offset Management",
          level: 2
        },
        {
          type: "text",
          text: "Consumers track progress by committing offsets — the position of the next message to read. Where you commit relative to when you process determines your delivery semantics."
        },
        {
          type: "comparison",
          headers: ["Delivery Semantic", "How", "Risk", "Use case"],
          rows: [
            ["At-most-once", "Commit offset BEFORE processing", "Process crashes after commit → message lost forever", "Metrics/logs where loss is acceptable"],
            ["At-least-once", "Commit offset AFTER processing succeeds", "Process crashes mid-processing → message redelivered on restart", "Most production systems — make processing idempotent"],
            ["Exactly-once", "Use Kafka transactions (offset commit + produce in one atomic transaction)", "Complex to implement; slight throughput penalty", "Financial ledgers, inventory systems, billing"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Design for At-Least-Once + Idempotent Consumers",
          text: "Exactly-once is hard. In practice: configure at-least-once delivery and make your consumer processing idempotent. Use the event key or a unique field as a deduplication key in your database (upsert by ID instead of blind insert). This is simpler, more debuggable, and works across restarts and crashes."
        },
        {
          type: "heading",
          text: "Consumer Group Rebalancing",
          level: 2
        },
        {
          type: "text",
          text: "When a consumer joins or leaves a group (crash, scale-up, deployment), Kafka triggers a rebalance — redistributing partitions among alive members. During a rebalance, all consumers stop consuming (stop-the-world). This can cause processing pauses."
        },
        {
          type: "comparison",
          headers: ["Partition Assignor", "Behaviour", "When to use"],
          rows: [
            ["RangeAssignor (default)", "Assigns ranges of partitions per topic. Can be unbalanced with multiple topics.", "Simple setups with 1–2 topics"],
            ["RoundRobinAssignor", "Distributes all partitions round-robin. More balanced.", "Multiple topics with equal partition counts"],
            ["StickyAssignor", "Minimises partition movements on rebalance. Reduces state migration cost.", "Stateful consumers (Kafka Streams, local caches)"],
            ["CooperativeStickyAssignor", "Incremental rebalancing — only moves partitions that need to move. No stop-the-world.", "Production default for most use cases (Kafka 2.4+)"],
          ]
        },
        {
          type: "heading",
          text: "Consumer Lag: The Key Operational Metric",
          level: 2
        },
        {
          type: "text",
          text: "Consumer lag = (latest offset in partition) − (consumer's committed offset). It tells you how far behind your consumer is. Sustained high lag means your consumer can't keep up with producers — scale out consumers (up to the partition count) or optimise processing."
        },
        {
          type: "code",
          lang: "bash",
          filename: "check-consumer-lag.sh",
          code: `# Check lag for all consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Detailed lag for a specific group
kafka-consumer-groups.sh \\
  --bootstrap-server localhost:9092 \\
  --describe \\
  --group my-consumer-group

# Output columns:
# GROUP             TOPIC        PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# my-consumer-group user-events  0          142500          142600          100
# my-consumer-group user-events  1          98300           98300           0
# my-consumer-group user-events  2          201100          201150          50

# Reset offsets (e.g., to replay from beginning) — --dry-run first!
kafka-consumer-groups.sh \\
  --bootstrap-server localhost:9092 \\
  --group my-consumer-group \\
  --topic user-events \\
  --reset-offsets --to-earliest --dry-run

# Then execute:
kafka-consumer-groups.sh \\
  --bootstrap-server localhost:9092 \\
  --group my-consumer-group \\
  --topic user-events \\
  --reset-offsets --to-earliest --execute`
        },
        {
          type: "heading",
          text: "Throughput Tuning Cheatsheet",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Config", "Default", "High-throughput value", "Effect"],
          rows: [
            ["linger.ms", "0", "5–50", "Wait before sending batch — allows more messages to accumulate"],
            ["batch.size", "16384 (16 KB)", "131072–1048576 (128 KB–1 MB)", "Larger batches = fewer requests = higher throughput"],
            ["compression.type", "none", "lz4 or zstd", "lz4 is fast + saves bandwidth; zstd has best ratio"],
            ["fetch.min.bytes", "1", "10240–65536", "Consumer waits for more data before returning — reduces fetch requests"],
            ["fetch.max.wait.ms", "500", "500", "Max wait for fetch.min.bytes — balance latency vs throughput"],
            ["max.poll.records", "500", "1000–5000", "Messages returned per poll() — increase for bulk processing"],
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-schema-registry",
      title: "Schema Registry: Evolving Events Without Breaking Consumers",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "JSON is tempting for Kafka messages — it's human-readable and flexible. But in production it creates silent failures: a producer adds a new required field, consumers crash because they didn't expect it. A producer renames a field, consumers silently get null. Schema Registry solves this by enforcing a schema contract on every message and validating that schema changes are compatible before they reach production."
        },
        {
          type: "heading",
          text: "How Schema Registry Works",
          level: 2
        },
        {
          type: "diagram",
          code: `  ┌──────────┐   1. Register schema (first produce)    ┌──────────────────┐
  │ Producer │ ─────────────────────────────────────► │ Schema Registry  │
  │          │ ◄───────────────────────────────────── │                  │
  │          │   2. Get schema ID (e.g. 42)            │ Stores schemas   │
  │          │                                         │ versioned by     │
  │          │   3. Serialize: [magic byte][schema_id  │ subject name     │
  │          │      (4 bytes)][avro/protobuf payload] │                  │
  └──────────┘                                         └──────────────────┘
       │ 4. Publish to Kafka topic                             │
       ▼                                                       │
  ┌─────────┐                                                  │
  │  Kafka  │                                                  │
  └─────────┘                                                  │
       │ 5. Consume raw bytes                                  │
       ▼                                                       │
  ┌──────────┐   6. Read schema_id from bytes header          │
  │ Consumer │ ─────────────────────────────────────────────► │
  │          │ ◄───────────────────────────────────────────── │
  │          │   7. Get schema for ID 42 (cached after first) │
  │          │   8. Deserialize bytes → Python/Java object    │
  └──────────┘`
        },
        {
          type: "heading",
          text: "Avro vs Protobuf vs JSON Schema",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Format", "Size", "Schema Evolution", "Ecosystem", "Best for"],
          rows: [
            ["Avro", "Compact binary — schema NOT in payload", "Excellent built-in rules", "Kafka-native, Spark, Flink, Hive", "Data pipelines, analytics, Kafka-centric stacks"],
            ["Protobuf", "Compact binary — field numbers in payload", "Excellent (field numbers enable renaming)", "gRPC, multi-language, Google ecosystem", "Service-to-service, polyglot teams"],
            ["JSON Schema", "Large — full JSON in payload", "Manual — no enforcement", "Universal", "Quick prototyping, debugging, human readability"],
          ]
        },
        {
          type: "heading",
          text: "Schema Compatibility Modes",
          level: 2
        },
        {
          type: "text",
          text: "Schema Registry enforces compatibility rules before accepting a new schema version. The compatibility mode is set per subject (topic). Choose based on your deployment strategy: can you deploy consumers before producers, or must producers deploy first?"
        },
        {
          type: "comparison",
          headers: ["Mode", "Rule", "Deploy order", "Example change allowed"],
          rows: [
            ["BACKWARD (default)", "New schema can read old data", "Deploy consumers first, then producers", "Add optional field with default; remove field"],
            ["FORWARD", "Old schema can read new data", "Deploy producers first, then consumers", "Add field (consumers ignore it); delete optional field"],
            ["FULL", "Both BACKWARD and FORWARD", "Either order", "Add/remove optional fields with defaults only"],
            ["NONE", "No compatibility check", "Any order", "Any change — dangerous in production"],
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "Breaking Changes That Will Fail Compatibility Checks",
          text: "Renaming a field (Avro has no field numbers — name IS the identifier), changing a field's type (string → int), removing a required field without a default, adding a required field without a default. All of these will be rejected by Schema Registry in BACKWARD/FORWARD/FULL modes — which is exactly the point."
        },
        {
          type: "heading",
          text: "Subject Naming Strategies",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Strategy", "Subject name", "Use case"],
          rows: [
            ["TopicNameStrategy (default)", "topic-name-value / topic-name-key", "One schema per topic — simple, most common"],
            ["RecordNameStrategy", "fully.qualified.RecordName", "Same event type on multiple topics — reuse schema across topics"],
            ["TopicRecordNameStrategy", "topic-name-fully.qualified.RecordName", "Multiple event types on one topic (requires consumer to handle multiple schemas)"],
          ]
        },
        {
          type: "heading",
          text: "Multiple Event Types on One Topic",
          level: 2
        },
        {
          type: "text",
          text: "A common design question: one topic per event type, or multiple event types per topic? One topic per event type is simpler — one schema per topic, each consumer group subscribes to exactly what it needs. Multiple types per topic (using a union schema or a wrapper type) reduces topic proliferation but complicates schema management and consumer filtering. Default to one type per topic."
        },
        {
          type: "code",
          lang: "json",
          filename: "user_event.avsc",
          code: `{
  "type": "record",
  "name": "UserEvent",
  "namespace": "com.myapp.events",
  "doc": "Represents a user action in the application",
  "fields": [
    {
      "name": "event_id",
      "type": "string",
      "doc": "UUID v4 — used for idempotency checks downstream"
    },
    {
      "name": "user_id",
      "type": "string"
    },
    {
      "name": "event_type",
      "type": {
        "type": "enum",
        "name": "EventType",
        "symbols": ["PAGE_VIEW", "CLICK", "PURCHASE", "SIGNUP"]
      }
    },
    {
      "name": "timestamp_ms",
      "type": "long",
      "logicalType": "timestamp-millis"
    },
    {
      "name": "properties",
      "type": {
        "type": "map",
        "values": "string"
      },
      "default": {},
      "doc": "Arbitrary key-value metadata — extensible without schema changes"
    },
    {
      "name": "session_id",
      "type": ["null", "string"],
      "default": null,
      "doc": "Optional — added in v2. BACKWARD compatible because it has a default."
    }
  ]
}`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-streams",
      title: "Kafka Streams & ksqlDB: Stream Processing Without a Separate Cluster",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "Kafka Streams is a Java/Scala library for building stateful stream processing applications that run as regular JVM processes — no separate cluster (Spark, Flink) required. ksqlDB is a SQL interface on top of Kafka Streams. Both let you filter, aggregate, join, and window events in real time, writing results back to Kafka topics."
        },
        {
          type: "callout",
          variant: "info",
          title: "When to use Kafka Streams vs Flink vs Spark Structured Streaming",
          text: "Kafka Streams: simple-to-moderate stateful stream processing, Java/Scala teams, no cluster to manage — scales by adding JVM instances. Apache Flink: complex stateful processing, exactly-once at scale, event-time semantics, large teams — operationally heavier. Spark Structured Streaming: batch-oriented teams adding streaming, micro-batch model, rich ML integration. For Python-first teams: Faust (pure Python Kafka Streams port) or just consumer loops for simpler cases."
        },
        {
          type: "heading",
          text: "Core Stream Processing Concepts",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Concept", "What it is", "Example"],
          rows: [
            ["KStream", "Unbounded sequence of events — each record is independent", "User clicks: each click is a separate event"],
            ["KTable", "Changelog stream interpreted as a materialised table — latest value per key", "User profile: only the current profile matters"],
            ["GlobalKTable", "KTable replicated to ALL instances — used for lookups (joins without repartitioning)", "Product catalogue lookup during order processing"],
            ["Stateless ops", "filter, map, flatMap, foreach — no memory across events", "Filter only PURCHASE events"],
            ["Stateful ops", "count, aggregate, join, windowed aggregation — maintains state in RocksDB", "Count purchases per user per hour"],
            ["Windowing", "Tumbling (fixed non-overlapping), Hopping (overlapping), Session (activity-based)", "Revenue last 5 minutes (tumbling)"],
          ]
        },
        {
          type: "heading",
          text: "Tumbling vs Hopping vs Session Windows",
          level: 2
        },
        {
          type: "diagram",
          code: `  Events:  e1  e2    e3   e4  e5       e6   e7

  ── Tumbling Window (size=5min) ─────────────────────────────────
  [0:00─5:00)         [5:00─10:00)         [10:00─15:00)
  [e1, e2, e3]        [e4, e5]             [e6, e7]
  Each event in exactly one window.

  ── Hopping Window (size=10min, advance=5min) ────────────────────
  [0:00─10:00)         [5:00─15:00)
  [e1,e2,e3,e4,e5]     [e4,e5,e6,e7]
  Events appear in multiple overlapping windows. Good for rolling averages.

  ── Session Window (gap=3min) ─────────────────────────────────────
  [e1,e2,e3] gap>3min [e4,e5] gap>3min [e6,e7]
  Window extends as long as events keep arriving within the gap.
  Good for user sessions — variable length, activity-driven.`
        },
        {
          type: "heading",
          text: "Event Time vs Processing Time vs Ingestion Time",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Time type", "Meaning", "Problem", "Solution"],
          rows: [
            ["Processing time", "When the broker/consumer sees the event", "Mobile events arrive 10 min late → counted in wrong window", "Fine for simple metrics, bad for correctness"],
            ["Ingestion time", "When the broker receives the event", "Same late-arrival problem", "Slightly better but still wrong for late data"],
            ["Event time", "When the event actually happened (timestamp in the event payload)", "Late-arriving events can reopen closed windows", "Use watermarks to define acceptable lateness; discard beyond"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Always embed event timestamps in your events",
          text: "Include an event_timestamp field (milliseconds since epoch) in every event schema. This lets you switch from processing time to event time at any point without re-instrumenting producers. Kafka Streams' .withTimestampExtractor() reads this field for windowing."
        },
        {
          type: "heading",
          text: "Kafka Streams State Stores and RocksDB",
          level: 2
        },
        {
          type: "text",
          text: "Stateful Kafka Streams operations store state in RocksDB (embedded key-value store), persisted to local disk and backed up to a changelog Kafka topic. On restart, state is restored from the changelog — this is why Kafka Streams apps recover automatically without external state stores."
        },
        {
          type: "diagram",
          code: `  ┌──────────────────────────────────────────────────────┐
  │           Kafka Streams Instance                     │
  │                                                      │
  │  ┌───────────────────────────────────────────────┐   │
  │  │   Stateful Operator (e.g. count by user_id)   │   │
  │  │                                               │   │
  │  │   Local RocksDB ──────────────────────────────┼───┼──► Changelog topic
  │  │   (fast local reads/writes)   backed up to    │   │    (Kafka topic, auto-managed)
  │  └───────────────────────────────────────────────┘   │
  │                                                      │
  │  On crash/restart:                                   │
  │    1. Re-read changelog topic to restore state       │
  │    2. Resume consuming from last committed offset    │
  └──────────────────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "ksqlDB: SQL on Kafka",
          level: 2
        },
        {
          type: "text",
          text: "ksqlDB lets you write streaming SQL queries instead of Java code. A STREAM maps to a KStream; a TABLE maps to a KTable. Queries run persistently — they continuously process new events and write results to output topics."
        },
        {
          type: "code",
          lang: "sql",
          filename: "ksqldb-queries.sql",
          code: `-- Create a stream over an existing Kafka topic
CREATE STREAM user_events (
  event_id    VARCHAR KEY,
  user_id     VARCHAR,
  event_type  VARCHAR,
  timestamp_ms BIGINT
) WITH (
  KAFKA_TOPIC = 'user-events',
  VALUE_FORMAT = 'AVRO',
  TIMESTAMP = 'timestamp_ms'
);

-- Create a table (latest value per key) from a topic
CREATE TABLE users (
  user_id   VARCHAR PRIMARY KEY,
  email     VARCHAR,
  plan      VARCHAR
) WITH (
  KAFKA_TOPIC = 'users',
  VALUE_FORMAT = 'AVRO'
);

-- Stateless filter → new topic
CREATE STREAM purchase_events AS
  SELECT * FROM user_events
  WHERE event_type = 'PURCHASE'
  EMIT CHANGES;

-- Tumbling window aggregation → materialised table
CREATE TABLE purchases_per_user_hourly AS
  SELECT
    user_id,
    COUNT(*) AS purchase_count,
    WINDOWSTART AS window_start,
    WINDOWEND AS window_end
  FROM user_events
  WHERE event_type = 'PURCHASE'
  WINDOW TUMBLING (SIZE 1 HOUR)
  GROUP BY user_id
  EMIT CHANGES;

-- Stream-table join: enrich events with user data
CREATE STREAM enriched_purchases AS
  SELECT
    e.event_id,
    e.user_id,
    e.timestamp_ms,
    u.email,
    u.plan
  FROM purchase_events e
  LEFT JOIN users u ON e.user_id = u.user_id
  EMIT CHANGES;

-- Query the materialised view (point-in-time, not streaming)
SELECT user_id, purchase_count
FROM purchases_per_user_hourly
WHERE user_id = 'user-123';`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-connect-cdc",
      title: "Kafka Connect & CDC: Moving Data Without Writing Code",
      readTime: "13 min",
      content: [
        {
          type: "text",
          text: "Kafka Connect is a framework for reliably moving data between Kafka and external systems — databases, object stores, search indexes, data warehouses — without writing custom producer/consumer code. Change Data Capture (CDC) with Debezium is its most powerful pattern: streaming every database row change into Kafka in real time."
        },
        {
          type: "heading",
          text: "Kafka Connect Architecture",
          level: 2
        },
        {
          type: "diagram",
          code: `  External Systems                Kafka Connect                  Kafka
  ─────────────────────────────────────────────────────────────────────
  PostgreSQL ──────────────► Source Connector ──────────────► Topics
  MySQL      ──────────────► (Debezium CDC)
  S3 files   ──────────────► (S3 Source)

                             ┌─────────────────────────┐
  Topics ──────────────────► │  Sink Connector          │ ──────────► Elasticsearch
  Topics ──────────────────► │  (Elasticsearch Sink)    │ ──────────► S3
  Topics ──────────────────► │  (S3 Sink)               │ ──────────► Snowflake
                             └─────────────────────────┘

  Connector = config only (source/sink type, topic mapping, transforms)
  Worker = JVM process that runs connectors (standalone or distributed mode)
  Task = unit of parallelism within a connector (1 task per partition for most)

  Transforms (SMTs — Single Message Transforms) run in the worker pipeline:
  field renaming, timestamp conversion, routing, filtering — without code`
        },
        {
          type: "heading",
          text: "Change Data Capture with Debezium",
          level: 2
        },
        {
          type: "text",
          text: "Debezium reads PostgreSQL's Write-Ahead Log (WAL), MySQL's binlog, or MongoDB's oplog — the same log the database uses for replication. Every INSERT, UPDATE, and DELETE is captured as a Kafka event with before and after snapshots. This is more reliable than polling (no missed changes, no extra database load) and typically has <100 ms end-to-end latency."
        },
        {
          type: "comparison",
          headers: ["CDC Method", "How", "Latency", "DB impact", "Use case"],
          rows: [
            ["Log-based CDC (Debezium)", "Reads database replication log (WAL/binlog)", "<100 ms", "Minimal — reads replication slot", "Production: real-time, low-impact"],
            ["Query-based polling", "SELECT ... WHERE updated_at > last_check", "Minutes", "Adds query load; misses deletes", "Simple cases, no replication slot access"],
            ["Triggers", "DB trigger writes changes to an outbox table", "Seconds", "Write amplification on every change", "When WAL access is unavailable"],
          ]
        },
        {
          type: "heading",
          text: "The Outbox Pattern: Transactional Event Publishing",
          level: 2
        },
        {
          type: "text",
          text: "A common problem: you update a database row and publish a Kafka event in the same request handler. If Kafka is down, the event is lost. If the DB transaction rolls back after the Kafka publish, you've sent a phantom event. The Outbox Pattern solves this with a single, atomic database write."
        },
        {
          type: "diagram",
          code: `  ┌─────────────────────────────────────────────────────────────────┐
  │ Application (e.g. FastAPI handler)                              │
  │                                                                 │
  │  BEGIN TRANSACTION                                              │
  │    UPDATE orders SET status='paid' WHERE id=123                 │
  │    INSERT INTO outbox_events (topic, key, payload, created_at)  │
  │      VALUES ('order-events', '123', '{"status":"paid"}', NOW()) │
  │  COMMIT                                                         │
  │                                                                 │
  │  ✓ Either both rows written, or neither. Atomically.            │
  └─────────────────────────────────────────────────────────────────┘
                          │ Debezium reads outbox table
                          ▼
  ┌────────────────────────────────────┐
  │  Debezium Outbox Event Router SMT  │
  │  Routes events to correct topics   │
  │  based on 'topic' column           │
  └────────────────────────────────────┘
                          │
                          ▼
                   Kafka: order-events topic
                          │
                          ▼
              Consumers (inventory, email, analytics)`
        },
        {
          type: "heading",
          text: "Dead Letter Queues and Error Handling",
          level: 2
        },
        {
          type: "text",
          text: "Not every message can be processed successfully. A malformed payload, a downstream service being down, or a schema mismatch can cause consumers to fail. The wrong response is to let one bad message block the entire partition forever. The right response is Dead Letter Topics (DLT)."
        },
        {
          type: "comparison",
          headers: ["Strategy", "When to use", "Implementation"],
          rows: [
            ["Dead Letter Topic", "Malformed messages, schema violations, non-retryable errors", "On exception: produce to {topic}-dlt with error metadata headers, commit offset, continue"],
            ["Retry Topic", "Transient failures (downstream API down, DB timeout)", "Produce to {topic}-retry-1, consumer picks up later with exponential backoff"],
            ["Retry with backoff", "Temporary dependency outage", "retry-1 (1s), retry-2 (10s), retry-3 (60s) → dlt after exhausting retries"],
            ["Pause partition", "ALL messages failing (e.g. DB totally down)", "consumer.pause(); resume when dependency recovers — preserves ordering"],
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "dead_letter_consumer.py",
          code: `from confluent_kafka import Consumer, Producer, KafkaException
import json, traceback

TOPIC = "orders"
DLT_TOPIC = "orders-dlt"
GROUP_ID = "order-processor"

consumer = Consumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": GROUP_ID,
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,  # manual commit for at-least-once
})
producer = Producer({"bootstrap.servers": "localhost:9092"})
consumer.subscribe([TOPIC])

def process(msg):
    data = json.loads(msg.value())
    # ... business logic that might raise ...
    if data.get("amount", 0) < 0:
        raise ValueError(f"Negative order amount: {data['amount']}")
    print(f"Processed order {data['order_id']}")

def send_to_dlt(msg, exc):
    headers = list(msg.headers() or []) + [
        ("dlt-original-topic", TOPIC.encode()),
        ("dlt-original-partition", str(msg.partition()).encode()),
        ("dlt-original-offset", str(msg.offset()).encode()),
        ("dlt-error-type", type(exc).__name__.encode()),
        ("dlt-error-message", str(exc).encode()),
        ("dlt-consumer-group", GROUP_ID.encode()),
    ]
    producer.produce(
        DLT_TOPIC,
        key=msg.key(),
        value=msg.value(),
        headers=headers,
    )
    producer.flush()

try:
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            raise KafkaException(msg.error())
        try:
            process(msg)
            consumer.commit(message=msg)  # commit only on success
        except Exception as exc:
            print(f"Error processing offset {msg.offset()}: {exc}")
            send_to_dlt(msg, exc)
            consumer.commit(message=msg)  # commit to skip bad message
finally:
    consumer.close()`
        },
        {
          type: "heading",
          text: "Kafka on Kubernetes: Strimzi Operator",
          level: 2
        },
        {
          type: "text",
          text: "Running Kafka on Kubernetes manually is painful — stateful sets, persistent volumes, headless services, pod disruption budgets. Strimzi is a CNCF operator that manages Kafka clusters as Kubernetes custom resources. You declare a Kafka CR; Strimzi handles broker provisioning, rolling upgrades, TLS, RBAC, and Kafka Connect deployments."
        },
        {
          type: "callout",
          variant: "tip",
          title: "Managed Kafka vs Self-Hosted",
          text: "For production AI workloads, seriously evaluate Confluent Cloud or AWS MSK before self-hosting on Kubernetes. Managed Kafka eliminates broker operations (upgrades, disk scaling, replication monitoring) so your team focuses on producers and consumers. Strimzi is excellent for on-premises or cost-sensitive environments where you need full control."
        },
        {
          type: "comparison",
          headers: ["Option", "Ops burden", "Cost", "When to choose"],
          rows: [
            ["Confluent Cloud", "Near-zero (fully managed)", "Higher per-message cost", "Small/medium teams, fast time-to-value, SLA requirements"],
            ["AWS MSK", "Low (managed brokers, manual config)", "Medium", "AWS-first shops, cost balance, IAM integration"],
            ["Strimzi on K8s", "Medium (you manage upgrades, volumes)", "Lowest at scale", "On-prem, compliance requirements, large data volume"],
            ["Self-managed VMs", "High", "Lowest infra cost", "Legacy setups only — avoid for new projects"],
          ]
        },
      ]
    },

  ]; // end m.lessons
})();
