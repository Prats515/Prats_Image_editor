#!/bin/bash

# Vercel Environment Variables Setup Script
# This script adds all required environment variables to your Vercel project
# Usage: bash vercel-env-setup.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Prats Image Editor - Vercel Environment Setup${NC}\n"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI not installed${NC}"
    echo "Install with: npm install -g vercel"
    exit 1
fi

# Read from .env.local
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local not found${NC}"
    exit 1
fi

# Source environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo -e "${YELLOW}Adding environment variables to Vercel...${NC}\n"

# Add each variable
vercel env add GROQ_API_KEY "$GROQ_API_KEY" production
vercel env add COMETAPI_KEY "$COMETAPI_KEY" production
vercel env add R2_ACCOUNT_ID "$R2_ACCOUNT_ID" production
vercel env add R2_ACCESS_KEY_ID "$R2_ACCESS_KEY_ID" production
vercel env add R2_SECRET_ACCESS_KEY "$R2_SECRET_ACCESS_KEY" production
vercel env add R2_BUCKET_NAME "$R2_BUCKET_NAME" production

echo -e "\n${GREEN}Environment variables added!${NC}"
echo -e "${YELLOW}Redeploying...${NC}\n"

# Redeploy
vercel deploy --prod

echo -e "\n${GREEN}Done! Deployment complete.${NC}"
