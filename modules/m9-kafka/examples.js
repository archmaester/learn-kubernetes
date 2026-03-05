// Patches the Kafka & Message Queues module (m9) with comprehensive code examples.
// Loaded after curriculum.js and kafka-lessons.js.
// m9 = CURRICULUM.phases[2].modules[1]
(function patchKafkaExamples() {
  const m = CURRICULUM.phases[2].modules[1]; // phase-3 (index 2), second module (m9)

  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-local-setup",
      title: "Local Kafka Cluster Setup",
      icon: "🐳",
      items: [
        {
          title: "Docker Compose: Kafka + Schema Registry + ksqlDB + UI",
          lang: "yaml",
          filename: "compose.kafka.yml",
          desc: "Production-representative local cluster: 3 Kafka brokers in KRaft mode, Confluent Schema Registry, ksqlDB server, and Kafka UI for visual inspection. No ZooKeeper required.",
          code: `# compose.kafka.yml
# Start: docker compose -f compose.kafka.yml up -d
# Kafka UI: http://localhost:8090
# Schema Registry: http://localhost:8081
# ksqlDB: http://localhost:8088
services:

  # ── KRaft Controller (metadata quorum, not a data broker) ────────────
  kafka-controller:
    image: confluentinc/cp-kafka:7.7.0
    hostname: kafka-controller
    container_name: kafka-controller
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: controller
      KAFKA_LISTENERS: CONTROLLER://kafka-controller:29093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-controller:29093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk  # fixed for local dev (base64 UUID)
      KAFKA_LOG_DIRS: /var/lib/kafka/data
    volumes:
      - kafka-controller-data:/var/lib/kafka/data
    networks: [kafka-net]
    healthcheck:
      test: ["CMD-SHELL", "kafka-metadata-quorum --bootstrap-server localhost:29093 describe --status 2>/dev/null | grep -q Leader"]
      interval: 15s
      timeout: 10s
      retries: 10

  # ── Broker 1 ────────────────────────────────────────────────────────
  kafka-broker-1:
    image: confluentinc/cp-kafka:7.7.0
    hostname: kafka-broker-1
    container_name: kafka-broker-1
    depends_on:
      kafka-controller: { condition: service_healthy }
    ports:
      - "9092:9092"   # external (host → container)
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: broker
      KAFKA_LISTENERS: PLAINTEXT://kafka-broker-1:29092,PLAINTEXT_HOST://0.0.0.0:9092
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-broker-1:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-controller:29093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_LOG_RETENTION_HOURS: 168        # 7 days
      KAFKA_LOG_SEGMENT_BYTES: 1073741824   # 1 GB per segment
      KAFKA_COMPRESSION_TYPE: producer      # honour producer's compression choice
    volumes:
      - kafka-broker-1-data:/var/lib/kafka/data
    networks: [kafka-net]
    healthcheck:
      test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1"]
      interval: 10s
      timeout: 5s
      retries: 10

  # ── Broker 2 ────────────────────────────────────────────────────────
  kafka-broker-2:
    image: confluentinc/cp-kafka:7.7.0
    hostname: kafka-broker-2
    container_name: kafka-broker-2
    depends_on:
      kafka-controller: { condition: service_healthy }
    ports:
      - "9093:9093"
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: broker
      KAFKA_LISTENERS: PLAINTEXT://kafka-broker-2:29093,PLAINTEXT_HOST://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-broker-2:29093,PLAINTEXT_HOST://localhost:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-controller:29093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_LOG_RETENTION_HOURS: 168
    volumes:
      - kafka-broker-2-data:/var/lib/kafka/data
    networks: [kafka-net]

  # ── Broker 3 ────────────────────────────────────────────────────────
  kafka-broker-3:
    image: confluentinc/cp-kafka:7.7.0
    hostname: kafka-broker-3
    container_name: kafka-broker-3
    depends_on:
      kafka-controller: { condition: service_healthy }
    ports:
      - "9094:9094"
    environment:
      KAFKA_NODE_ID: 4
      KAFKA_PROCESS_ROLES: broker
      KAFKA_LISTENERS: PLAINTEXT://kafka-broker-3:29094,PLAINTEXT_HOST://0.0.0.0:9094
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-broker-3:29094,PLAINTEXT_HOST://localhost:9094
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-controller:29093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_LOG_RETENTION_HOURS: 168
    volumes:
      - kafka-broker-3-data:/var/lib/kafka/data
    networks: [kafka-net]

  # ── Schema Registry ─────────────────────────────────────────────────
  schema-registry:
    image: confluentinc/cp-schema-registry:7.7.0
    hostname: schema-registry
    depends_on:
      kafka-broker-1: { condition: service_healthy }
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka-broker-1:29092,kafka-broker-2:29093,kafka-broker-3:29094
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
      SCHEMA_REGISTRY_KAFKASTORE_TOPIC_REPLICATION_FACTOR: 3
    networks: [kafka-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8081/subjects > /dev/null"]
      interval: 10s
      retries: 10

  # ── ksqlDB Server ───────────────────────────────────────────────────
  ksqldb-server:
    image: confluentinc/cp-ksqldb-server:7.7.0
    hostname: ksqldb-server
    depends_on:
      kafka-broker-1: { condition: service_healthy }
      schema-registry: { condition: service_healthy }
    ports:
      - "8088:8088"
    environment:
      KSQL_LISTENERS: http://0.0.0.0:8088
      KSQL_BOOTSTRAP_SERVERS: kafka-broker-1:29092,kafka-broker-2:29093,kafka-broker-3:29094
      KSQL_KSQL_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      KSQL_KSQL_LOGGING_PROCESSING_STREAM_AUTO_CREATE: "true"
      KSQL_KSQL_LOGGING_PROCESSING_TOPIC_AUTO_CREATE: "true"
    networks: [kafka-net]

  # ── Kafka UI ────────────────────────────────────────────────────────
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8090:8080"
    depends_on:
      - kafka-broker-1
      - schema-registry
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka-broker-1:29092,kafka-broker-2:29093,kafka-broker-3:29094
      KAFKA_CLUSTERS_0_SCHEMAREGISTRY: http://schema-registry:8081
      KAFKA_CLUSTERS_0_KSQLDBSERVER: http://ksqldb-server:8088
    networks: [kafka-net]

volumes:
  kafka-controller-data:
  kafka-broker-1-data:
  kafka-broker-2-data:
  kafka-broker-3-data:

networks:
  kafka-net:`,
          notes: [
            "KRaft mode (no ZooKeeper) requires Kafka 3.3+. The CLUSTER_ID must be a base64-encoded UUID — generate with: kafka-storage.sh random-uuid",
            "KAFKA_ADVERTISED_LISTENERS has two entries: PLAINTEXT for inter-broker (Docker network), PLAINTEXT_HOST for external (laptop). This is why producers from the host use localhost:9092 but brokers communicate on kafka-broker-1:29092.",
            "MIN_INSYNC_REPLICAS=2 + DEFAULT_REPLICATION_FACTOR=3 + acks=all gives you strong durability — survives 1 broker failure with no data loss.",
            "Kafka UI (provectuslabs/kafka-ui) is excellent for local development: browse topics, view consumer group lag, inspect schemas, run ksqlDB queries — all in a browser.",
          ]
        },
        {
          title: "Topic Management CLI Cheatsheet",
          lang: "bash",
          filename: "kafka-topics-cli.sh",
          desc: "Essential kafka-topics.sh and kafka-configs.sh commands for topic lifecycle management.",
          code: `BROKERS="localhost:9092"

# ── Create topics ─────────────────────────────────────────────────────
kafka-topics.sh --bootstrap-server $BROKERS --create \\
  --topic user-events \\
  --partitions 12 \\             # partitions = max consumer parallelism
  --replication-factor 3 \\      # standard for 3-broker cluster
  --config retention.ms=604800000 \\   # 7 days
  --config compression.type=lz4 \\
  --config min.insync.replicas=2

# Compacted topic (for changelogs / feature stores)
kafka-topics.sh --bootstrap-server $BROKERS --create \\
  --topic user-profiles \\
  --partitions 12 \\
  --replication-factor 3 \\
  --config cleanup.policy=compact \\
  --config min.cleanable.dirty.ratio=0.1 \\
  --config segment.ms=3600000   # compact at least every hour

# ── Inspect topics ────────────────────────────────────────────────────
kafka-topics.sh --bootstrap-server $BROKERS --list
kafka-topics.sh --bootstrap-server $BROKERS --describe --topic user-events
# Shows: partition count, replication factor, leader/follower assignment, ISR list

# ── Produce / consume (for testing) ───────────────────────────────────
# Produce (pipe stdin)
echo '{"user_id":"u1","event":"click"}' | kafka-console-producer.sh \\
  --bootstrap-server $BROKERS \\
  --topic user-events \\
  --property "key.separator=:" \\
  --property "parse.key=true"

# Consume from beginning
kafka-console-consumer.sh \\
  --bootstrap-server $BROKERS \\
  --topic user-events \\
  --from-beginning \\
  --property print.key=true \\
  --property print.timestamp=true

# ── Alter topic configuration ─────────────────────────────────────────
kafka-configs.sh --bootstrap-server $BROKERS \\
  --entity-type topics \\
  --entity-name user-events \\
  --alter \\
  --add-config retention.ms=1209600000  # extend to 14 days

# ── Consumer group operations ─────────────────────────────────────────
kafka-consumer-groups.sh --bootstrap-server $BROKERS --list
kafka-consumer-groups.sh --bootstrap-server $BROKERS \\
  --describe --group my-app-consumer

# Reset to earliest (replay all history) — dry run first!
kafka-consumer-groups.sh --bootstrap-server $BROKERS \\
  --group my-app-consumer \\
  --topic user-events \\
  --reset-offsets --to-earliest --dry-run

# Reset to a specific datetime
kafka-consumer-groups.sh --bootstrap-server $BROKERS \\
  --group my-app-consumer \\
  --topic user-events \\
  --reset-offsets \\
  --to-datetime 2025-01-01T00:00:00.000 \\
  --execute

# ── Partition reassignment (for rebalancing across brokers) ───────────
kafka-reassign-partitions.sh --bootstrap-server $BROKERS \\
  --reassignment-json-file reassignment.json \\
  --execute`,
          notes: [
            "Never reduce partition count on an existing topic — Kafka does not support it. Plan partition count upfront: start at max_throughput_MB_s / 10 MB/s (rough rule of thumb).",
            "kafka-console-producer/consumer are for debugging only. In CI use them to seed test data or verify output topics.",
            "--reset-offsets is destructive in production — always --dry-run first and confirm the consumer group is stopped.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-python-producers-consumers",
      title: "Python Producers & Consumers",
      icon: "🐍",
      items: [
        {
          title: "Production-Grade Producer (confluent-kafka)",
          lang: "python",
          filename: "producer.py",
          desc: "Idempotent producer with delivery callbacks, compression, batching, and error handling. Uses confluent-kafka (librdkafka bindings) — significantly faster than kafka-python.",
          code: `import json
import logging
from confluent_kafka import Producer, KafkaError
from confluent_kafka.admin import AdminClient, NewTopic
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KAFKA_CONFIG = {
    "bootstrap.servers": "localhost:9092",
    # Durability
    "acks": "all",                           # wait for all ISR replicas
    "enable.idempotence": True,              # deduplicate retries
    "max.in.flight.requests.per.connection": 5,  # required for idempotence
    # Throughput
    "linger.ms": 10,                         # batch for 10ms before sending
    "batch.size": 131072,                    # 128 KB batch size
    "compression.type": "lz4",              # fast compression
    # Reliability
    "retries": 10,
    "retry.backoff.ms": 100,
    "delivery.timeout.ms": 30000,           # 30s total timeout
    "request.timeout.ms": 10000,
}

@dataclass
class UserEvent:
    event_id: str
    user_id: str
    event_type: str
    timestamp_ms: int
    properties: dict

def delivery_callback(err, msg):
    """Called by librdkafka on each message ack or failure."""
    if err:
        logger.error(
            "Delivery failed: topic=%s partition=%d offset=%d error=%s",
            msg.topic(), msg.partition(), msg.offset(), err
        )
        # In production: send to alerting, increment error metric
    else:
        logger.debug(
            "Delivered: topic=%s partition=%d offset=%d latency=%.2fms",
            msg.topic(), msg.partition(), msg.offset(),
            msg.latency() * 1000 if msg.latency() else 0,
        )

def ensure_topic_exists(topic: str, partitions: int = 12):
    admin = AdminClient({"bootstrap.servers": "localhost:9092"})
    metadata = admin.list_topics(timeout=5)
    if topic not in metadata.topics:
        new_topic = NewTopic(
            topic,
            num_partitions=partitions,
            replication_factor=3,
            config={"retention.ms": "604800000", "compression.type": "lz4"},
        )
        fs = admin.create_topics([new_topic])
        fs[topic].result()  # raises on error
        logger.info("Created topic: %s", topic)

producer = Producer(KAFKA_CONFIG)
ensure_topic_exists("user-events")

def publish_user_event(event: UserEvent) -> None:
    payload = json.dumps(asdict(event)).encode("utf-8")
    producer.produce(
        topic="user-events",
        key=event.user_id.encode("utf-8"),  # same user → same partition → ordered
        value=payload,
        headers={
            "event-type": event.event_type,
            "source-service": "api-gateway",
            "schema-version": "1",
        },
        on_delivery=delivery_callback,
    )
    # poll() serves delivery callbacks — call regularly for low-latency ack processing
    producer.poll(0)

# ── Produce a batch ───────────────────────────────────────────────────
events = [
    UserEvent(
        event_id=str(uuid.uuid4()),
        user_id=f"user-{i}",
        event_type="PAGE_VIEW",
        timestamp_ms=int(datetime.now(timezone.utc).timestamp() * 1000),
        properties={"page": "/home", "referrer": "google"},
    )
    for i in range(1000)
]

for event in events:
    publish_user_event(event)

# Flush blocks until all queued messages are delivered (or timeout)
remaining = producer.flush(timeout=30)
if remaining > 0:
    logger.error("%d messages were NOT delivered!", remaining)
else:
    logger.info("All %d messages delivered successfully.", len(events))`,
          notes: [
            "confluent-kafka (librdkafka) is 3–10× faster than kafka-python for high-throughput workloads. Use it in production.",
            "producer.poll(0) is non-blocking — it drains the delivery callback queue without waiting. Call it in your produce loop.",
            "Use user_id (or order_id, session_id) as the Kafka message key — this guarantees all events for the same entity go to the same partition and are processed in order.",
            "enable.idempotence=True requires acks='all' and max.in.flight.requests.per.connection<=5. confluent-kafka enforces this automatically.",
          ]
        },
        {
          title: "Production-Grade Consumer with Manual Commit",
          lang: "python",
          filename: "consumer.py",
          desc: "At-least-once consumer with manual offset commits, graceful shutdown on SIGTERM, dead letter topic routing, and structured concurrency for batch processing.",
          code: `import json
import logging
import signal
import sys
from confluent_kafka import Consumer, Producer, KafkaError, KafkaException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CONSUMER_CONFIG = {
    "bootstrap.servers": "localhost:9092",
    "group.id": "user-event-processor-v1",
    "auto.offset.reset": "earliest",       # start from beginning on first run
    "enable.auto.commit": False,           # manual commits for at-least-once
    "max.poll.interval.ms": 300000,        # 5 min — time between poll() calls
    "session.timeout.ms": 45000,           # heartbeat timeout
    "heartbeat.interval.ms": 3000,
    "fetch.min.bytes": 10240,              # wait for at least 10 KB before returning
    "fetch.max.wait.ms": 500,
    "max.poll.records": 500,               # messages per poll()
    "partition.assignment.strategy": "cooperative-sticky",  # minimize rebalance disruption
}

DLT_CONFIG = {
    "bootstrap.servers": "localhost:9092",
    "enable.idempotence": True,
    "acks": "all",
}

consumer = Consumer(CONSUMER_CONFIG)
dlt_producer = Producer(DLT_CONFIG)
running = True

def shutdown(signum, frame):
    global running
    logger.info("Shutdown signal received. Finishing current batch...")
    running = False

signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

def process_event(event: dict) -> None:
    """Your business logic here. Must be idempotent."""
    event_type = event.get("event_type")
    if event_type == "PURCHASE":
        # e.g. update inventory, send confirmation email trigger
        logger.info("Processing purchase for user %s", event.get("user_id"))
    elif event_type == "PAGE_VIEW":
        pass  # lightweight — just ack
    else:
        raise ValueError(f"Unknown event type: {event_type}")

def send_to_dlt(msg, error: Exception) -> None:
    headers = list(msg.headers() or []) + [
        ("dlt-original-topic", b"user-events"),
        ("dlt-original-partition", str(msg.partition()).encode()),
        ("dlt-original-offset", str(msg.offset()).encode()),
        ("dlt-consumer-group", b"user-event-processor-v1"),
        ("dlt-error-class", type(error).__name__.encode()),
        ("dlt-error-message", str(error)[:1000].encode()),
    ]
    dlt_producer.produce(
        "user-events-dlt",
        key=msg.key(),
        value=msg.value(),
        headers=headers,
    )
    dlt_producer.poll(0)

consumer.subscribe(
    ["user-events"],
    on_assign=lambda c, partitions: logger.info("Assigned: %s", partitions),
    on_revoke=lambda c, partitions: logger.info("Revoked: %s", partitions),
)

try:
    while running:
        # poll() blocks for up to timeout seconds waiting for messages
        messages = consumer.consume(num_messages=500, timeout=1.0)

        if not messages:
            continue

        for msg in messages:
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue  # reached end of partition — normal
                raise KafkaException(msg.error())

            try:
                event = json.loads(msg.value())
                process_event(event)
            except Exception as exc:
                logger.warning(
                    "Failed to process offset %d on %s[%d]: %s",
                    msg.offset(), msg.topic(), msg.partition(), exc,
                )
                send_to_dlt(msg, exc)
                # Don't re-raise — commit the offset to skip the bad message

        # Commit all consumed offsets after processing the batch
        # This is safe: if we crash before commit, we reprocess — idempotent
        consumer.commit(asynchronous=False)
        logger.debug("Committed batch of %d messages", len(messages))

finally:
    logger.info("Closing consumer...")
    consumer.close()       # commits pending offsets, leaves group cleanly
    dlt_producer.flush()
    logger.info("Consumer closed.")`,
          notes: [
            "consumer.consume(num_messages=N) is more efficient than repeated poll() — it returns up to N messages in one call, allowing batch processing.",
            "Commit AFTER processing the batch (not after each message). One commit per batch reduces broker load significantly.",
            "cooperative-sticky partition assignment (Kafka 2.4+) performs incremental rebalancing — only reassigns partitions that need to move, avoiding the full stop-the-world rebalance.",
            "on_revoke callback is where you should flush any in-progress state before partitions are taken away during rebalancing.",
          ]
        },
        {
          title: "Async Consumer with asyncio (FastAPI Integration)",
          lang: "python",
          filename: "async_consumer.py",
          desc: "Kafka consumer running in a background asyncio task — integrates cleanly with FastAPI lifespan events. Uses aiokafka for native async support.",
          code: `from contextlib import asynccontextmanager
from fastapi import FastAPI
import asyncio
import json
import logging
from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaConnectionError

logger = logging.getLogger(__name__)

async def consume_events(app: FastAPI):
    """Background task: consume Kafka events and update app state."""
    consumer = AIOKafkaConsumer(
        "user-events",
        bootstrap_servers="localhost:9092",
        group_id="fastapi-consumer",
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
    )

    await consumer.start()
    logger.info("Kafka consumer started")

    try:
        async for msg in consumer:
            try:
                event = msg.value
                # Example: update in-memory cache, trigger side effects
                await handle_event(event)
                await consumer.commit()
            except Exception as exc:
                logger.error("Failed to process event at offset %d: %s", msg.offset, exc)
                # Don't commit — message will be redelivered on restart
    except asyncio.CancelledError:
        logger.info("Consumer task cancelled — shutting down")
    finally:
        await consumer.stop()

async def handle_event(event: dict):
    event_type = event.get("event_type")
    logger.info("Handling %s for user %s", event_type, event.get("user_id"))
    await asyncio.sleep(0)  # yield control back to event loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch consumer as background task
    consumer_task = asyncio.create_task(consume_events(app))
    yield
    # Shutdown: cancel the consumer task and wait for clean exit
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok"}`,
          notes: [
            "aiokafka is the go-to library for async Python. Use it when your processing involves async I/O (database calls, HTTP requests). For CPU-bound processing, run synchronous confluent-kafka in a thread pool.",
            "The FastAPI lifespan pattern (asynccontextmanager) replaces the deprecated on_startup/on_shutdown events. The consumer runs as a background task from server start to graceful shutdown.",
            "If your consumer needs to call async APIs (aiohttp, asyncpg), aiokafka's async for msg in consumer lets you await inside the loop naturally.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-schema-registry-code",
      title: "Schema Registry & Avro",
      icon: "📋",
      items: [
        {
          title: "Avro Producer & Consumer with Schema Registry",
          lang: "python",
          filename: "avro_producer_consumer.py",
          desc: "End-to-end Avro serialization with the Confluent Schema Registry. Schema is registered automatically on first produce; consumers deserialize using the schema ID embedded in each message.",
          code: `from confluent_kafka import Producer, Consumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer, AvroDeserializer
from confluent_kafka.serialization import (
    SerializationContext,
    MessageField,
    StringSerializer,
    StringDeserializer,
)
import uuid, time

SCHEMA_REGISTRY_URL = "http://localhost:8081"
BOOTSTRAP_SERVERS = "localhost:9092"
TOPIC = "user-events"

# ── Define Avro schema ────────────────────────────────────────────────
USER_EVENT_SCHEMA = """
{
  "type": "record",
  "name": "UserEvent",
  "namespace": "com.myapp.events",
  "fields": [
    {"name": "event_id",    "type": "string"},
    {"name": "user_id",     "type": "string"},
    {"name": "event_type",  "type": "string"},
    {"name": "timestamp_ms","type": "long"},
    {"name": "properties",  "type": {"type": "map", "values": "string"}, "default": {}}
  ]
}
"""

# ── Schema Registry client (shared by producer + consumer) ────────────
schema_registry_client = SchemaRegistryClient({"url": SCHEMA_REGISTRY_URL})

# ── PRODUCER ──────────────────────────────────────────────────────────
avro_serializer = AvroSerializer(
    schema_registry_client,
    USER_EVENT_SCHEMA,
    # Optional: transform dict before serialization
    to_dict=lambda obj, ctx: obj if isinstance(obj, dict) else vars(obj),
)
string_serializer = StringSerializer("utf_8")

producer = Producer({
    "bootstrap.servers": BOOTSTRAP_SERVERS,
    "acks": "all",
    "enable.idempotence": True,
})

def produce_event(event: dict):
    producer.produce(
        topic=TOPIC,
        key=string_serializer(event["user_id"]),
        value=avro_serializer(
            event,
            SerializationContext(TOPIC, MessageField.VALUE),
        ),
        on_delivery=lambda err, msg: (
            print(f"ERROR: {err}") if err else
            print(f"Delivered offset={msg.offset()} partition={msg.partition()}")
        ),
    )
    producer.poll(0)

# Produce sample events
for i in range(5):
    produce_event({
        "event_id": str(uuid.uuid4()),
        "user_id": f"user-{i % 3}",       # 3 unique users → 3 partitions
        "event_type": "PAGE_VIEW",
        "timestamp_ms": int(time.time() * 1000),
        "properties": {"page": f"/product/{i}", "ab_test": "variant-b"},
    })

producer.flush()
print("\\n--- Now consuming ---\\n")

# ── CONSUMER ──────────────────────────────────────────────────────────
avro_deserializer = AvroDeserializer(schema_registry_client)
string_deserializer = StringDeserializer("utf_8")

consumer = Consumer({
    "bootstrap.servers": BOOTSTRAP_SERVERS,
    "group.id": "avro-demo-consumer",
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,
})
consumer.subscribe([TOPIC])

try:
    for _ in range(10):  # consume up to 10 messages for the demo
        msg = consumer.poll(timeout=3.0)
        if msg is None:
            break
        if msg.error():
            print(f"Error: {msg.error()}")
            continue

        key = string_deserializer(msg.key())
        value = avro_deserializer(
            msg.value(),
            SerializationContext(msg.topic(), MessageField.VALUE),
        )
        print(f"key={key} | event_type={value['event_type']} | user={value['user_id']}")
        consumer.commit(message=msg)
finally:
    consumer.close()`,
          notes: [
            "The first produce() call registers the schema in Schema Registry and gets back a schema ID (e.g. 1). All subsequent messages embed this 4-byte ID, not the full schema. Consumers fetch the schema once and cache it.",
            "Schema Registry subjects follow the TopicNameStrategy by default: topic-name-value. Check registered subjects: curl http://localhost:8081/subjects",
            "To test schema compatibility before deploying: curl -X POST http://localhost:8081/compatibility/subjects/user-events-value/versions/latest -H 'Content-Type: application/json' -d '{\"schema\": \"...new schema JSON...\"}'",
          ]
        },
        {
          title: "Schema Evolution: Adding a Field Safely",
          lang: "bash",
          filename: "schema-evolution.sh",
          desc: "Demonstrate BACKWARD-compatible schema evolution — adding an optional field. Verify compatibility via the Schema Registry REST API before updating producers.",
          code: `REGISTRY="http://localhost:8081"
SUBJECT="user-events-value"

# ── 1. Check current compatibility mode ──────────────────────────────
curl -s "$REGISTRY/config/$SUBJECT" | jq .
# {"compatibilityLevel": "BACKWARD"}

# ── 2. Propose a new schema with an added optional field ─────────────
NEW_SCHEMA=$(cat <<'EOF'
{
  "type": "record",
  "name": "UserEvent",
  "namespace": "com.myapp.events",
  "fields": [
    {"name": "event_id",    "type": "string"},
    {"name": "user_id",     "type": "string"},
    {"name": "event_type",  "type": "string"},
    {"name": "timestamp_ms","type": "long"},
    {"name": "properties",  "type": {"type": "map", "values": "string"}, "default": {}},
    {
      "name": "session_id",
      "type": ["null", "string"],
      "default": null,
      "doc": "New optional field — BACKWARD compatible because it has a default"
    }
  ]
}
EOF
)

# ── 3. Test compatibility BEFORE registering ─────────────────────────
curl -s -X POST \\
  "$REGISTRY/compatibility/subjects/$SUBJECT/versions/latest" \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d "{\"schema\": $(echo $NEW_SCHEMA | jq -Rs .)}" | jq .
# {"is_compatible": true}   ← safe to register

# ── 4. Register the new version ───────────────────────────────────────
curl -s -X POST \\
  "$REGISTRY/subjects/$SUBJECT/versions" \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d "{\"schema\": $(echo $NEW_SCHEMA | jq -Rs .)}" | jq .
# {"id": 2}   ← new version registered

# ── 5. List versions ──────────────────────────────────────────────────
curl -s "$REGISTRY/subjects/$SUBJECT/versions" | jq .
# [1, 2]

# ── 6. What would FAIL compatibility? ────────────────────────────────
# Renaming "user_id" to "userId"   → BACKWARD FAIL (old consumers look for "user_id")
# Changing "event_type" to int     → FAIL (type change)
# Adding required field no default → FAIL (old data has no value for it)
# These would return: {"is_compatible": false}`,
          notes: [
            "Always run a compatibility check against the Registry before merging a schema change to main. Add it to your CI pipeline: fail the build if is_compatible is false.",
            "BACKWARD compatibility (the default) means: deploy consumers first (they handle both old and new schema), then deploy producers that start writing new schema fields.",
            "To do a full migration (change a required field type, rename a field): use a versioned topic (user-events-v2), dual-write from producers, migrate consumers, then deprecate v1.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-connect-debezium",
      title: "Kafka Connect & Debezium CDC",
      icon: "🔗",
      items: [
        {
          title: "Kafka Connect + Debezium: Full Docker Compose Stack",
          lang: "yaml",
          filename: "compose.debezium.yml",
          desc: "Complete CDC stack: PostgreSQL with logical replication enabled, Kafka Connect with Debezium, and a consumer that maintains a derived read model. Demonstrates the Outbox pattern.",
          code: `# compose.debezium.yml — CDC pipeline: PostgreSQL → Debezium → Kafka → Consumer
# Extends compose.kafka.yml; run both together:
# docker compose -f compose.kafka.yml -f compose.debezium.yml up -d
services:

  postgres:
    image: postgres:16-alpine
    container_name: postgres-cdc
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    # Enable logical replication (required for Debezium WAL reading)
    command: >
      postgres
        -c wal_level=logical
        -c max_replication_slots=4
        -c max_wal_senders=4
        -c wal_keep_size=1024
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks: [kafka-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10

  kafka-connect:
    image: confluentinc/cp-kafka-connect:7.7.0
    container_name: kafka-connect
    depends_on:
      kafka-broker-1: { condition: service_healthy }
      schema-registry: { condition: service_healthy }
      postgres: { condition: service_healthy }
    ports:
      - "8083:8083"
    environment:
      CONNECT_BOOTSTRAP_SERVERS: kafka-broker-1:29092,kafka-broker-2:29093,kafka-broker-3:29094
      CONNECT_REST_ADVERTISED_HOST_NAME: kafka-connect
      CONNECT_REST_PORT: 8083
      CONNECT_GROUP_ID: "kafka-connect-cluster"
      # Internal topics (where Connect stores offsets, configs, status)
      CONNECT_CONFIG_STORAGE_TOPIC: _connect-configs
      CONNECT_OFFSET_STORAGE_TOPIC: _connect-offsets
      CONNECT_STATUS_STORAGE_TOPIC: _connect-status
      CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 3
      CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 3
      CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 3
      CONNECT_OFFSET_FLUSH_INTERVAL_MS: 10000
      # Converters (how data is serialized in Kafka topics)
      CONNECT_KEY_CONVERTER: io.confluent.connect.avro.AvroConverter
      CONNECT_VALUE_CONVERTER: io.confluent.connect.avro.AvroConverter
      CONNECT_KEY_CONVERTER_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      # Install Debezium PostgreSQL connector
      CONNECT_PLUGIN_PATH: "/usr/share/java,/usr/share/confluent-hub-components"
    command:
      - bash
      - -c
      - |
        confluent-hub install --no-prompt debezium/debezium-connector-postgresql:2.5.4
        /etc/confluent/docker/run
    volumes:
      - kafka-connect-plugins:/usr/share/confluent-hub-components
    networks: [kafka-net]
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8083/connectors > /dev/null"]
      interval: 15s
      retries: 10

volumes:
  pgdata:
  kafka-connect-plugins:`,
          notes: [
            "wal_level=logical is required on PostgreSQL for Debezium. In managed PostgreSQL (RDS, Cloud SQL), this is set via parameter groups, not command flags.",
            "The Debezium connector uses a replication slot to read the WAL. Monitor pg_replication_slots — if the slot accumulates WAL faster than Debezium reads, your PostgreSQL disk fills up. Set max_slot_wal_keep_size as a safety valve.",
            "CONNECT_KEY_CONVERTER and VALUE_CONVERTER apply globally. Override per-connector with key.converter and value.converter in the connector config.",
          ]
        },
        {
          title: "Debezium Connector Registration & SQL Setup",
          lang: "bash",
          filename: "setup-debezium.sh",
          desc: "Register the Debezium PostgreSQL source connector via the Kafka Connect REST API, and set up the PostgreSQL schema with an outbox table.",
          code: `# ── 1. Create PostgreSQL schema (init.sql) ───────────────────────────
psql -U postgres -d appdb <<'SQL'
-- Application tables
CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL,
  total_cents BIGINT NOT NULL,
  status      VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outbox table (written atomically with business data)
CREATE TABLE outbox_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(64) NOT NULL,  -- e.g. 'order'
  aggregate_id   VARCHAR(64) NOT NULL,  -- e.g. order ID
  event_type     VARCHAR(128) NOT NULL, -- e.g. 'order.created'
  payload        JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Publication for Debezium (capture only outbox table, not all tables)
CREATE PUBLICATION dbz_publication FOR TABLE outbox_events;

-- Grant replication access to Debezium user
CREATE USER debezium WITH REPLICATION PASSWORD 'dbz_secret';
GRANT SELECT ON outbox_events TO debezium;
SQL

# ── 2. Register Debezium connector ───────────────────────────────────
curl -s -X POST http://localhost:8083/connectors \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "postgres-outbox-connector",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "database.hostname": "postgres",
      "database.port": "5432",
      "database.user": "debezium",
      "database.password": "dbz_secret",
      "database.dbname": "appdb",
      "database.server.name": "appdb",

      "plugin.name": "pgoutput",
      "publication.name": "dbz_publication",
      "slot.name": "debezium_slot",

      "table.include.list": "public.outbox_events",
      "tombstones.on.delete": "false",

      "transforms": "outbox",
      "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
      "transforms.outbox.table.field.event.id": "id",
      "transforms.outbox.table.field.event.key": "aggregate_id",
      "transforms.outbox.table.field.event.payload": "payload",
      "transforms.outbox.route.by.field": "aggregate_type",
      "transforms.outbox.route.topic.replacement": "outbox.$1",

      "key.converter": "org.apache.kafka.connect.storage.StringConverter",
      "value.converter": "org.apache.kafka.connect.json.JsonConverter",
      "value.converter.schemas.enable": "false"
    }
  }' | jq .

# ── 3. Check connector status ─────────────────────────────────────────
curl -s http://localhost:8083/connectors/postgres-outbox-connector/status | jq .
# {"name": "...", "connector": {"state": "RUNNING"}, "tasks": [{"id": 0, "state": "RUNNING"}]}

# ── 4. Write a test order with outbox event ───────────────────────────
psql -U postgres -d appdb <<'SQL'
BEGIN;
  INSERT INTO orders (user_id, total_cents, status)
  VALUES ('user-42', 9999, 'paid')
  RETURNING id;

  INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
  VALUES (
    'order',
    '1',                            -- matches the order id returned above
    'order.paid',
    '{"order_id": 1, "user_id": "user-42", "total_cents": 9999}'
  );
COMMIT;
SQL

# ── 5. Verify event appeared in Kafka ─────────────────────────────────
kafka-console-consumer.sh \\
  --bootstrap-server localhost:9092 \\
  --topic outbox.order \\           # EventRouter routes to outbox.{aggregate_type}
  --from-beginning \\
  --max-messages 1`,
          notes: [
            "The EventRouter SMT (Single Message Transform) routes outbox events to topics named outbox.{aggregate_type} — e.g. outbox.order, outbox.user. This means you don't need a separate Debezium connector per event type.",
            "The replication slot (debezium_slot) persists WAL position even when Debezium is down. If Debezium is down for a long time, WAL accumulates. Monitor pg_replication_slots.pg_current_wal_lsn.",
            "Use CREATE PUBLICATION FOR TABLE to capture only specific tables — never capture all tables unless you need it. Reduces noise and WAL overhead.",
          ]
        },
        {
          title: "Elasticsearch Sink Connector",
          lang: "bash",
          filename: "elasticsearch-sink.sh",
          desc: "Sink connector that writes Kafka events to Elasticsearch in real time — no custom consumer code needed.",
          code: `# Register Elasticsearch sink connector
# Prerequisite: install plugin in Kafka Connect:
# confluent-hub install confluentinc/kafka-connect-elasticsearch:14.0.12

curl -s -X POST http://localhost:8083/connectors \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "elasticsearch-sink",
    "config": {
      "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
      "tasks.max": "3",
      "topics": "user-events",
      "connection.url": "http://elasticsearch:9200",
      "type.name": "_doc",

      "key.ignore": "false",
      "schema.ignore": "true",

      "behavior.on.null.values": "delete",   # null value = delete from ES
      "behavior.on.malformed.documents": "warn",

      "batch.size": 2000,
      "linger.ms": 100,
      "flush.timeout.ms": 10000,
      "max.retries": 5,
      "retry.backoff.ms": 100,

      "transforms": "addTimestamp",
      "transforms.addTimestamp.type": "org.apache.kafka.connect.transforms.InsertField$Value",
      "transforms.addTimestamp.timestamp.field": "indexed_at"
    }
  }' | jq .

# ── List all registered connectors ────────────────────────────────────
curl -s http://localhost:8083/connectors | jq .

# ── Pause / resume a connector ────────────────────────────────────────
curl -X PUT http://localhost:8083/connectors/elasticsearch-sink/pause
curl -X PUT http://localhost:8083/connectors/elasticsearch-sink/resume

# ── Delete a connector (does NOT delete the Kafka topic) ──────────────
curl -X DELETE http://localhost:8083/connectors/elasticsearch-sink`,
          notes: [
            "Sink connectors are pure config — no Python or Java code. The Kafka Connect framework handles partition assignment, offset tracking, and retries automatically.",
            "behavior.on.null.values=delete enables tombstone support — produce a null value with a key to delete the corresponding Elasticsearch document.",
            "tasks.max should not exceed the number of partitions in the source topic. Connect will silently limit it to partition count.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-streams-faust",
      title: "Stream Processing (Faust / ksqlDB)",
      icon: "⚡",
      items: [
        {
          title: "Real-Time Aggregations with Faust (Python Kafka Streams)",
          lang: "python",
          filename: "faust_app.py",
          desc: "Faust is a Python port of Kafka Streams. This example counts purchases per user per minute in a tumbling window and writes results to an output topic. Faust manages state in RocksDB.",
          code: `import faust
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

app = faust.App(
    "purchase-analytics",
    broker="kafka://localhost:9092",
    store="rocksdb://",              # persistent state (survives restarts)
    version=1,
    topic_partitions=12,
    consumer_auto_offset_reset="earliest",
)

# ── Input / output topics ─────────────────────────────────────────────
class UserEvent(faust.Record, serializer="json"):
    event_id: str
    user_id: str
    event_type: str
    timestamp_ms: int
    amount_cents: int = 0

class PurchaseSummary(faust.Record, serializer="json"):
    user_id: str
    window_start: str
    purchase_count: int
    total_cents: int

user_events_topic = app.topic("user-events", value_type=UserEvent)
purchase_summary_topic = app.topic("purchase-summaries", value_type=PurchaseSummary)

# ── Windowed state table (1-minute tumbling window) ───────────────────
purchase_counts = app.Table(
    "purchase-counts",
    default=int,
).tumbling(60.0, expires=3600.0)   # 1-min windows, expire state after 1h

purchase_totals = app.Table(
    "purchase-totals",
    default=int,
).tumbling(60.0, expires=3600.0)

# ── Stream processor ─────────────────────────────────────────────────
@app.agent(user_events_topic)
async def process_events(events):
    async for event in events.filter(lambda e: e.event_type == "PURCHASE"):
        # State tables are keyed by (key, window) automatically in windowed mode
        purchase_counts[event.user_id] += 1
        purchase_totals[event.user_id] += event.amount_cents

        count = purchase_counts[event.user_id].current()
        total = purchase_totals[event.user_id].current()

        window_start = datetime.fromtimestamp(
            purchase_counts[event.user_id].current_window().start,
            tz=timezone.utc,
        ).isoformat()

        summary = PurchaseSummary(
            user_id=event.user_id,
            window_start=window_start,
            purchase_count=count,
            total_cents=total,
        )
        await purchase_summary_topic.send(key=event.user_id, value=summary)
        logger.info("User %s: %d purchases totalling %d cents in window %s",
                    event.user_id, count, total, window_start)

# ── Periodic task: log lag ────────────────────────────────────────────
@app.timer(interval=30.0)
async def log_stats():
    logger.info("Active window count entries: %d", len(purchase_counts))

# Run: faust -A faust_app worker -l info`,
          notes: [
            "Faust stores windowed state in RocksDB locally + a Kafka changelog topic for recovery. On restart, state is rebuilt from the changelog — typically fast for recent windows.",
            "Faust apps scale horizontally: run multiple worker instances against the same Kafka consumer group. Faust distributes partitions (and state) across workers.",
            "For production Faust: set KAFKA_CONSUMER_MAX_POLL_INTERVAL_MS high enough that slow processing doesn't trigger a rebalance. Also set app.stream_wait_empty=False for better throughput.",
          ]
        },
        {
          title: "ksqlDB: Real-Time Feature Pipeline",
          lang: "sql",
          filename: "feature_pipeline.ksql",
          desc: "Build a real-time ML feature pipeline entirely in SQL. Compute rolling purchase statistics per user and join with user profile data for enriched feature vectors.",
          code: `-- ── Step 1: Register streams from existing topics ─────────────────────
CREATE STREAM purchase_events (
  event_id    VARCHAR KEY,
  user_id     VARCHAR,
  event_type  VARCHAR,
  amount_cents BIGINT,
  timestamp_ms BIGINT,
  category    VARCHAR
) WITH (
  KAFKA_TOPIC = 'user-events',
  VALUE_FORMAT = 'AVRO',
  TIMESTAMP = 'timestamp_ms'   -- use event time for windowing
);

CREATE TABLE user_profiles (
  user_id     VARCHAR PRIMARY KEY,
  email       VARCHAR,
  plan        VARCHAR,
  signup_date VARCHAR,
  country     VARCHAR
) WITH (
  KAFKA_TOPIC = 'user-profiles',
  VALUE_FORMAT = 'AVRO'
);

-- ── Step 2: Filter to purchase events only ─────────────────────────────
CREATE STREAM purchases AS
  SELECT *
  FROM purchase_events
  WHERE event_type = 'PURCHASE'
  EMIT CHANGES;

-- ── Step 3: 1-hour tumbling window features ────────────────────────────
CREATE TABLE user_purchase_features_1h AS
  SELECT
    user_id,
    WINDOWSTART                           AS window_start,
    WINDOWEND                             AS window_end,
    COUNT(*)                              AS purchase_count_1h,
    SUM(amount_cents)                     AS total_spend_cents_1h,
    AVG(amount_cents)                     AS avg_order_cents_1h,
    MAX(amount_cents)                     AS max_order_cents_1h,
    COLLECT_SET(category)                 AS categories_purchased_1h
  FROM purchases
  WINDOW TUMBLING (SIZE 1 HOUR, RETENTION 24 HOURS)
  GROUP BY user_id
  EMIT FINAL;   -- emit once when window closes (not on every event)

-- ── Step 4: 7-day hopping window for longer-range features ─────────────
CREATE TABLE user_purchase_features_7d AS
  SELECT
    user_id,
    COUNT(*)          AS purchase_count_7d,
    SUM(amount_cents) AS total_spend_cents_7d
  FROM purchases
  WINDOW HOPPING (SIZE 7 DAYS, ADVANCE BY 1 HOUR, RETENTION 14 DAYS)
  GROUP BY user_id
  EMIT FINAL;

-- ── Step 5: Enrich with user profile (stream-table join) ───────────────
CREATE STREAM enriched_features AS
  SELECT
    f.user_id,
    f.window_start,
    f.purchase_count_1h,
    f.total_spend_cents_1h,
    f.avg_order_cents_1h,
    p.plan,
    p.country,
    p.signup_date
  FROM user_purchase_features_1h f
  LEFT JOIN user_profiles p ON f.user_id = p.user_id
  EMIT CHANGES;

-- ── Step 6: Route high-value users to a priority topic ─────────────────
CREATE STREAM high_value_users AS
  SELECT *
  FROM enriched_features
  WHERE total_spend_cents_1h > 50000   -- > $500 in one hour
  EMIT CHANGES;

-- ── Inspect running queries ────────────────────────────────────────────
SHOW QUERIES;
EXPLAIN EXTENDED <query_id>;

-- ── Pull query: read current feature value for a user ─────────────────
SELECT user_id, purchase_count_1h, total_spend_cents_1h
FROM user_purchase_features_1h
WHERE user_id = 'user-42';`,
          notes: [
            "EMIT FINAL emits one result per window when the window closes — ideal for writing clean feature records. EMIT CHANGES emits on every update, which creates many intermediate records.",
            "RETENTION 24 HOURS keeps window state in the store for 24 hours after the window closes — allows late-arriving events to be processed. Set it higher than your expected event lateness.",
            "ksqlDB pull queries (SELECT ... WHERE key = ...) read the materialised table synchronously — useful for feature serving. Push queries (EMIT CHANGES) stream results continuously to a consumer.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kafka-ai-pipeline",
      title: "AI Pipeline: Event-Driven RAG Ingestion",
      icon: "🤖",
      items: [
        {
          title: "End-to-End RAG Ingestion Pipeline with Kafka",
          lang: "python",
          filename: "rag_ingestion_pipeline.py",
          desc: "Production-grade event-driven pipeline: documents are published to Kafka → embedding worker consumes, chunks, and embeds with OpenAI → writes vectors to Qdrant. Failures route to a dead letter topic.",
          code: `"""
RAG ingestion pipeline using Kafka.

Architecture:
  API (FastAPI) → Kafka topic: document-uploads
                     ↓
              Embedding Worker
              (this file, N instances for parallelism)
                     ↓
              Qdrant vector store
                     ↓ (on failure)
              document-uploads-dlt

Run multiple workers:
  python rag_ingestion_pipeline.py  # instance 1
  python rag_ingestion_pipeline.py  # instance 2 (same group, different partitions)
"""

import json
import logging
import signal
import hashlib
import os
from dataclasses import dataclass, asdict
from textwrap import wrap
from confluent_kafka import Consumer, Producer, KafkaException
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
TOPIC = "document-uploads"
DLT_TOPIC = "document-uploads-dlt"
GROUP_ID = "rag-embedding-worker"
COLLECTION = "documents"
CHUNK_SIZE = 512           # characters per chunk
CHUNK_OVERLAP = 64         # overlap between consecutive chunks
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM = 1536

# ── Clients ──────────────────────────────────────────────────────────
openai_client = OpenAI(api_key=OPENAI_API_KEY)
qdrant = QdrantClient(url=QDRANT_URL)

def ensure_collection():
    existing = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION not in existing:
        qdrant.create_collection(
            COLLECTION,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )
        logger.info("Created Qdrant collection: %s", COLLECTION)

@dataclass
class DocumentUpload:
    doc_id: str
    title: str
    content: str
    source: str
    metadata: dict

def chunk_text(text: str, size: int, overlap: int) -> list[str]:
    """Simple character-level chunking with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap
    return chunks

def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed up to 100 texts in one API call."""
    response = openai_client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [r.embedding for r in response.data]

def process_document(doc: DocumentUpload) -> int:
    """Chunk document, embed all chunks, upsert to Qdrant. Returns chunk count."""
    chunks = chunk_text(doc.content, CHUNK_SIZE, CHUNK_OVERLAP)
    if not chunks:
        return 0

    # Embed in batches of 100 (OpenAI limit)
    embeddings = []
    for i in range(0, len(chunks), 100):
        batch = chunks[i:i + 100]
        embeddings.extend(embed_batch(batch))

    points = [
        PointStruct(
            id=int(hashlib.sha256(f"{doc.doc_id}:{idx}".encode()).hexdigest(), 16) % (2**63),
            vector=embedding,
            payload={
                "doc_id": doc.doc_id,
                "chunk_index": idx,
                "chunk_total": len(chunks),
                "title": doc.title,
                "source": doc.source,
                "text": chunk,
                **doc.metadata,
            },
        )
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    qdrant.upsert(collection_name=COLLECTION, points=points)
    logger.info("doc_id=%s: upserted %d chunks to Qdrant", doc.doc_id, len(points))
    return len(points)

# ── Consumer + DLT producer ──────────────────────────────────────────
consumer = Consumer({
    "bootstrap.servers": KAFKA_BROKERS,
    "group.id": GROUP_ID,
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,
    "max.poll.interval.ms": 600000,   # 10 min — embedding large docs takes time
    "session.timeout.ms": 60000,
    "partition.assignment.strategy": "cooperative-sticky",
})

dlt_producer = Producer({
    "bootstrap.servers": KAFKA_BROKERS,
    "acks": "all",
    "enable.idempotence": True,
})

running = True
signal.signal(signal.SIGTERM, lambda *_: globals().update(running=False))
signal.signal(signal.SIGINT, lambda *_: globals().update(running=False))

ensure_collection()
consumer.subscribe([TOPIC])
logger.info("Worker started. Consuming from %s", TOPIC)

try:
    while running:
        msg = consumer.poll(timeout=2.0)
        if msg is None:
            continue
        if msg.error():
            raise KafkaException(msg.error())

        try:
            data = json.loads(msg.value())
            doc = DocumentUpload(**data)
            chunk_count = process_document(doc)
            consumer.commit(message=msg)
            logger.info("Committed offset=%d (doc=%s, chunks=%d)",
                        msg.offset(), doc.doc_id, chunk_count)

        except Exception as exc:
            logger.error("Failed doc at offset %d: %s", msg.offset(), exc)
            dlt_producer.produce(
                DLT_TOPIC,
                key=msg.key(),
                value=msg.value(),
                headers=list(msg.headers() or []) + [
                    ("dlt-error", str(exc)[:500].encode()),
                    ("dlt-offset", str(msg.offset()).encode()),
                ],
            )
            dlt_producer.flush()
            consumer.commit(message=msg)   # skip bad message

finally:
    consumer.close()
    logger.info("Worker shut down.")`,
          notes: [
            "max.poll.interval.ms=600000 is critical here — embedding a large document can take 30-60 seconds. If this is too low, Kafka considers the consumer dead and triggers a rebalance mid-processing.",
            "Scale the embedding workers up to the partition count. With 12 partitions, you can run 12 parallel workers — each handling its own partition independently.",
            "The doc_id + chunk_index hash as the Qdrant point ID makes the pipeline idempotent: re-processing the same document just upserts the same points (overwrite, not duplicate).",
            "In production, replace the OpenAI API with a self-hosted embedding model (e.g. sentence-transformers via FastAPI) to eliminate per-token costs on high-volume ingestion.",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
