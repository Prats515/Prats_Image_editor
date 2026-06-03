@echo off
REM Vercel Deployment Script for Windows

echo.
echo ========================================
echo Prats Image Editor - Vercel Deployment
echo ========================================
echo.

REM Check if vercel is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Vercel CLI not installed
    echo Install with: npm install -g vercel
    pause
    exit /b 1
)

REM Check if .env.local exists
if not exist .env.local (
    echo ERROR: .env.local not found
    pause
    exit /b 1
)

echo Adding environment variables to Vercel...
echo.

REM Add environment variables
REM Note: These will be added to production environment
REM You may need to verify/approve in Vercel dashboard

echo Running: vercel env add GROQ_API_KEY production
vercel env add GROQ_API_KEY production

echo Running: vercel env add COMETAPI_KEY production
vercel env add COMETAPI_KEY production

echo Running: vercel env add R2_ACCOUNT_ID production  
vercel env add R2_ACCOUNT_ID production

echo Running: vercel env add R2_ACCESS_KEY_ID production
vercel env add R2_ACCESS_KEY_ID production

echo Running: vercel env add R2_SECRET_ACCESS_KEY production
vercel env add R2_SECRET_ACCESS_KEY production

echo Running: vercel env add R2_BUCKET_NAME production
vercel env add R2_BUCKET_NAME production

echo.
echo Environment variables added!
echo.
echo Deploying to production...
echo.

vercel deploy --prod

echo.
echo Done!
echo.
pause
