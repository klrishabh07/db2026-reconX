# Day 9 — Solved Files & How To Run

Day 9 is the Kafka day. You wire the event backbone: a producer that
publishes every trade-state change onto `trade-events`, three consumers
that fan out to reconciliation / audit / alerts, an error handler with
DLQ + exponential-backoff retry, a DLQ inspector and replay endpoint,
an event-sourced audit rebuild, Kafka metrics wired to Prometheus, three
Grafana panels, and two Testcontainers integration tests.

**How this folder works**

The real `backend/` tree ships all Java files as starter stubs with
`throw new UnsupportedOperationException("TODO(TICKET-ADVxxx)")` method
bodies. This folder contains **complete drop-in replacements** for every
file that needs a code change. The `application.yml` and Grafana JSON
files are new additions that do not exist in the starter at all.

You can **overlay** the whole tree in one shot, or **open each file**
side-by-side with the starter to read the diff first.

## Quick start — one-shot overlay

```bash
# From the project root:
cp -R day9-solved-files/backend/ backend/
cp -R day9-solved-files/monitoring/ monitoring/
```

---

## Ticket status — all 18 tickets (ADV128–ADV145)

| Ticket | File(s) in this folder | Status |
|---|---|---|
| ADV128 — Declare Kafka topics on startup | `backend/.../kafka/KafkaTopicsConfig.java` | ✅ Solved |
| ADV129 — TradeEventProducer | `backend/.../kafka/TradeEventProducer.java` | ✅ Solved |
| ADV130 — TradeEvent DTO shape | `dto/TradeEvent.java` in the starter | ✓ Already in starter |
| ADV131 — ReconciliationConsumer | `backend/.../kafka/ReconciliationConsumer.java` | ✅ Solved |
| ADV132 — AuditEventConsumer | `backend/.../kafka/AuditEventConsumer.java` | ✅ Solved |
| ADV133 — AlertConsumer | `backend/.../kafka/AlertConsumer.java` | ✅ Solved |
| ADV134 — DLQ via DeadLetterPublishingRecoverer | `backend/.../kafka/KafkaErrorHandlerConfig.java` | ✅ Solved |
| ADV135 — Exponential backoff retry (1s/2s/4s) | `backend/.../kafka/KafkaErrorHandlerConfig.java` | ✅ Solved (same file as ADV134) |
| ADV136 — DLQ consumer + replay endpoint | `backend/.../kafka/DlqConsumer.java` + `backend/.../controller/DlqAdminController.java` | ✅ Solved |
| ADV137 — Event sourcing rebuild | `backend/.../service/TradeAggregator.java` | ✅ Solved |
| ADV138 — Admin audit endpoint | `backend/.../controller/AuditController.java` | ✅ Solved |
| ADV139 — Kafka metrics via Micrometer | `backend/.../resources/application.yml` | ✅ Solved |
| ADV140 — Grafana panel: consumer lag by topic | `monitoring/grafana/.../reconx-kafka.json` | ✅ Solved |
| ADV141 — Grafana panel: messages/sec produced vs consumed | `monitoring/grafana/.../reconx-kafka.json` | ✅ Solved (same file as ADV140) |
| ADV142 — Grafana panel: DLQ count + alert rule | `monitoring/grafana/.../reconx-kafka.json` | ✅ Solved (same file as ADV140) |
| ADV143 — Integration test: end-to-end happy path | `backend/.../test/.../kafka/KafkaPipelineIT.java` | ✅ Solved |
| ADV144 — Integration test: DLQ on consumer failure | `backend/.../test/.../kafka/DlqRoutingIT.java` | ✅ Solved |
| ADV145 — AI-assisted Kafka consumer config review | Live Claude session + PR description | N/A — no code file |

---

## File map

```
day9-solved-files/
├── backend/
│   └── src/
│       ├── main/
│       │   ├── java/com/dbtraining/reconx/
│       │   │   ├── controller/
│       │   │   │   ├── AuditController.java          ← ADV138
│       │   │   │   └── DlqAdminController.java       ← ADV136 (part 2)
│       │   │   ├── kafka/
│       │   │   │   ├── AlertConsumer.java             ← ADV133
│       │   │   │   ├── AuditEventConsumer.java        ← ADV132
│       │   │   │   ├── DlqConsumer.java               ← ADV136 (part 1)
│       │   │   │   ├── KafkaErrorHandlerConfig.java   ← ADV134 + ADV135
│       │   │   │   ├── KafkaTopicsConfig.java         ← ADV128
│       │   │   │   ├── ReconciliationConsumer.java    ← ADV131
│       │   │   │   └── TradeEventProducer.java        ← ADV129
│       │   │   └── service/
│       │   │       └── TradeAggregator.java           ← ADV137
│       │   └── resources/
│       │       └── application.yml                    ← ADV139
│       └── test/
│           └── java/com/dbtraining/reconx/kafka/
│               ├── KafkaPipelineIT.java               ← ADV143
│               └── DlqRoutingIT.java                  ← ADV144
└── monitoring/
    └── grafana/
        └── provisioning/
            └── dashboards/
                └── reconx-kafka.json                  ← ADV140 + ADV141 + ADV142
```

---

## How to finish each file

### Kafka files (ADV128–ADV135) — `src/main/java/.../kafka/`

Each file has TODO stubs at the top. The map:

| File | What it needs |
|---|---|
| `KafkaTopicsConfig.java` | Four `@Bean NewTopic` via `TopicBuilder`: `trade-events` (3P), `recon-results` (2P), `system-alerts` (1P), `trade-events-dlq` (3P) |
| `TradeEventProducer.java` | `KafkaTemplate.send("trade-events", event.tradeRef(), event)` with `.whenComplete(...)` logging |
| `ReconciliationConsumer.java` | `@KafkaListener(topics="trade-events", groupId="recon-service")` → enqueue recon job |
| `AuditEventConsumer.java` | `@KafkaListener(topics="trade-events", groupId="audit-service")` → `auditRepo.save(new AuditLogEntry(...))` |
| `AlertConsumer.java` | `@KafkaListener(topics="system-alerts", groupId="alert-service")` → log WARN |
| `KafkaErrorHandlerConfig.java` | `DefaultErrorHandler` with `DeadLetterPublishingRecoverer` + `ExponentialBackOff(1000L, 2.0)` capped at 3 attempts |

### DLQ consumer + replay (ADV136)

| File | What it needs |
|---|---|
| `DlqConsumer.java` | `@KafkaListener(topics="trade-events-dlq", groupId="dlq-monitor")` → persist `DlqMessage` row |
| `DlqAdminController.java` | `GET /api/v1/admin/dlq` (list all) + `POST .../replay?eventId&dryRun` + `@PreAuthorize("hasRole('ADMIN')")` |

### Event sourcing (ADV137)

| File | What it needs |
|---|---|
| `TradeAggregator.java` | `Optional<JsonNode> rebuild(String tradeRef)` — fold `AuditLogEntry` events ordered by `occurredAt` ASC |

### Audit endpoint (ADV138)

| File | What it needs |
|---|---|
| `AuditController.java` | `GET /api/v1/audit/trades/{tradeRef}` and `.../events` returning `List<AuditLogEntry>` + `@PreAuthorize("hasAnyRole('ADMIN','RECON_ANALYST')")` |

### Metrics (ADV139) — `src/main/resources/application.yml`

Three YAML sections to add/merge:
- `spring.kafka.consumer.properties.metric.reporters: io.micrometer.core.instrument.binder.kafka.KafkaClientMetrics`
- `spring.kafka.consumer.properties.spring.json.trusted.packages: com.dbtraining.reconx.dto`
- `management.endpoints.web.exposure.include: health,info,metrics,prometheus,...`
- `management.metrics.binders.kafka.enabled: true`

### Grafana panels (ADV140–ADV142) — `monitoring/grafana/.../reconx-kafka.json`

Import the `reconx-kafka.json` dashboard into Grafana (Dashboards → Import → Upload JSON).
It contains four panels in a single "Kafka Health" row:
- **Consumer lag by topic** — `sum by (topic) (kafka_consumer_records_lag)` with yellow/red thresholds
- **Throughput: produced vs consumed** — two-series overlay of produce and consume rates
- **DLQ message count** — Stat panel: total records consumed from `trade-events-dlq`
- **DLQ depth over time** — time series of `rate(kafka_consumer_records_consumed_total{topic="trade-events-dlq"}[1m])`

### Integration tests (ADV143–ADV144)

| File | What it needs |
|---|---|
| `KafkaPipelineIT.java` | `@SpringBootTest @Testcontainers` + static `KafkaContainer` + `@DynamicPropertySource` + Awaitility assertion on `auditRepo.count()` delta |
| `DlqRoutingIT.java` | Same setup + `@MockBean ReconciliationEngine` throwing on every call + raw `KafkaConsumer` polling `trade-events-dlq` inside Awaitility |

---

## Run the project

You need Docker for this day — Kafka is not embeddable easily.

### Before you start

1. **Java 21**: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`
2. **Days 1–8 applied** (Day 9 depends on the recon engine, audit log, and JWT security from earlier days):
   ```bash
   for d in day1 day2 day3 day4 day5 day6 day7 day8; do
     cp -R ${d}-solved-files/backend/ backend/ 2>/dev/null || true
   done
   ```
3. **Docker Desktop / colima running**: `docker ps` should not error

### Terminal 1 — Kafka + Kafdrop

```bash
docker compose up -d kafka kafdrop
docker compose logs kafka | tail   # wait for "started (kafka.server.KafkaServer)"
```

Kafdrop UI: http://localhost:9000

### Terminal 2 — backend

```bash
cd backend
SPRING_PROFILES_ACTIVE=uat ./mvnw spring-boot:run
```

### Prove the pipeline

```bash
# 1. Log in
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@reconx.local","password":"password"}' | jq -r .token)

# 2. POST a trade — triggers TradeEventProducer
curl -X POST http://localhost:8080/api/v1/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"tradeRef":"EQU-20260603-0001","instrumentId":1,"counterpartyId":1,
       "assetClass":"EQUITY","side":"BUY","quantity":100,"price":100,"tradeDate":"2026-06-03"}'

# 3. Browse trade-events in Kafdrop
open http://localhost:9000

# 4. Check the audit log
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/audit/trades/EQU-20260603-0001/events | jq

# 5. Run integration tests
./mvnw -pl backend verify -Dtest=KafkaPipelineIT,DlqRoutingIT
```

### Import the Grafana dashboard

```bash
docker compose up -d prometheus grafana
# Grafana: http://localhost:3000 (admin / admin)
# Dashboards → Import → Upload JSON → select day9-solved-files/monitoring/grafana/provisioning/dashboards/reconx-kafka.json
```

---

## Troubleshooting

- **`Broker may not be available`** — Kafka container not up. `docker compose logs kafka | tail -20`
- **Consumer reads nothing** — check `spring.kafka.consumer.auto-offset-reset=earliest` in `application.yml`
- **`ClassCastException` on TradeEvent** — `spring.json.trusted.packages` missing. Check `application.yml`
- **DLQ topic doesn't exist** — `KafkaTopicsConfig` not picked up in your profile. Boot with `SPRING_PROFILES_ACTIVE=uat`
- **Grafana "No data"** — Prometheus scrape is empty; verify `curl http://localhost:8080/actuator/prometheus | grep kafka_consumer`
- **`KafkaPipelineIT` timeout** — `@DynamicPropertySource` not overriding `spring.kafka.bootstrap-servers`; confirm the static method signature
