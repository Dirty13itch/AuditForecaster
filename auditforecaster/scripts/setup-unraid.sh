#!/bin/bash
# =============================================================================
# AuditForecaster Unraid Setup Script
# =============================================================================
# This script sets up AuditForecaster on an Unraid server
# Run as: bash setup-unraid.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=============================================="
echo "  AuditForecaster Setup for Unraid"
echo "=============================================="
echo -e "${NC}"

# Configuration
DATA_PATH="${DATA_PATH:-/mnt/user/appdata}"
APP_DIR="$DATA_PATH/auditforecaster"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: Not running as root. Some operations may fail.${NC}"
fi

# Create directory structure
echo -e "${BLUE}Creating directory structure...${NC}"
mkdir -p "$APP_DIR/postgres"
mkdir -p "$APP_DIR/redis"
mkdir -p "$APP_DIR/uploads/photos"
mkdir -p "$APP_DIR/backups"
mkdir -p "$APP_DIR/nginx/data"
mkdir -p "$APP_DIR/nginx/letsencrypt"
mkdir -p "$APP_DIR/uptime-kuma"

# Set permissions
echo -e "${BLUE}Setting permissions...${NC}"
chmod -R 755 "$APP_DIR"
chown -R nobody:users "$APP_DIR" 2>/dev/null || true

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"

    if [ -f ".env.example" ]; then
        cp .env.example .env

        # Generate secrets
        echo -e "${BLUE}Generating secure secrets...${NC}"

        # Generate POSTGRES_PASSWORD
        POSTGRES_PWD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PWD/" .env

        # Generate NEXTAUTH_SECRET
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" .env

        # Generate webhook secrets
        SUPPLYPRO_SECRET=$(openssl rand -hex 32)
        sed -i "s/SUPPLYPRO_WEBHOOK_SECRET=.*/SUPPLYPRO_WEBHOOK_SECRET=$SUPPLYPRO_SECRET/" .env

        GCAL_TOKEN=$(openssl rand -hex 32)
        sed -i "s/GOOGLE_CALENDAR_WEBHOOK_TOKEN=.*/GOOGLE_CALENDAR_WEBHOOK_TOKEN=$GCAL_TOKEN/" .env

        echo -e "${GREEN}Secrets generated!${NC}"
        echo -e "${YELLOW}IMPORTANT: Edit .env to set:${NC}"
        echo "  - NEXTAUTH_URL (your domain)"
        echo "  - RESEND_API_KEY (for emails)"
        echo "  - GOOGLE_CLIENT_ID/SECRET (for calendar)"
        echo ""
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Pull images
echo -e "${BLUE}Pulling Docker images (this may take a while)...${NC}"
docker compose -f docker-compose.prod.yml pull

# Start the stack
echo -e "${BLUE}Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 10

# Check service status
echo ""
echo -e "${BLUE}Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps

# Get IP address
IP_ADDR=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}=============================================="
echo "  Setup Complete!"
echo "==============================================${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  App:              http://$IP_ADDR:3000"
echo "  Nginx Admin:      http://$IP_ADDR:81"
echo "  Uptime Kuma:      http://$IP_ADDR:3001"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Edit .env file with your actual values"
echo "  2. Set up Nginx Proxy Manager for SSL:"
echo "     - Go to http://$IP_ADDR:81"
echo "     - Login: admin@example.com / changeme"
echo "     - Add proxy host for your domain -> http://app:3000"
echo "     - Enable SSL with Let's Encrypt"
echo "  3. Set up Uptime Kuma monitoring:"
echo "     - Go to http://$IP_ADDR:3001"
echo "     - Add monitor for http://app:3000/api/health"
echo "  4. Create admin user in the app"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:        docker compose -f docker-compose.prod.yml logs -f"
echo "  Stop all:         docker compose -f docker-compose.prod.yml down"
echo "  Restart app:      docker compose -f docker-compose.prod.yml restart app"
echo "  View backups:     ls -la $APP_DIR/backups"
echo ""
