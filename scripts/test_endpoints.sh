#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="http://localhost:3000"
TOKEN=""

echo "🧪 ============================================"
echo "🧪  Truck API - Endpoint Tests"
echo "🧪 ============================================"
echo ""

# Helper function to make requests
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  
  echo -e "${BLUE}Testing: ${description}${NC}"
  
  if [ -z "$data" ]; then
    response=$(curl -s -X $method "${API_URL}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -X $method "${API_URL}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  echo ""
}

# Helper function to make requests and return JSON only
make_request_json() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -z "$data" ]; then
    curl -s -X $method "${API_URL}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json"
  else
    curl -s -X $method "${API_URL}${endpoint}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

# Test 1: Login
echo -e "${YELLOW}📝 Test 1: Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@truck.com","password":"demo123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')



if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✅ Login successful${NC}"
  echo "Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Test 2: Create User
echo -e "${YELLOW}📝 Test 2: Create User${NC}"
RANDOM_EMAIL="testuser$(date +%s)@example.com"
make_request POST "/users" \
  "{\"name\":\"Test User Random\",\"email\":\"${RANDOM_EMAIL}\",\"password\":\"test123\"}" \
  "Creating new user"

# Test 3: Create Drivers
echo -e "${YELLOW}📝 Test 3: Create Drivers${NC}"
RANDOM_LICENSE="LIC$(date +%s)"
DRIVER1_RESPONSE=$(curl -s -X POST "${API_URL}/drivers" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Driver Random\",\"licenseNumber\":\"${RANDOM_LICENSE}\"}")
echo "Raw response: $DRIVER1_RESPONSE"
DRIVER1=$(echo "$DRIVER1_RESPONSE" | jq '.')
echo "$DRIVER1"
DRIVER1_ID=$(echo $DRIVER1 | jq -r '.id // "null"')

RANDOM_LICENSE2="LIC$(date +%s)B"
DRIVER2=$(make_request POST "/drivers" \
  "{\"name\":\"Driver Random 2\",\"licenseNumber\":\"${RANDOM_LICENSE2}\"}" \
  "Creating driver 2")

# Test 4: Create Loads
echo -e "${YELLOW}📝 Test 4: Create Loads${NC}"
make_request POST "/loads" \
  '{"origin":"Recife, PE","destination":"Salvador, BA","cargoType":"Test Electronics"}' \
  "Creating load 1"
LOAD1=$(make_request_json POST "/loads" \
  '{"origin":"Recife, PE","destination":"Salvador, BA","cargoType":"Test Electronics"}')
LOAD1_ID=$(echo $LOAD1 | jq -r '.id // "null"')

make_request POST "/loads" \
  '{"origin":"Fortaleza, CE","destination":"Natal, RN","cargoType":"Test Furniture"}' \
  "Creating load 2"
LOAD2=$(make_request_json POST "/loads" \
  '{"origin":"Fortaleza, CE","destination":"Natal, RN","cargoType":"Test Furniture"}')
LOAD2_ID=$(echo $LOAD2 | jq -r '.id // "null"')

make_request POST "/loads" \
  '{"origin":"Manaus, AM","destination":"Belém, PA","cargoType":"Test Food"}' \
  "Creating load 3"

# Test 5: List Loads (Cache Miss)
echo -e "${YELLOW}📝 Test 5: List Loads - First Request (Cache Miss)${NC}"
echo "This should query the database..."
make_request GET "/loads" "" "Getting all loads (cache miss)"

# Test 6: List Loads (Cache Hit)
echo -e "${YELLOW}📝 Test 6: List Loads - Second Request (Cache Hit)${NC}"
echo "This should return from Redis cache..."
make_request GET "/loads" "" "Getting all loads (cache hit)"

# Test 7: Create Assignment
echo -e "${YELLOW}📝 Test 7: Create Assignment${NC}"
ASSIGNMENT1=$(make_request_json POST "/assignments" \
  "{\"driverId\":\"${DRIVER1_ID}\",\"loadId\":\"${LOAD1_ID}\"}")
echo "$ASSIGNMENT1" | jq '.' 2>/dev/null || echo "$ASSIGNMENT1"
ASSIGNMENT1_ID=$(echo $ASSIGNMENT1 | jq -r '.id // "null"')
echo "Assignment 1 ID: $ASSIGNMENT1_ID"
echo ""

# Test 8: Get Assignment Details
echo -e "${YELLOW}📝 Test 8: Get Assignment Details${NC}"
if [ "$ASSIGNMENT1_ID" != "null" ] && [ -n "$ASSIGNMENT1_ID" ]; then
  make_request GET "/assignments/${ASSIGNMENT1_ID}" "" "Getting assignment details"
else
  echo -e "${RED}❌ Assignment ID is null or empty, skipping test${NC}"
  echo ""
fi

# Test 9: Try to assign another load to same driver (Should Fail)
echo -e "${YELLOW}📝 Test 9: Assign Second Load to Same Driver (Should Fail)${NC}"
echo "This should return 400 error..."
FAIL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${API_URL}/assignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"driverId\":\"${DRIVER1_ID}\",\"loadId\":\"${LOAD2_ID}\"}")

HTTP_STATUS=$(echo "$FAIL_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$FAIL_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ]; then
  echo -e "${GREEN}✅ Correctly rejected (400 Bad Request)${NC}"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
  echo -e "${RED}❌ Expected 400, got ${HTTP_STATUS}${NC}"
  echo "$RESPONSE_BODY"
fi
echo ""

# Test 10: Complete Assignment
echo -e "${YELLOW}📝 Test 10: Complete Assignment${NC}"
if [ "$ASSIGNMENT1_ID" != "null" ] && [ -n "$ASSIGNMENT1_ID" ]; then
  make_request PATCH "/assignments/${ASSIGNMENT1_ID}/status" \
    '{"status":"COMPLETED"}' \
    "Completing assignment"
else
  echo -e "${RED}❌ Assignment ID is null or empty, skipping test${NC}"
  echo ""
fi

# Test 11: Assign new load to same driver (Should Succeed Now)
echo -e "${YELLOW}📝 Test 11: Assign New Load to Same Driver (Should Succeed)${NC}"
make_request POST "/assignments" \
  "{\"driverId\":\"${DRIVER1_ID}\",\"loadId\":\"${LOAD2_ID}\"}" \
  "Assigning new load to driver"

# Summary
echo -e "${GREEN}🎉 ============================================${NC}"
echo -e "${GREEN}🎉  All Tests Completed!${NC}"
echo -e "${GREEN}🎉 ============================================${NC}"
echo ""
echo "✅ Tested:"
echo "   • Authentication (JWT)"
echo "   • User creation"
echo "   • Driver creation"
echo "   • Load creation"
echo "   • Cache behavior (hit/miss)"
echo "   • Assignment creation"
echo "   • One-active-load-per-driver rule"
echo "   • Assignment completion"
echo ""
echo "📊 Check worker logs for Pub/Sub events:"
echo "   docker compose logs truck-worker"
echo ""
echo "📊 Check MongoDB for audit events:"
echo "   docker exec -it truck-mongodb mongosh"
echo "   use truck-audit"
echo "   db.audit_events.find().pretty()"
echo ""
