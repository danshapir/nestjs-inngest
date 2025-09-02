#!/bin/bash

# Test script for all Inngest functions after context fix
# Usage: ./test_all_functions.sh [server_url]
# Default server: http://localhost:3001

SERVER_URL="${1:-http://localhost:3001}"
echo "🧪 Testing all Inngest functions on $SERVER_URL"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run test and check result
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local data="$3"
    local method="${4:-POST}"
    
    echo -e "\n${BLUE}🔧 Testing: $test_name${NC}"
    echo "Endpoint: $method $endpoint"
    echo "Data: $data"
    echo "----------------------------------------"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -X GET "$SERVER_URL$endpoint" | jq '.' 2>/dev/null)
    else
        response=$(curl -s -X POST "$SERVER_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" | jq '.' 2>/dev/null)
    fi
    
    if [ $? -eq 0 ] && echo "$response" | jq -e '.success == true' >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Response: $response"
    fi
    
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    sleep 1
}

echo -e "\n${YELLOW}📋 1. HEALTH CHECK${NC}"
run_test "Health Check" "/api/test/health" "" "GET"

echo -e "\n${YELLOW}🧬 2. MIDDLEWARE TESTS${NC}"
run_test "Middleware Function (logging + validation)" \
    "/api/test/middleware" \
    '{"testId": "bash-validation-test", "message": "Testing middleware from bash script", "userId": "test-user-bash"}'

run_test "Generic Middleware (auth + metrics)" \
    "/api/test/generic-middleware" \
    '{"testId": "bash-auth-metrics", "message": "Testing auth+metrics from bash", "userId": "authenticated-user-bash"}'

echo -e "\n${YELLOW}📧 3. EMAIL & NOTIFICATION TESTS${NC}"
run_test "Email Notification" \
    "/api/test/email-notification" \
    '{"email": "bashtest@example.com", "subject": "Bash Test Email", "message": "This email was sent via bash test script"}'

run_test "Single Email Test" \
    "/api/test/email" \
    '{"to": "single@example.com", "template": "generic", "priority": "normal", "data": {"source": "bash-script"}}'

run_test "Batch Notifications" \
    "/api/test/batch-notifications" \
    '{"count": 3, "priority": "high"}'

echo -e "\n${YELLOW}👤 4. USER WORKFLOW TESTS${NC}"
run_test "User Onboarding Workflow" \
    "/api/test/user-onboarding" \
    '{"userId": "bash-user-123", "email": "bashuser@example.com", "name": "Bash Test User"}'

echo -e "\n${YELLOW}🔧 5. BASIC FUNCTION TESTS${NC}"
run_test "Simple Function" \
    "/api/test/simple" \
    '{"message": "Simple test from bash script"}'

run_test "Workflow Function" \
    "/api/test/workflow" \
    '{"steps": ["bash-step1", "bash-step2", "bash-step3"], "metadata": {"source": "bash-test", "comprehensive": true}}'

run_test "Connectivity Test" \
    "/api/test/connectivity" \
    '{"message": "Testing connectivity from bash script"}'

run_test "Error Test" \
    "/api/test/error" \
    '{"shouldFail": false, "errorType": "validation", "message": "Controlled error test from bash"}'

echo -e "\n${YELLOW}📊 6. STATISTICS & MONITORING${NC}"
run_test "Email Statistics" "/api/test/email-stats" "" "GET"

echo -e "\n${GREEN}🎉 Testing Complete!${NC}"
echo "=================================================="
echo -e "${BLUE}💡 Notes:${NC}"
echo "• All middleware functions should show their properties in handler logs"
echo "• Email functions should increment the email stats counter"
echo "• Workflow functions should execute multiple steps"
echo "• Check your server logs to see detailed execution traces"
echo ""
echo -e "${YELLOW}🔍 To monitor real-time logs while testing:${NC}"
echo "  npm run start:e2e"
echo ""
echo -e "${YELLOW}📈 To see more detailed email stats:${NC}"
echo "  curl -X GET $SERVER_URL/api/test/email-stats | jq"