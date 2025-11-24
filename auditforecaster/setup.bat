@echo off
echo Setting up Ulrich Energy Auditing Platform...
echo.

echo Step 1: Applying database schema changes...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ERROR: Database push failed
    pause
    exit /b 1
)

echo.
echo Step 2: Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Prisma generate failed
    pause
    exit /b 1
)

echo.
echo Step 3: Starting development server...
echo Server will start at http://localhost:3000
call npm run dev

pause
