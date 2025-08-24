#!/bin/bash

# CATE Verifiable Credentials - Staging Test Script
# This script tests the complete end-to-end functionality in staging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_URL="${STAGING_URL:-http://localhost:4000}"
KYC_WEBHOOK_SECRET="${KYC_WEBHOOK_SECRET:-staging_webhook_secret_for_hmac_verification}"

# Test data
TEST_EMAIL="test+kyc@cate.app"
TEST_ETH_ADDRESS="0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"

# Variables to store test results
USER_ID=""
SESSION_ID=""
PROVIDER_SESSION_ID=""
ONCHAIN_ID=""
TX_HASH=""

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Helper function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Helper function to make HTTP requests
make_request() {
    local method="$1"
    local url="$2"
    local headers="$3"
    local data="$4"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "$headers" \
            --data "$data"
    else
        curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "$headers"
    fi
}

# Test 1: Health Check
test_health_check() {
    log_info "1️⃣ Testing Health Check..."
    
    local response
    response=$(make_request "GET" "$STAGING_URL/health")
    
    if echo "$response" | jq -e '.status' > /dev/null 2>&1; then
        local status=$(echo "$response" | jq -r '.status')
        if [ "$status" = "ok" ]; then
            log_success "Health check passed"
            echo "$response" | jq '.'
            return 0
        else
            log_error "Health check failed - status: $status"
            return 1
        fi
    else
        log_error "Health check failed - invalid response"
        echo "Response: $response"
        return 1
    fi
}

# Test 2: Create Test User
test_create_user() {
    log_info "2️⃣ Creating Test User..."
    
    local user_data="{\"email\":\"$TEST_EMAIL\",\"eth_address\":\"$TEST_ETH_ADDRESS\"}"
    local response
    response=$(make_request "POST" "$STAGING_URL/api/debug/create-user" "" "$user_data")
    
    if echo "$response" | jq -e '.user.id' > /dev/null 2>&1; then
        USER_ID=$(echo "$response" | jq -r '.user.id')
        log_success "User created successfully: $USER_ID"
        return 0
    else
        log_error "Failed to create user"
        echo "Response: $response"
        return 1
    fi
}

# Test 3: Start KYC Session
test_kyc_start() {
    log_info "3️⃣ Starting KYC Session..."
    
    local kyc_data="{\"userId\":\"$USER_ID\"}"
    local response
    response=$(make_request "POST" "$STAGING_URL/api/kyc/start" "" "$kyc_data")
    
    if echo "$response" | jq -e '.session.id' > /dev/null 2>&1; then
        SESSION_ID=$(echo "$response" | jq -r '.session.id')
        PROVIDER_SESSION_ID=$(echo "$response" | jq -r '.session.provider_session_id')
        local status=$(echo "$response" | jq -r '.session.status')
        
        if [ "$status" = "pending" ]; then
            log_success "KYC session started successfully"
            log_info "Session ID: $SESSION_ID"
            log_info "Provider Session ID: $PROVIDER_SESSION_ID"
            log_info "Status: $status"
            return 0
        else
            log_error "KYC session status is not pending: $status"
            return 1
        fi
    else
        log_error "Failed to start KYC session"
        echo "Response: $response"
        return 1
    fi
}

# Test 4: Simulate KYC Webhook (Approved)
test_kyc_webhook() {
    log_info "4️⃣ Simulating KYC Webhook (Approved)..."
    
    local webhook_data="{\"provider_session_id\":\"$PROVIDER_SESSION_ID\",\"status\":\"approved\",\"result\":{\"score\":0.99,\"kycLevel\":\"basic\",\"documentVerified\":true,\"selfieMatch\":true}}"
    
    # Generate HMAC signature
    local signature
    signature="sha256=$(echo -n "$webhook_data" | openssl dgst -sha256 -hmac "$KYC_WEBHOOK_SECRET" | sed 's/^.* //')"
    
    local response
    response=$(make_request "POST" "$STAGING_URL/api/kyc/webhook" "X-KYC-Signature: $signature" "$webhook_data")
    
    if echo "$response" | jq -e '.ok' > /dev/null 2>&1; then
        local ok=$(echo "$response" | jq -r '.ok')
        if [ "$ok" = "true" ]; then
            log_success "KYC webhook processed successfully"
            
            # Extract VC information if available
            if echo "$response" | jq -e '.vc.onchain_id' > /dev/null 2>&1; then
                ONCHAIN_ID=$(echo "$response" | jq -r '.vc.onchain_id')
                TX_HASH=$(echo "$response" | jq -r '.txHash')
                log_info "VC issued: $ONCHAIN_ID"
                log_info "Transaction: $TX_HASH"
            fi
            return 0
        else
            log_error "KYC webhook failed - ok: $ok"
            return 1
        fi
    else
        log_error "Failed to process KYC webhook"
        echo "Response: $response"
        return 1
    fi
}

# Test 5: Verify Credential
test_verify_credential() {
    log_info "5️⃣ Verifying Credential..."
    
    if [ -z "$ONCHAIN_ID" ]; then
        log_warning "No onchain ID available - skipping credential verification"
        return 0
    fi
    
    local response
    response=$(make_request "GET" "$STAGING_URL/api/vc/$ONCHAIN_ID")
    
    if echo "$response" | jq -e '.onchain.issuer' > /dev/null 2>&1; then
        local revoked=$(echo "$response" | jq -r '.onchain.revoked')
        local status=$(echo "$response" | jq -r '.offchain.status')
        
        if [ "$revoked" = "false" ] && [ "$status" = "active" ]; then
            log_success "Credential verified successfully"
            log_info "On-chain revoked: $revoked"
            log_info "Off-chain status: $status"
            return 0
        else
            log_error "Credential verification failed - revoked: $revoked, status: $status"
            return 1
        fi
    else
        log_error "Failed to verify credential"
        echo "Response: $response"
        return 1
    fi
}

# Test 6: Test Idempotency (Duplicate Webhook)
test_idempotency() {
    log_info "6️⃣ Testing Idempotency (Duplicate Webhook)..."
    
    local webhook_data="{\"provider_session_id\":\"$PROVIDER_SESSION_ID\",\"status\":\"approved\",\"result\":{\"score\":0.99,\"kycLevel\":\"basic\",\"documentVerified\":true,\"selfieMatch\":true}}"
    
    # Generate HMAC signature
    local signature
    signature="sha256=$(echo -n "$webhook_data" | openssl dgst -sha256 -hmac "$KYC_WEBHOOK_SECRET" | sed 's/^.* //')"
    
    local response
    response=$(make_request "POST" "$STAGING_URL/api/kyc/webhook" "X-KYC-Signature: $signature" "$webhook_data")
    
    if echo "$response" | jq -e '.ok' > /dev/null 2>&1; then
        local ok=$(echo "$response" | jq -r '.ok')
        if [ "$ok" = "true" ]; then
            # Check if a new VC was issued
            if echo "$response" | jq -e '.vc.onchain_id' > /dev/null 2>&1; then
                local new_onchain_id=$(echo "$response" | jq -r '.vc.onchain_id')
                if [ "$new_onchain_id" != "$ONCHAIN_ID" ]; then
                    log_error "Idempotency failed - new VC issued: $new_onchain_id"
                    return 1
                else
                    log_success "Idempotency working - same VC returned"
                    return 0
                fi
            else
                log_success "Idempotency working - no duplicate VC issued"
                return 0
            fi
        else
            log_error "Duplicate webhook failed - ok: $ok"
            return 1
        fi
    else
        log_error "Failed to process duplicate webhook"
        echo "Response: $response"
        return 1
    fi
}

# Test 7: Test KYC Session Status
test_kyc_session_status() {
    log_info "7️⃣ Testing KYC Session Status..."
    
    local response
    response=$(make_request "GET" "$STAGING_URL/api/kyc/session/$SESSION_ID")
    
    if echo "$response" | jq -e '.status' > /dev/null 2>&1; then
        local status=$(echo "$response" | jq -r '.status')
        if [ "$status" = "approved" ]; then
            log_success "KYC session status is correct: $status"
            return 0
        else
            log_error "KYC session status is incorrect: $status (expected: approved)"
            return 1
        fi
    else
        log_error "Failed to get KYC session status"
        echo "Response: $response"
        return 1
    fi
}

# Test 8: Performance Tests
test_performance() {
    log_info "8️⃣ Running Performance Tests..."
    
    # Test KYC webhook latency
    local start_time=$(date +%s%N)
    local webhook_data="{\"provider_session_id\":\"test_perf_$(date +%s)\",\"status\":\"approved\",\"result\":{\"score\":0.99}}"
    local signature="sha256=$(echo -n "$webhook_data" | openssl dgst -sha256 -hmac "$KYC_WEBHOOK_SECRET" | sed 's/^.* //')"
    
    make_request "POST" "$STAGING_URL/api/kyc/webhook" "X-KYC-Signature: $signature" "$webhook_data" > /dev/null
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    if [ $duration -lt 1000 ]; then
        log_success "KYC webhook performance: ${duration}ms (target: <1000ms)"
    else
        log_warning "KYC webhook performance: ${duration}ms (target: <1000ms)"
    fi
    
    # Test health endpoint latency
    start_time=$(date +%s%N)
    make_request "GET" "$STAGING_URL/health" > /dev/null
    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 ))
    
    if [ $duration -lt 500 ]; then
        log_success "Health endpoint performance: ${duration}ms (target: <500ms)"
    else
        log_warning "Health endpoint performance: ${duration}ms (target: <500ms)"
    fi
}

# Main test function
main() {
    log_info "🧪 Starting CATE VC Staging Tests..."
    log_info "Staging URL: $STAGING_URL"
    
    # Check dependencies
    if ! command_exists curl; then
        log_error "curl is not installed"
        exit 1
    fi
    
    if ! command_exists jq; then
        log_error "jq is not installed"
        exit 1
    fi
    
    if ! command_exists openssl; then
        log_error "openssl is not installed"
        exit 1
    fi
    
    # Run tests
    local tests_passed=0
    local tests_failed=0
    
    # Test 1: Health Check
    if test_health_check; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    # Test 2: Create User
    if test_create_user; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    # Test 3: Start KYC
    if test_kyc_start; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    # Test 4: KYC Webhook
    if test_kyc_webhook; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    # Test 5: Verify Credential
    if test_verify_credential; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    # Test 6: Idempotency
    if test_idempotency; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    # Test 7: KYC Session Status
    if test_kyc_session_status; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    # Test 8: Performance
    test_performance
    ((tests_passed++))
    
    # Summary
    echo ""
    log_info "📊 Test Results Summary:"
    echo "========================"
    echo "Tests Passed: $tests_passed"
    echo "Tests Failed: $tests_failed"
    echo "Total Tests: $((tests_passed + tests_failed))"
    
    if [ $tests_failed -eq 0 ]; then
        log_success "🎉 All tests passed! Staging environment is working correctly."
        echo ""
        log_info "Test Data:"
        echo "User ID: $USER_ID"
        echo "Session ID: $SESSION_ID"
        echo "Provider Session ID: $PROVIDER_SESSION_ID"
        if [ -n "$ONCHAIN_ID" ]; then
            echo "Onchain ID: $ONCHAIN_ID"
            echo "Transaction Hash: $TX_HASH"
        fi
        exit 0
    else
        log_error "⚠️  Some tests failed. Please check the errors above."
        exit 1
    fi
}

# Run main function
main "$@"
