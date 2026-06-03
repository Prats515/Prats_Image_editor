# Railway Deployment Setup Script for Prats Image Editor

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Railway Deployment Setup" -ForegroundColor Cyan
Write-Host "Prats Image Editor v2" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if .env.local exists
Write-Host "[1/5] Checking .env.local file..." -ForegroundColor Yellow

if (-not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local not found!" -ForegroundColor Red
    exit 1
}

Write-Host "OK - .env.local found" -ForegroundColor Green
Write-Host ""

# Step 2: Check MCP configuration
Write-Host "[2/5] Checking MCP configuration..." -ForegroundColor Yellow

if (Test-Path ".kiro/settings/mcp.json") {
    Write-Host "OK - Railway MCP configured" -ForegroundColor Green
} else {
    Write-Host "NOT FOUND - Railway MCP not configured" -ForegroundColor Red
}

Write-Host ""

# Step 3: Railway token setup instructions
Write-Host "[3/5] Getting Railway API Token" -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to: https://railway.app/account" -ForegroundColor Cyan
Write-Host "Click: Tokens section" -ForegroundColor Cyan
Write-Host "Create: New token" -ForegroundColor Cyan
Write-Host "Copy: Your API token" -ForegroundColor Cyan
Write-Host ""

# Step 4: Environment variable setup
Write-Host "[4/5] Set Environment Variable" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run this command (replace YOUR-TOKEN-HERE):" -ForegroundColor Cyan
Write-Host "[System.Environment]::SetEnvironmentVariable('RAILWAY_API_TOKEN', 'YOUR-TOKEN-HERE', 'User')" -ForegroundColor Green
Write-Host ""

# Step 5: Deployment options
Write-Host "[5/5] Deploy to Railway" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option A: Via Web Dashboard (Easy)" -ForegroundColor Cyan
Write-Host "1. Go to https://railway.app" -ForegroundColor Cyan
Write-Host "2. Sign in with GitHub" -ForegroundColor Cyan
Write-Host "3. New Project -> Deploy from GitHub" -ForegroundColor Cyan
Write-Host "4. Select Prats_Image_editor" -ForegroundColor Cyan
Write-Host "5. Add environment variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option B: Via Railway CLI" -ForegroundColor Cyan
Write-Host "1. npm install -g @railway/cli" -ForegroundColor Cyan
Write-Host "2. railway login" -ForegroundColor Cyan
Write-Host "3. railway init" -ForegroundColor Cyan
Write-Host "4. Set variables then railway up" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Get API token from Railway" -ForegroundColor White
Write-Host "2. Set environment variable" -ForegroundColor White
Write-Host "3. Deploy to Railway" -ForegroundColor White
Write-Host "4. Test the application" -ForegroundColor White
Write-Host ""
