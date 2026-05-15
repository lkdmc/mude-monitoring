# MUDE Platform Monitor

Uptime monitoring dashboard for TU Delft MUDE course infrastructure. Checks HTTP endpoints every 5 minutes, tracks uptime history, sends email alerts on DOWN/UP transitions, and exposes a public read-only status page.

---

## Features

| Feature | Details |
|---------|---------|
| **Uptime checks** | HTTP GET every 5 minutes, stores result in SQLite |
| **Dashboard** | Private admin view — status cards, 24h/7d uptime %, history chart |
| **Public status page** | Read-only page at `/status`, no auth required |
| **Email alerts** | AWS SNS → email on DOWN and UP recovery |
| **Teams alerts** | Microsoft Teams Incoming Webhook (activate by setting `TEAMS_WEBHOOK_URL`) |
| **Incident history** | Tracks every outage start/end/duration |
| **Target management** | Add/delete monitored URLs via UI (API key required) |
| **Security** | API key auth, CORS origin restriction, rate limiting |

---

## Architecture

```
Browser
  │
  ├── GET /           → React dashboard (admin, requires API key for writes)
  └── GET /status     → React public status page (read-only)
         │
         │  nginx (port 3000)
         │    ├── /api/*  → proxy → Express backend (port 3001)
         │    └── /*      → serve index.html (SPA routing)
         │
         └── Express API (port 3001)
               ├── SQLite database  (/app/data/monitoring.db, persisted via Docker volume)
               ├── Cron checker     (runs every 5 minutes)
               ├── AWS SNS          (email alerts)
               └── Teams webhook    (optional)

Deployment: AWS EC2 (eu-west-1)
CI/CD:      GitHub Actions → SSH → docker compose up
```

---

## Project Structure

```
mude-monitoring/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server entry point
│   │   ├── routes.ts         # API route handlers
│   │   ├── db.ts             # SQLite operations (sql.js)
│   │   ├── checker.ts        # HTTP check loop + alert logic
│   │   ├── middleware.ts     # API key auth + rate limiters
│   │   └── subscriptions.ts  # AWS SNS subscription sync
│   ├── targets.json          # Seed targets (INSERT OR IGNORE on startup)
│   ├── alerts.json           # Email addresses for SNS alerts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx          # Entry point — routes to App or StatusPage
│   │   ├── App.tsx           # Admin dashboard
│   │   ├── StatusPage.tsx    # Public status page (/status)
│   │   ├── api.ts            # API client + auth helpers
│   │   └── components/
│   │       ├── StatusCard.tsx
│   │       └── UptimeChart.tsx
│   ├── nginx.conf            # nginx config (SPA routing + API proxy)
│   └── Dockerfile
├── terraform/                # AWS infrastructure (EC2, IAM, Security Group)
├── docker-compose.yml
└── .github/workflows/deploy.yml
```

---

## Prerequisites

- Docker & Docker Compose
- Node.js 22 (local development only)
- AWS account with SNS topic (for email alerts)
- EC2 instance with IAM instance profile that has `sns:Publish` and `sns:Subscribe`

---

## Local Development

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd mude-monitoring

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Create a `.env` file

```bash
cp .env.example .env   # or create manually — see Environment Variables below
```

### 3. Run with Docker Compose

```bash
docker compose up --build
```

- Dashboard: http://localhost:3000
- Public status: http://localhost:3000/status
- Backend API: http://localhost:3001/api

### 4. Run backend/frontend separately (hot reload)

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

---

## Deployment (AWS EC2)

### Infrastructure (Terraform)

```bash
cd terraform

# Edit terraform.tfvars to set your key pair name and allowed SSH CIDR
terraform init
terraform plan
terraform apply
```

This creates:
- EC2 `t3.micro` in eu-west-1
- IAM instance profile with SNS permissions (no access keys needed)
- Security Group opening ports 22, 3000, 3001

### First-time server setup

```bash
ssh ubuntu@<EC2_HOST>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Clone repo
git clone <repo-url> ~/mude-monitoring
cd ~/mude-monitoring

# Create .env (see Environment Variables below)
nano .env

# Start
docker compose up -d --build
```

### CI/CD (GitHub Actions)

Every push to `main` automatically deploys via SSH.

Required GitHub repository secrets:

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | Public IP or hostname of your EC2 instance |
| `EC2_SSH_KEY` | Private SSH key for the `ubuntu` user |

The deploy workflow:
1. SSH into EC2
2. `git pull origin main`
3. `docker compose down && docker compose build --no-cache && docker compose up -d`

---

## Environment Variables

Create `/home/ubuntu/mude-monitoring/.env` on the server:

```env
# AWS SNS — email alerts
SNS_TOPIC_ARN=arn:aws:sns:eu-west-1:123456789012:mude-monitoring-alerts

# Public hostname (used in alert email links)
EC2_HOST=http://63.35.197.214:3000

# API key — required to add/delete targets via the dashboard
# Generate with: openssl rand -hex 32
API_KEY=your-strong-random-key-here

# CORS — comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=http://63.35.197.214:3000

# Microsoft Teams webhook (optional — omit to disable Teams alerts)
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```

> **Security note:** Never commit `.env` to git. The file is in `.gitignore`.

---

## Configuration Files

### `backend/targets.json` — Seed targets

Defines the initial set of monitored URLs. Loaded on startup with `INSERT OR IGNORE` — existing targets in the database are never deleted.

```json
[
  { "name": "MUDE Course Website",       "url": "https://mude.citg.tudelft.nl" },
  { "name": "Content Archival System",   "url": "https://mude.citg.tudelft.nl/archive" },
  { "name": "Jupyter Publishing Pipeline","url": "https://mude.citg.tudelft.nl/book" },
  { "name": "diData - Test Webpage",     "url": "https://edu01.citg.tudelft.nl" }
]
```

Adding a URL here and redeploying will add it. Targets added through the UI are stored in the database and persist across restarts.

### `backend/alerts.json` — Alert recipients

Email addresses subscribed to the SNS topic for DOWN/UP alerts.

```json
["your@email.com", "colleague@tudelft.nl"]
```

Changes here require a redeploy. SNS subscriptions are synced automatically on startup.

---

## API Reference

Base URL: `http://<host>:3000/api` (proxied through nginx) or `http://<host>:3001/api` (direct)

### Public endpoints (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Latest check result for all targets |
| `GET` | `/api/history/:id` | Last 100 check results for a target |
| `GET` | `/api/uptime/:id` | 24h and 7d uptime percentage for a target |
| `GET` | `/api/incidents` | All recorded incidents (most recent first) |
| `GET` | `/health` | Health check — returns `{ status: "ok" }` |

### Protected endpoints (require `X-Api-Key` header)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/targets` | Add a new monitoring target |
| `DELETE` | `/api/targets/:id` | Remove a monitoring target |

**POST `/api/targets` body:**
```json
{ "name": "My Service", "url": "https://example.com" }
```

**Rate limits:**
- Global: 200 requests per 15 minutes
- Write endpoints: 30 requests per 15 minutes

---

## Dashboard Usage

### Setting the API key

The dashboard is publicly viewable. To add or delete targets, set your API key:

1. Click the **🔓 Set API key** button (top right)
2. Enter your `API_KEY` value from `.env`
3. Click **Save** — the key is stored in `localStorage`

The button turns green (🔒 **Key set**) when a key is configured. The key is never sent to any endpoint other than the backend API.

### Adding a target

Fill in the **Name** and **URL** fields in the "Add Monitoring Target" form and click **Add**. The target is immediately checked (no waiting for the next cron cycle).

### Deleting a target

Click the **✕** button on any status card. A confirmation dialog appears before deletion.

---

## Public Status Page

Accessible at `http://<host>:3000/status` — no login required.

- Shows overall system health banner (green / red / amber)
- Lists each service with UP/DOWN status and 24h/7d uptime
- Auto-refreshes every 60 seconds
- Suitable for sharing with students or stakeholders

---

## Alert Behaviour

| Transition | Action |
|-----------|--------|
| UP → DOWN | Email via SNS + Teams (if configured) |
| DOWN → UP | Recovery email via SNS + Teams (if configured) |
| Stays UP | No alert |
| Stays DOWN | No repeat alert (only on transition) |

---

## Data Persistence

SQLite database is stored at `/app/data/monitoring.db` inside the backend container, mounted via a named Docker volume (`db_data`). Data survives container restarts and redeployments.

To back up the database:
```bash
docker cp $(docker compose ps -q backend):/app/data/monitoring.db ./backup.db
```
