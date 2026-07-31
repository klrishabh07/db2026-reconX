# Day 5 — Solved Files Guide
### Topic: JWT Security + REST Controllers (ADV063–ADV080)

> **Zero Java experience needed to copy these files in.**
> Read this top-to-bottom before you touch a single file.

---

## What Day 5 is about

Before Day 5 the API accepts every request — no login, no tokens, no
role checks. By end of day every protected endpoint requires a signed
JSON Web Token and Spring Security enforces who can do what.

```
BEFORE Day 5                    AFTER Day 5
─────────────────────────────   ─────────────────────────────
GET /v1/trades  →  200 OK       GET /v1/trades  →  403 Forbidden
POST /v1/trades →  200 OK       POST /v1/trades →  401 Unauthorized
DELETE /trade/1 →  200 OK       DELETE /trade/1 →  403 (need ADMIN)

No login needed                 Must POST /auth/login first
```

---

## How a JWT request flows through the app

```
Browser / curl
      │
      │  Authorization: Bearer eyJhbG...
      ▼
┌─────────────────────────────────────────────┐
│  JwtAuthenticationFilter  (runs every req)  │
│  1. Extract token from header               │
│  2. Verify signature + expiry               │
│  3. Set SecurityContextHolder               │
└─────────────┬───────────────────────────────┘
              │  valid token → user + role loaded
              ▼
┌─────────────────────────────────────────────┐
│  SecurityConfig  (checks role matchers)     │
│  GET /v1/trades?  → needs VIEWER+           │
│  POST /v1/trades? → needs TRADER+           │
│  DELETE /v1/**?   → needs ADMIN only        │
└─────────────┬───────────────────────────────┘
              │  allowed
              ▼
┌─────────────────────────────────────────────┐
│  Controller → Service → Repository          │
│  Returns 200 with JSON response             │
└─────────────────────────────────────────────┘
```

---

## Role-based access control at a glance

```
Endpoint                     VIEWER  TRADER  RECON_ANALYST  ADMIN
────────────────────────     ──────  ──────  ─────────────  ─────
GET  /auth/login              open    open       open        open
GET  /v1/trades/**             ✓       ✓          ✓           ✓
POST /v1/trades                        ✓                      ✓
PUT/PATCH /v1/trades/**                ✓                      ✓
DELETE /v1/trades/**                                          ✓
/v1/recon/**                                    ✓             ✓
/v1/audit/**                                    ✓             ✓
/actuator/health              open    open       open        open
/swagger-ui/**                open    open       open        open
```

---

## What this folder ships

| File | Ticket | What it does |
|------|--------|--------------|
| `security/JwtTokenProvider.java`      | ADV072 | Signs + verifies HS256 JWTs |
| `security/JwtAuthenticationFilter.java` | ADV073 | Reads `Authorization: Bearer …` on every request |
| `security/SecurityConfig.java`        | ADV074 | Stateless filter chain + RBAC role matchers |
| `controller/AuthController.java`      | ADV072 | POST /auth/login — returns JWT on valid credentials |
| `controller/TradeController.java`     | ADV063–067 | Full CRUD for trades |
| `controller/ReconController.java`     | ADV068–070 | Recon run + resolve break |
| `controller/AuditController.java`     | ADV071 | Audit history by tradeRef |

---

## Before you copy — what you should observe

Open `backend/src/main/java/com/dbtraining/reconx/security/` in your
editor. You will see method bodies like:

```java
public String generate(String email, String role) {
    // TODO(TICKET-ADV072): generate a signed HS256 JWT here.
    throw new UnsupportedOperationException("TICKET-ADV072");
}
```

Run the app right now and try:

```
curl http://localhost:8081/api/v1/trades
```

You get **200 OK with an empty list** — the endpoint is completely
unprotected. That is the problem Day 5 fixes.

---

## Copy the solved files

### Mac / Linux

```bash
# From the project root
cp -R day5-solved-files/backend/ backend/
```

### Windows (Command Prompt)

```cmd
xcopy /E /Y day5-solved-files\backend\ backend\
```

### Windows (PowerShell)

```powershell
Copy-Item -Recurse -Force day5-solved-files\backend\* backend\
```

---

## Run the project

### Mac / Linux

```bash
# 1. Make sure Java 21 is active
java -version       # should say openjdk 21

# If not:
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# 2. Build and run from the backend folder
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

> **MapStruct error on Windows?** Run `.\mvnw.cmd clean` first, then try again.
> IntelliJ sometimes compiles MapStruct before Maven does, causing a conflict.

Wait until you see:

```
Started ReconxApplication in X.XXX seconds
```

---

## What to observe AFTER copying

### Test 1 — Health check still works (no token needed)

```bash
curl http://localhost:8081/api/actuator/health
```

Expected: `{"status":"UP"}`

### Test 2 — Protected endpoint now rejects anonymous requests

```bash
curl -i http://localhost:8081/api/v1/trades
```

Expected: `HTTP/1.1 403 Forbidden`

This is the proof that JWT security is now enforced.

### Test 3 — Get a token and use it

```bash
# Step 1: login (replace password with the seeded user's password)
curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@db.com","password":"admin123"}'
```

You get back:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "expiresIn": 3600,
  "role": "ADMIN"
}
```

```bash
# Step 2: use the token
TOKEN="eyJhbGciOiJIUzI1NiJ9..."

curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8081/api/v1/trades
```

Expected: `200 OK` with a JSON list of trades.

### Windows PowerShell equivalent

```powershell
# Step 1: login
$body = '{"email":"admin@db.com","password":"admin123"}'
$resp = Invoke-RestMethod -Method Post `
        -Uri "http://localhost:8081/api/auth/login" `
        -ContentType "application/json" `
        -Body $body
$TOKEN = $resp.token

# Step 2: use the token
Invoke-RestMethod -Uri "http://localhost:8081/api/v1/trades" `
                  -Headers @{ Authorization = "Bearer $TOKEN" }
```

---

## Try it in Swagger UI (easier than curl)

Open your browser: **http://localhost:8081/api/swagger-ui.html**

1. Click `POST /auth/login` → `Try it out` → enter your credentials → `Execute`.
2. Copy the `token` value from the response.
3. Click the green **Authorize** button at the top right.
4. Paste `Bearer <your-token>` and click **Authorize**.
5. Now every endpoint you try is automatically authenticated.

---

## Ticket checklist

| # | Ticket | Before | After |
|---|--------|--------|-------|
| ADV063 | Controller skeletons | Methods throw `UnsupportedOperationException` | Methods delegate to service layer |
| ADV068 | POST /recon/run | Returns stub `jobId` | Returns 202 with real UUID jobId |
| ADV070 | PUT /recon/results/{id}/resolve | Not implemented | Loads break, calls `rb.resolve(note)`, saves |
| ADV071 | GET /audit/trades/{ref} | Returns `[]` | Returns ordered audit log from DB |
| ADV072 | JwtTokenProvider | Throws on every call | Signs + verifies real HS256 tokens |
| ADV072 | POST /auth/login | Not wired | Returns JWT on valid email+password |
| ADV073 | JwtAuthenticationFilter | Not in chain | Parses token on every request |
| ADV074 | SecurityConfig | Permits everything | Role-based matchers enforced |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `WeakKeyException` at startup | JWT secret is shorter than 32 chars. The default `application.yml` secret is fine — don't override `JWT_SECRET` with something short |
| `/auth/login` returns 403 | `JwtAuthenticationFilter` or `SecurityConfig` didn't copy over. Re-run the copy command |
| `Cannot resolve @EnableMethodSecurity` | You are on Spring Boot 2.x. This project requires Spring Boot 3.x (already set in `pom.xml`) |
| Port 8081 in use (Mac/Linux) | `lsof -i :8081` then `kill <PID>` |
| Port 8081 in use (Windows) | `netstat -ano \| findstr :8081` then `taskkill /PID <PID> /F` |
| Token always returns 401 | Token may have expired (default 60 min). Login again to get a fresh one |
| `Invalid credentials` even with correct password | Seeds use BCrypt hashes. Confirm you are using the exact password from `008-seed.xml` |
