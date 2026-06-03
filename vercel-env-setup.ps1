# Vercel Environment Variables Setup - PowerShell Version
# This script adds all required environment variables to your Vercel project
# Usage: .\vercel-env-setup.ps1

Write-Host "Prats Image Editor - Vercel Environment Setup" -ForegroundColor Yellow
Write-Host ""

# Check if Vercel CLI is installed
try {
    vercel --version | Out-Null
} catch {
    Write-Host "Error: Vercel CLI not installed" -ForegroundColor Red
    Write-Host "Install with: npm install -g vercel"
    exit 1
}

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "Error: .env.local not found" -ForegroundColor Red
    exit 1
}

# Read environment variables from .env.local
$envVars = @{}
Get-Content ".env.local" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($key -and -not $key.StartsWith("#")) {
            $envVars[$key] = $value
        }
    }
}

Write-Host "Adding environment variables to Vercel..." -ForegroundColor Yellow
Write-Host ""

# Add each variable to production environment
$variables = @(
    "GROQ_API_KEY",
    "COMETAPI_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME"
)

foreach ($var in $variables) {
    if ($envVars.ContainsKey($var)) {
        Write-Host "Adding $var..." -ForegroundColor Green
        # Use echo to pipe the value to vercel env add
        $value = $envVars[$var]
        & echo $value | vercel env add $var production
    } else {
        Write-Host "Warning: $var not found in .env.local" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Environment variables added!" -ForegroundColor Green
Write-Host "Redeploying to Vercel..." -ForegroundColor Yellow
Write-Host ""

# Redeploy to production
vercel deploy --prod

Write-Host ""
Write-Host "Done! Deployment complete." -ForegroundColor Green
