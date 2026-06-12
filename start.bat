@echo off
echo Starting FBR Tax Compliance Graph AI...
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8000
start "Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting React Frontend on http://localhost:5173
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers started!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
