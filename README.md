# 🚛 Truck Driver & Load Management API

A microservices-based system for managing truck drivers and cargo loads with real-time event processing.

## 🏗️ Architecture

- **truck-api**: REST API (NestJS + PostgreSQL + Redis + Pub/Sub Publisher)
- **truck-worker**: Async Event Processor (NestJS + MongoDB + Pub/Sub Consumer)

## 🚀 Quick Start

```bash
# 1. Setup everything (one command!)
./scripts/setup.sh

# 2. Test the API
./scripts/test_endpoints.sh
```

That's it! The system will be running at `http://localhost:3000`

## 📋 Prerequisites

- Docker & Docker Compose
- Bash shell (for setup scripts)

**No Node.js installation required!** Everything runs in Docker.

## 🛠️ Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 22 LTS |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.6 |
| Database (SQL) | PostgreSQL | 16 |
| ORM | TypeORM | 0.3.x |
| Cache | Redis | 7.4 |
| Database (NoSQL) | MongoDB | 8.0 |
| Pub/Sub | Google Cloud Emulator | Latest |
| Auth | JWT | - |

## 📊 Services

| Service | Port | Description |
|---------|------|-------------|
| truck-api | 3000 | REST API |
| PostgreSQL | 5432 | Relational database |
| Redis | 6379 | Cache layer |
| MongoDB | 27017 | Audit events |
| Pub/Sub Emulator | 8085 | Event messaging |

## 🔑 API Endpoints

### Authentication
- `POST /auth/login` - Get JWT token

### Users
- `POST /users` - Create user

### Drivers
- `POST /drivers` - Create driver

### Loads
- `POST /loads` - Create load
- `GET /loads` - List loads (cached 60s)

### Assignments
- `POST /assignments` - Assign load to driver
- `GET /assignments/:id` - Get assignment details
- `PATCH /assignments/:id/status` - Update status (COMPLETED/CANCELLED)

## 💾 Data Storage

### PostgreSQL (Source of Truth)
- Users, Drivers, Loads, Assignments
- Enforces business rules and relationships

### Redis (Performance Cache)
- Caches `GET /loads` for 60 seconds
- Auto-invalidated on create/update

### MongoDB (Audit Trail)
- Immutable event log
- Assignment lifecycle events

## 🎯 Key Features

### ✅ One Active Load Per Driver
The system enforces that a driver can only have one active load at a time:
- Validated at service layer
- Indexed at database layer
- Returns 400 error if violated

### ⚡ Smart Caching
- `GET /loads` cached for 60s in Redis
- Cache invalidated on any load/assignment changes
- Reduces database load significantly

### 📡 Event-Driven Architecture
- API publishes events to Pub/Sub
- Worker consumes events asynchronously
- Audit trail recorded in MongoDB

### 🔒 JWT Authentication
- All endpoints protected (except `/auth/login` and `/health`)
- Token-based authentication
- 24h token expiration

## 🧪 Testing

### Run Unit Tests
```bash
# API tests
cd truck-api
npm test

# Worker tests
cd truck-worker
npm test
```

### Run E2E Tests
```bash
./scripts/test_endpoints.sh
```

The E2E script tests:
1. ✅ Login and JWT authentication
2. ✅ Creating users, drivers, and loads
3. ✅ Cache behavior (hit/miss)
4. ✅ Assignment creation
5. ✅ One-active-load-per-driver rule
6. ✅ Assignment completion workflow

## 🐳 Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f truck-api
docker compose logs -f truck-worker

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Rebuild services
docker compose up -d --build
```

## 🔍 Debugging

### Check Service Health
```bash
docker compose ps
```

All services should show "healthy" status.

### Inspect Database
```bash
# PostgreSQL
docker exec -it truck-postgres psql -U truck -d truckdb

# MongoDB
docker exec -it truck-mongodb mongosh
use truck-audit
db.audit_events.find().pretty()

# Redis
docker exec -it truck-redis redis-cli
GET "loads:all"
TTL "loads:all"
```

### View Pub/Sub Events
```bash
# Worker logs show consumed events
docker compose logs -f truck-worker
```

## 📁 Project Structure

```
truck-nestjs/
├── truck-api/              # REST API microservice
│   ├── src/
│   │   ├── auth/          # JWT authentication
│   │   ├── users/         # User management
│   │   ├── drivers/       # Driver management
│   │   ├── loads/         # Load management + cache
│   │   ├── assignments/   # Assignment logic
│   │   ├── cache/         # Redis service
│   │   └── pubsub/        # Pub/Sub publisher
│   ├── test/              # E2E tests
│   └── Dockerfile
│
├── truck-worker/           # Event processor microservice
│   ├── src/
│   │   ├── pubsub/        # Pub/Sub consumer
│   │   └── database/      # MongoDB service
│   └── Dockerfile
│
├── scripts/
│   ├── setup.sh           # Automated setup
│   └── test_endpoints.sh  # E2E tests
│
├── docker compose.yml     # Orchestration
└── README.md
```

## 🔧 Manual Setup (Alternative)

If you prefer manual steps instead of `./scripts/setup.sh`:

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start infrastructure
docker compose up -d postgres redis mongodb pubsub-emulator pubsub-init

# 3. Wait for services (check with docker compose ps)

# 4. Start microservices
docker compose up -d truck-api truck-worker

# 5. Check health
docker compose ps
```

## 🌟 Demo Credentials

After running setup, use these credentials to login:

- **Email**: `demo@truck.com`
- **Password**: `demo123`

## 📝 Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_HOST` - Redis host
- `MONGODB_URL` - MongoDB connection
- `PUBSUB_EMULATOR_HOST` - Pub/Sub emulator
- `JWT_SECRET` - JWT signing key (change in production!)
- `JWT_EXPIRATION` - Token lifetime

## 🚨 Troubleshooting

### Services won't start
```bash
# Check logs
docker compose logs

# Ensure ports are available
lsof -i :3000 -i :5432 -i :6379 -i :27017 -i :8085
```

### Migrations fail
```bash
# Reset database
docker compose down -v
docker compose up -d postgres
# Wait 10 seconds
docker compose up -d truck-api
```

### Worker not receiving events
```bash
# Check Pub/Sub emulator
docker compose logs pubsub-emulator
docker compose logs pubsub-init

# Restart worker
docker compose restart truck-worker
```
