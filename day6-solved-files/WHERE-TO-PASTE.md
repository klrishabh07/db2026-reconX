# Day 6 — Solved Files Guide
### Topic: Caching + Micrometer Metrics + Grafana (ADV081–ADV097)

> **Zero Java experience needed to copy these files in.**
> Read this top-to-bottom before you touch a single file.

---

## What Day 6 is about

Before Day 6 the app works but is invisible — you cannot tell how many
trades are created per second, how long reconciliation takes, or
whether the instrument lookup is hitting the database on every call.

Day 6 adds two things:
1. **Caffeine cache** — the hot `findBySymbol` path served from memory
2. **Micrometer metrics** — counters, timers, and gauges published to
   `/actuator/prometheus` and scraped by Prometheus → Grafana

```
BEFORE Day 6                    AFTER Day 6
─────────────────────────────   ──────────────────────────────────
Every GET /v1/trades hits DB    Instrument lookups served from RAM
No metrics exposed              /actuator/prometheus shows counters
Cannot see how many trades/s    Grafana dashboard shows live stats
```

---

## The observability pipeline

```
Spring Boot App
   │
   │  TradeService.create()
   │     └── tradeMetrics.incrementTradeCreated()   ← Counter
   │     └── tradeMetrics.recordTradeValue(price)   ← DistributionSummary
   │
   │  ReconEngine.reconcile()
   │     └── @Timed → reconciliation_duration_seconds  ← Timer histogram
   │
   │  Polled on every scrape:
   │     └── breakRepo.countByStatus("OPEN")        ← Gauge
   │
   ▼
GET /actuator/prometheus   ← Prometheus scrapes every 15 s
   │
   ▼
Prometheus (stores time-series)
   │
   ▼
Grafana (renders panels + alerts)
```

---

## How the Caffeine cache works

```
First call  ─────────────────────────────────────────────────────►
                                                                    
 Caller ──► InstrumentService.findBySymbol("SAP.DE")               
                │  cache MISS                                       
                ▼                                                   
            DB query → result stored in Caffeine cache             
                │                                                   
                └──────────────────────────────────────► return    
                                                                    
                                                                    
Second call (same symbol, within 5 min TTL) ───────────────────────
                                                                    
 Caller ──► InstrumentService.findBySymbol("SAP.DE")               
                │  cache HIT (no DB query!)                        
                └──────────────────────────────────────► return    
                                                                    
Cache config: max 500 entries, TTL 5 minutes (see application.yml)
```

---

## Micrometer metric types

```
┌─────────────────────────────────────────────────────────┐
│  Counter  (only goes up)                                │
│  trade_created_total                                    │
│  → "how many trades created since boot?"               │
│                                                         │
│  DistributionSummary  (records values + histogram)      │
│  trade_value_total                                      │
│  → "what is the P95 notional size of trades?"          │
│                                                         │
│  Timer / @Timed  (measures duration)                    │
│  reconciliation_duration_seconds                        │
│  → "how long does a recon run take?"                   │
│                                                         │
│  Gauge  (polled — reads live state)                     │
│  recon_break_count                                      │
│  → "how many open breaks right now?"                   │
└─────────────────────────────────────────────────────────┘
```

---

## What this folder ships

| File | Ticket | What it does |
|------|--------|--------------|
| `observability/TradeMetrics.java`  | ADV083, ADV086 | Counter + DistributionSummary + Gauge wired to MeterRegistry |
| `service/InstrumentService.java`   | ADV081         | `findBySymbol` body: DB query with `@Cacheable("instruments")` |

Everything else (Actuator config, Caffeine dependency, logback JSON,
Prometheus scrape config, alert rules) is already in the starter.

---

## Before you copy — what you should observe

Open `TradeMetrics.java` in your editor. You will see:

```java
public void incrementTradeCreated() {
    // TODO(TICKET-ADV083): call tradeCreated.increment();
}

public void recordTradeValue(double value) {
    // TODO(TICKET-ADV086): call tradeValue.record(value);
}
```

And in `InstrumentService.java`:

```java
@Cacheable("instruments")
public Instrument findBySymbol(String symbol) {
    // TODO(TICKET-ADV081): query the repo and throw if not found.
    throw new UnsupportedOperationException("TICKET-ADV081");
}
```

Run the app and check the metrics endpoint:

```bash
curl -s http://localhost:8081/api/actuator/prometheus | grep trade_created
```

You get **nothing** — the counter exists but never increments because
the method body is empty. That is what this folder fixes.

---

## Copy the solved files

### Mac / Linux

```bash
# From the project root
cp -R day6-solved-files/backend/ backend/
```

### Windows (Command Prompt)

```cmd
xcopy /E /Y day6-solved-files\backend\ backend\
```

### Windows (PowerShell)

```powershell
Copy-Item -Recurse -Force day6-solved-files\backend\* backend\
```

---

## Run the project

### Mac / Linux

```bash
cd backend
./mvnw clean compile
./mvnw spring-boot:run
```

### Windows (Command Prompt)

```cmd
cd backend
mvnw.cmd clean compile
mvnw.cmd spring-boot:run
```

### Windows (PowerShell)

```powershell
cd backend
.\mvnw.cmd clean compile
.\mvnw.cmd spring-boot:run
```

Wait until you see:

```
Started ReconxApplication in X.XXX seconds
```

---

## What to observe AFTER copying

### Test 1 — Custom metrics appear in Prometheus output

```bash
curl -s http://localhost:8081/api/actuator/prometheus \
  | grep -E "trade_created|trade_value|recon_break"
```

Expected output (values will be 0 before any trades are created):

```
# HELP trade_created_total Total number of trades created
# TYPE trade_created_total counter
trade_created_total_total{...} 0.0

# HELP recon_break_count Open reconciliation breaks
# TYPE recon_break_count gauge
recon_break_count{...} 0.0
```

### Test 2 — Create a trade and watch the counter increment

```bash
# First get a JWT (Day 5 must be applied)
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@db.com","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Create a trade
curl -s -X POST http://localhost:8081/api/v1/trades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tradeRef":"EQU-20260101-0001",
    "instrumentId":1,
    "counterpartyId":1,
    "assetClass":"EQUITY",
    "side":"BUY",
    "quantity":1000,
    "price":125.50,
    "tradeDate":"2026-01-01"
  }'

# Check the counter again
curl -s http://localhost:8081/api/actuator/prometheus | grep trade_created_total_total
```

Expected: `trade_created_total_total{...} 1.0` — it incremented!

### Windows PowerShell equivalent

```powershell
# Get token
$resp = Invoke-RestMethod -Method Post `
        -Uri "http://localhost:8081/api/auth/login" `
        -ContentType "application/json" `
        -Body '{"email":"admin@db.com","password":"admin123"}'
$TOKEN = $resp.token

# Check metrics
Invoke-RestMethod -Uri "http://localhost:8081/api/actuator/prometheus" `
                  -Headers @{ Authorization = "Bearer $TOKEN" }
```

### Test 3 — Cache stats

```bash
curl -s http://localhost:8081/api/actuator/caches/instruments
```

After a few requests for the same symbol, the `hits` count rises while
`misses` stays at 1 — confirming the DB is not being hit repeatedly.

### Test 4 — Open Grafana (if Docker is running)

```bash
docker compose up -d prometheus grafana
```

Open http://localhost:3000 (admin / admin) → Import a new dashboard →
paste the PromQL queries from `DAY6-GRAFANA-PANELS.md` on your Desktop.

---

## Ticket checklist

| # | Ticket | Before | After |
|---|--------|--------|-------|
| ADV081 | `@Cacheable` on `findBySymbol` | Throws `UnsupportedOperationException` | DB hit on first call, cache on all others |
| ADV082 | Caffeine TTL config | Already in `application.yml` | max=500, TTL=5 min |
| ADV083 | `trade_created_total` Counter | Method body is empty | Increments on every `TradeService.create()` |
| ADV084 | `@Timed` on `reconcile()` | Already in Day-3 file | Histogram visible in Prometheus |
| ADV085 | `recon_break_count` Gauge | Already wired in constructor | Polls DB every Prometheus scrape |
| ADV086 | `trade_value_total` DistributionSummary | Method body is empty | Records notional on every trade created |
| ADV087–097 | Grafana panels + alert rules | No panels | PromQL queries in `DAY6-GRAFANA-PANELS.md` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `/actuator/prometheus` returns 404 | Actuator not exposed. Add `prometheus` to `management.endpoints.web.exposure.include` in `application.yml` |
| `trade_created_total` stays at 0 | Check that `TradeService.create()` calls `tradeMetrics.incrementTradeCreated()`. Open `TradeService.java` and look |
| Cache never hits (`misses` always grows) | Self-invocation: you are calling `findBySymbol` from another method inside the same class. Spring AOP can't intercept that — call it from a different bean |
| `No qualifying bean MeterRegistry` | `spring-boot-starter-actuator` is missing from `pom.xml` (it is already there by default) |
| Grafana shows "No data" | Walk the chain: (1) does `/actuator/prometheus` list the metric? (2) does Prometheus show it? (3) is the scrape target UP? |
| Port 8081 in use (Mac/Linux) | `lsof -i :8081` then `kill <PID>` |
| Port 8081 in use (Windows) | `netstat -ano \| findstr :8081` then `taskkill /PID <PID> /F` |
