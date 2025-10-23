@echo off
REM V0 Clone - Cloudflare Deployment Script (Windows)
REM This script automates the deployment of your V0 Clone app to Cloudflare

echo.
echo ========================================
echo V0 Clone - Cloudflare Deployment
echo ========================================
echo.

REM Check if wrangler is installed
where wrangler >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Wrangler CLI is not installed
    echo.
    echo Install it with:
    echo   npm install -g wrangler
    echo.
    exit /b 1
)

REM Check if logged in
wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Not logged in to Cloudflare
    echo Running: wrangler login
    wrangler login
)

echo [OK] Wrangler CLI found and authenticated
echo.

echo ================================================
echo Setting up secrets...
echo ================================================
echo.

echo Enter your DEEPSEEK_API_KEY (sk-...):
set /p DEEPSEEK_KEY=
if not "%DEEPSEEK_KEY%"=="" (
    echo %DEEPSEEK_KEY% | wrangler secret put DEEPSEEK_API_KEY
    echo [OK] DEEPSEEK_API_KEY set
)

echo.
echo Enter DEEPSEEK_BASE_URL (https://api.deepseek.com):
set /p DEEPSEEK_URL=
if not "%DEEPSEEK_URL%"=="" (
    echo %DEEPSEEK_URL% | wrangler secret put DEEPSEEK_BASE_URL
    echo [OK] DEEPSEEK_BASE_URL set
)

echo.
echo Enter DEEPSEEK_MODEL (deepseek-chat):
set /p DEEPSEEK_MODEL_VAR=
if not "%DEEPSEEK_MODEL_VAR%"=="" (
    echo %DEEPSEEK_MODEL_VAR% | wrangler secret put DEEPSEEK_MODEL
    echo [OK] DEEPSEEK_MODEL set
)

echo.
echo ================================================
echo Installing dependencies...
echo ================================================
call npm install
cd backend
call npm install
cd ..\frontend
call npm install
cd ..

echo.
echo ================================================
echo Building backend...
echo ================================================
cd backend
call npm run build

if not exist "dist\index.js" (
    echo [ERROR] Build failed: dist\index.js not found
    exit /b 1
)

echo [OK] Backend built successfully
cd ..

echo.
echo ================================================
echo Deploying backend to Cloudflare Workers...
echo ================================================
call wrangler deploy

echo.
echo [OK] Backend deployed!
echo.
echo Please check your Cloudflare dashboard for the Worker URL
echo Then update frontend/.env.local with:
echo NEXT_PUBLIC_BACKEND_URL=https://your-worker-url.workers.dev
echo.

pause

echo.
echo ================================================
echo Building frontend...
echo ================================================
cd frontend
call npm run build
echo [OK] Frontend built successfully

echo.
echo ================================================
echo Deploying frontend to Cloudflare Pages...
echo ================================================
call wrangler pages deploy out --project-name=v0-clone-frontend

cd ..

echo.
echo ================================================
echo [SUCCESS] Deployment Complete!
echo ================================================
echo.
echo Your app is now live!
echo   Frontend: https://v0-clone-frontend.pages.dev
echo   Backend:  Check Cloudflare dashboard
echo.
echo View your deployment:
echo   Dashboard: https://dash.cloudflare.com
echo.
echo View logs:
echo   wrangler tail
echo.
echo Happy coding!
echo.

pause
