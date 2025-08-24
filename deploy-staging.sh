#!/bin/bash

# CATE Verifiable Credentials - Staging Deployment Script
# This script deploys the complete system to staging environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if required environment variables are set
check_env_vars() {
    log_info "Checking environment variables..."
    
    required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "RPC_URL"
        "PRIVATE_KEY"
        "KYC_WEBHOOK_SECRET"
        "ENCRYPTION_KEY"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log_success "All required environment variables are set"
}

# Deploy blockchain contract
deploy_blockchain() {
    log_info "Deploying blockchain contract to staging network..."
    
    cd blockchain
    
    # Check if Hardhat is installed
    if ! command -v npx &> /dev/null; then
        log_error "npx is not installed"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing blockchain dependencies..."
        npm install
    fi
    
    # Compile contracts
    log_info "Compiling smart contracts..."
    npm run compile
    
    # Run tests
    log_info "Running blockchain tests..."
    npm test
    
    # Deploy to Mumbai testnet
    log_info "Deploying to Mumbai testnet..."
    npm run deploy:mumbai
    
    # Extract contract address
    if [ -f "abi/VerifiableCredentials.json" ]; then
        CONTRACT_ADDRESS=$(node -e "console.log(require('./abi/VerifiableCredentials.json').address)")
        log_success "Contract deployed at: $CONTRACT_ADDRESS"
        
        # Export for use in backend
        export VC_CONTRACT_ADDRESS="$CONTRACT_ADDRESS"
    else
        log_error "Contract deployment failed - ABI file not found"
        exit 1
    fi
    
    cd ..
}

# Setup database
setup_database() {
    log_info "Setting up staging database..."
    
    # Extract database name from DATABASE_URL
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    # Create database if it doesn't exist
    log_info "Creating database: $DB_NAME"
    createdb "$DB_NAME" 2>/dev/null || log_warning "Database $DB_NAME already exists"
    
    # Run migrations
    log_info "Running database migrations..."
    psql "$DATABASE_URL" -f migrations/001_create_vc_tables.sql
    
    # Verify tables
    log_info "Verifying database tables..."
    TABLES=$(psql "$DATABASE_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" | tr -d ' ')
    
    expected_tables=("app_user" "kyc_session" "credential")
    for table in "${expected_tables[@]}"; do
        if echo "$TABLES" | grep -q "$table"; then
            log_success "Table $table exists"
        else
            log_error "Table $table not found"
            exit 1
        fi
    done
}

# Install backend dependencies
install_dependencies() {
    log_info "Installing backend dependencies..."
    
    # Install production dependencies
    npm ci --production
    
    # Install additional staging dependencies
    npm install --save-dev pm2
    
    log_success "Dependencies installed"
}

# Create staging environment file
create_env_file() {
    log_info "Creating staging environment file..."
    
    cat > .env.staging << EOF
# Staging Environment Configuration
NODE_ENV=staging
PORT=4000

# Domain
API_DOMAIN=api-staging.cate.app
CORS_ORIGIN=https://staging.cate.app

# Blockchain Configuration
RPC_URL=$RPC_URL
PRIVATE_KEY=$PRIVATE_KEY
VC_CONTRACT_ADDRESS=$VC_CONTRACT_ADDRESS

# Database
DATABASE_URL=$DATABASE_URL

# Security
ENCRYPTION_KEY=$ENCRYPTION_KEY
KYC_WEBHOOK_SECRET=$KYC_WEBHOOK_SECRET

# KYC Provider
KYC_PROVIDER=mock

# Logging & Monitoring
LOG_LEVEL=info
REQUEST_ID_HEADER=X-Request-Id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# JWT Configuration
JWT_SECRET=staging_jwt_secret_key_$(openssl rand -hex 16)
JWT_EXPIRES_IN=7d

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
EOF
    
    log_success "Staging environment file created"
}

# Setup PM2
setup_pm2() {
    log_info "Setting up PM2 process manager..."
    
    # Create logs directory
    mkdir -p logs
    
    # Create PM2 ecosystem file if it doesn't exist
    if [ ! -f "ecosystem.config.js" ]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cate-vc-staging',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 4000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
        log_success "PM2 ecosystem file created"
    fi
    
    # Stop existing processes
    pm2 stop cate-vc-staging 2>/dev/null || true
    pm2 delete cate-vc-staging 2>/dev/null || true
    
    # Start with staging environment
    pm2 start ecosystem.config.js --env staging
    
    log_success "PM2 process started"
}

# Health check
health_check() {
    log_info "Running health check..."
    
    # Wait for application to start
    sleep 10
    
    # Check if process is running
    if pm2 list | grep -q "cate-vc-staging.*online"; then
        log_success "PM2 process is running"
    else
        log_error "PM2 process is not running"
        pm2 logs cate-vc-staging --lines 20
        exit 1
    fi
    
    # Test health endpoint
    if command -v curl &> /dev/null; then
        log_info "Testing health endpoint..."
        if curl -f http://localhost:4000/health > /dev/null 2>&1; then
            log_success "Health endpoint is responding"
        else
            log_error "Health endpoint is not responding"
            exit 1
        fi
    else
        log_warning "curl not available - skipping health endpoint test"
    fi
}

# Main deployment function
main() {
    log_info "🚀 Starting CATE VC Staging Deployment..."
    
    # Check environment variables
    check_env_vars
    
    # Deploy blockchain contract
    deploy_blockchain
    
    # Setup database
    setup_database
    
    # Install dependencies
    install_dependencies
    
    # Create environment file
    create_env_file
    
    # Setup PM2
    setup_pm2
    
    # Health check
    health_check
    
    log_success "🎉 Staging deployment completed successfully!"
    
    # Display next steps
    echo ""
    log_info "Next steps:"
    echo "1. Configure Nginx reverse proxy"
    echo "2. Set up SSL certificate with Let's Encrypt"
    echo "3. Run end-to-end tests: ./test-staging.sh"
    echo "4. Configure monitoring and alerting"
    echo ""
    log_info "Application is running on: http://localhost:4000"
    log_info "Health check: http://localhost:4000/health"
    log_info "PM2 status: pm2 status"
    log_info "PM2 logs: pm2 logs cate-vc-staging"
}

# Run main function
main "$@"
