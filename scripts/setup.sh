#!/bin/bash

set -e

echo "🚛 ============================================"
echo "🚛  Truck API - Automated Setup"
echo "🚛 ============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Environment file
echo -e "${BLUE}📝 Step 1/5: Setting up environment variables...${NC}"
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✅ .env file created${NC}"
else
  echo -e "${YELLOW}⚠️  .env file already exists, skipping${NC}"
fi
echo ""

# Step 2: Start infrastructure
echo -e "${BLUE}🐳 Step 2/5: Starting Docker infrastructure...${NC}"
echo "   Starting: PostgreSQL, Redis, MongoDB, Pub/Sub Emulator..."
docker compose up -d postgres redis mongodb pubsub-emulator pubsub-init
echo ""

# Step 3: Wait for services
echo -e "${BLUE}⏳ Step 3/5: Waiting for services to be healthy...${NC}"
echo "   This may take 20-30 seconds..."
sleep 15

# Check if services are healthy
echo "   Checking service health..."
for i in {1..10}; do
  if docker compose ps | grep -q "healthy"; then
    echo -e "${GREEN}✅ Infrastructure services are healthy${NC}"
    break
  fi
  if [ $i -eq 10 ]; then
    echo -e "${YELLOW}⚠️  Services taking longer than expected. Continuing anyway...${NC}"
  fi
  sleep 2
done
echo ""

# Step 4: Build and start microservices
echo -e "${BLUE}🚀 Step 4/5: Building and starting microservices...${NC}"
echo "   Building truck-api and truck-worker..."
docker compose up -d --build truck-api truck-worker
echo ""

# Step 5: Wait for API to be ready
echo -e "${BLUE}⏳ Step 5/5: Waiting for API to be ready...${NC}"
echo "   API is running migrations and seeding database..."
sleep 20

# Check API health
for i in {1..15}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is healthy and ready!${NC}"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "${YELLOW}⚠️  API health check timeout. Check logs with: docker compose logs truck-api${NC}"
  fi
  sleep 2
done
echo ""

# Final status
echo -e "${GREEN}🎉 ============================================${NC}"
echo -e "${GREEN}🎉  Setup Complete!${NC}"
echo -e "${GREEN}🎉 ============================================${NC}"
echo ""
echo "📍 Services running:"
echo "   • API:        http://localhost:3000"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis:      localhost:6379"
echo "   • MongoDB:    localhost:27017"
echo "   • Pub/Sub:    localhost:8085"
echo ""
echo "🧪 Test the API:"
echo "   ./scripts/test_endpoints.sh"
echo ""
echo "📊 View logs:"
echo "   docker compose logs -f truck-api"
echo "   docker compose logs -f truck-worker"
echo ""
echo "🛑 Stop services:"
echo "   docker compose down"
echo ""
echo "📝 Demo credentials:"
echo "   Email:    demo@truck.com"
echo "   Password: demo123"
echo ""
